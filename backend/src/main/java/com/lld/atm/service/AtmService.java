package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.dispenser.DispenseMode;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import com.lld.atm.repository.BankingRepository;
import com.lld.atm.state.SessionState;
import com.lld.atm.state.SessionStates;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade over one physical ATM terminal: session state machine, PIN authentication, withdrawal,
 * deposit, and an isolated {@code /sim/*} sandbox on a second {@link BankingRepository}/
 * {@link CashDispenser} pair (matching {@code AirlineService}/{@code TrafficSignalService}'s
 * isolated-sandbox shape) so a demo run can never touch a real seeded account.
 *
 * <p><b>Two independent locking disciplines, deliberately not merged:</b>
 * <ul>
 *   <li>{@link #sessionLock} guards the single-terminal session fields
 *       ({@code currentState}/{@code activeCard}/{@code activeAccount}) — there is exactly one
 *       card in the slot at a time, so this is a plain mutual-exclusion lock, not a
 *       per-something lock.</li>
 *   <li>{@code Account#getLock()} (per-account) and {@code CashDispenser#getLock()} (per-terminal
 *       cash cassette) guard the actual money movement in {@link #withdraw}. Two withdrawal
 *       requests against the <em>same</em> account race on the account lock; two requests that
 *       both need physical notes race on the dispenser lock. {@link #withdraw} always acquires the
 *       account lock first and the dispenser lock second — a fixed global ordering, so there is no
 *       lock-ordering deadlock even though both locks are held at once.</li>
 * </ul>
 * The session lock is intentionally <em>not</em> held for the duration of a withdrawal's money
 * movement: the state-machine guard only needs to be true at the moment the request is admitted,
 * and holding a single terminal-wide lock across the account/dispenser critical section would
 * serialize withdrawals against unrelated accounts for no correctness reason.
 */
@Service
public class AtmService {

    private final BankingRepository bankingRepository;
    private final CashDispenser cashDispenser;

    private volatile ATMState currentState = ATMState.IDLE;
    private Card activeCard;
    private Account activeAccount;

    private final Map<String, List<Transaction>> accountTransactions = new ConcurrentHashMap<>();
    private final AtomicLong transactionIdGen = new AtomicLong(1001);
    private final ReentrantLock sessionLock = new ReentrantLock(true);

    // Isolated Simulation Engine State
    private final BankingRepository simBankingRepository = new BankingRepository();
    private final CashDispenser simCashDispenser;
    private ATMState simState = ATMState.IDLE;
    private Card simActiveCard;
    private Account simActiveAccount;
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public AtmService(BankingRepository bankingRepository, CashDispenser cashDispenser,
                       com.lld.atm.dispenser.DenominationDispenseStrategyFactory strategyFactory) {
        this.bankingRepository = bankingRepository;
        this.cashDispenser = cashDispenser;
        this.simCashDispenser = new CashDispenser(strategyFactory);
        initSimState();
    }

    public ATMState getCurrentState() {
        return currentState;
    }

    public Account getActiveAccount() {
        return activeAccount;
    }

    public Card getActiveCard() {
        return activeCard;
    }

    public CashDispenser getCashDispenser() {
        return cashDispenser;
    }

    // =========================================================================
    // STATE MACHINE TRANSITIONS & GUARDS
    // =========================================================================

    /**
     * The guarded gateway for the terminal's externally-observable lifecycle transitions
     * (insert card / authenticate / eject). Consults {@link SessionStates#of(ATMState)} for the
     * current phase's legal next phases and throws {@link InvalidSessionStateException} for
     * anything not in that set — see {@code com.lld.atm.state.SessionState}. Always called while
     * already holding {@link #sessionLock} (it is a fair {@code ReentrantLock}, so the re-entrant
     * acquisition here is free) from {@link #insertCard}, {@link #authenticate} and
     * {@link #ejectCard} — the three methods a caller can legally invoke without already being
     * mid-transaction.
     */
    private void transitionTo(ATMState target) {
        sessionLock.lock();
        try {
            SessionState state = SessionStates.of(currentState);
            if (!state.canTransitionTo(target)) {
                throw new InvalidSessionStateException(
                        "Illegal session transition: " + currentState + " -> " + target);
            }
            currentState = target;
        } finally {
            sessionLock.unlock();
        }
    }

    /**
     * Unguarded internal bookkeeping update for the in-flight phases of an already-admitted
     * withdrawal/deposit ({@code TRANSACTION_IN_PROGRESS}/{@code DISPENSING} and settling back to
     * {@code AUTHENTICATED}). Deliberately does not re-run the {@link #transitionTo} table check:
     * by the time {@link #withdraw}/{@link #deposit} reach this point they are holding the
     * account's lock and are committed to completing the operation started under
     * {@link #requireAuthenticatedSessionFor} — re-validating against {@code currentState} here
     * would let a concurrent {@link #ejectCard()} abort an in-flight debit after the money had
     * already moved, with no compensating credit to unwind it.
     */
    private void setState(ATMState target) {
        currentState = target;
    }

    /**
     * Guard for every money-moving/balance-reading operation: the terminal must currently be in an
     * authenticated session, and the account being operated on must be the one that session
     * authenticated into — a caller cannot pass an arbitrary {@code accountNumber} to withdraw
     * from an account nobody entered a PIN for.
     */
    private void requireAuthenticatedSessionFor(String accountNumber) {
        ATMState state = currentState;
        if (state != ATMState.AUTHENTICATED && state != ATMState.TRANSACTION_IN_PROGRESS) {
            throw new InvalidSessionStateException(
                    "This operation requires an authenticated session. Current state: " + state);
        }
        if (activeAccount == null || !activeAccount.getAccountNumber().equals(accountNumber)) {
            throw new InvalidSessionStateException(
                    "Account " + accountNumber + " is not the account authenticated in this session.");
        }
    }

    public Map<String, Object> insertCard(String cardNumber) {
        sessionLock.lock();
        try {
            if (currentState != ATMState.IDLE && currentState != ATMState.SESSION_ENDED) {
                throw new InvalidSessionStateException("Cannot insert card! Session is currently in state: " + currentState);
            }

            Card card = bankingRepository.getCard(cardNumber);
            if (card.isBlocked()) {
                transitionTo(ATMState.CARD_BLOCKED);
                throw new CardBlockedException("Card " + cardNumber + " is BLOCKED due to 3 failed PIN attempts!");
            }

            activeCard = card;
            activeAccount = bankingRepository.getAccount(card.getAccountNumber());
            transitionTo(ATMState.CARD_INSERTED);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("state", currentState);
            res.put("cardNumber", card.getCardNumber());
            res.put("accountNumber", activeAccount.getAccountNumber());
            res.put("holderName", activeAccount.getHolderName());
            return res;
        } finally {
            sessionLock.unlock();
        }
    }

    public Account authenticate(String cardNumber, String pin) {
        sessionLock.lock();
        try {
            // Guard state transition
            if (currentState == ATMState.IDLE || activeCard == null) {
                insertCard(cardNumber);
            }

            if (activeCard.isBlocked()) {
                transitionTo(ATMState.CARD_BLOCKED);
                throw new CardBlockedException("Card is BLOCKED!");
            }

            if (!activeCard.getPin().equals(pin)) {
                int attempts = activeCard.incrementFailedAttempts();
                if (attempts >= 3) {
                    activeCard.blockCard();
                    transitionTo(ATMState.CARD_BLOCKED);
                    throw new CardBlockedException("3 consecutive incorrect PINs! Card has been BLOCKED.");
                }
                throw new AuthenticationFailedException(String.format("Invalid PIN! Attempts remaining: %d", 3 - attempts));
            }

            // Authentication success
            activeCard.resetFailedAttempts();
            transitionTo(ATMState.AUTHENTICATED);
            return activeAccount;
        } finally {
            sessionLock.unlock();
        }
    }

    public double getBalance(String accountNumber) {
        Account acc = bankingRepository.getAccount(accountNumber);
        acc.getLock().lock();
        try {
            requireAuthenticatedSessionFor(accountNumber);
            return acc.getBalance();
        } finally {
            acc.getLock().unlock();
        }
    }

    public WithdrawalTransaction withdraw(String accountNumber, double amount) {
        return withdraw(accountNumber, amount, DispenseMode.MINIMIZE_NOTES);
    }

    public WithdrawalTransaction withdraw(String accountNumber, double amount, DispenseMode mode) {
        Account acc = bankingRepository.getAccount(accountNumber);
        int intAmount = (int) amount;

        if (intAmount <= 0 || intAmount % 100 != 0) {
            throw new InsufficientCashException("Withdrawal amount must be a positive multiple of ₹100");
        }

        // Acquire fine-grained per-account lock first, dispenser lock second — fixed global
        // ordering shared by every caller, so the two locks never deadlock against each other.
        //
        // The session-state check AND the TRANSACTION_IN_PROGRESS transition both happen INSIDE
        // this lock, not before it (see RCA-029): requireAuthenticatedSessionFor reads currentState
        // unsynchronized, and setState writes it unsynchronized by design (its own javadoc explains
        // why it must not re-run the transitionTo table check). Two threads racing withdraw() on the
        // SAME account used to be able to interleave their session-state reads/writes around each
        // other's critical section — one thread would read currentState mid-flight as DISPENSING
        // (another thread's in-progress transaction) and fail with a spurious
        // InvalidSessionStateException instead of either succeeding or seeing a clean
        // InsufficientBalanceException. Moving both calls inside the account lock makes the whole
        // check-transition-execute-transition-back sequence atomic per account: by the time any
        // thread reaches this point, the previous thread's finally block has always already reset
        // currentState back to AUTHENTICATED before releasing the lock.
        acc.getLock().lock();
        try {
            requireAuthenticatedSessionFor(accountNumber);
            setState(ATMState.TRANSACTION_IN_PROGRESS);

            // Validate balance
            if (acc.getBalance() < amount) {
                WithdrawalTransaction failedTx = new WithdrawalTransaction(
                        "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                failedTx.setStatus("FAILED");
                failedTx.setFailureReason("Insufficient account balance");
                recordTransaction(accountNumber, failedTx);
                setState(ATMState.AUTHENTICATED);

                throw new InsufficientBalanceException(String.format("Insufficient account balance! Requested: ₹%.2f, Available: ₹%.2f",
                        amount, acc.getBalance()));
            }

            // Step 1: Debit account balance
            acc.setBalance(acc.getBalance() - amount);
            setState(ATMState.DISPENSING);

            // Step 2: Attempt physical cash dispensing under dispenser lock
            Map<NoteDenomination, Integer> dispensedNotes;
            try {
                dispensedNotes = cashDispenser.dispenseCash(intAmount, mode);
            } catch (InsufficientCashException ex) {
                // COMPENSATING TRANSACTION: Revert debit on hardware dispense failure
                acc.setBalance(acc.getBalance() + amount);

                WithdrawalTransaction failedTx = new WithdrawalTransaction(
                        "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                failedTx.setStatus("FAILED");
                failedTx.setFailureReason("Dispenser failure: " + ex.getMessage());
                recordTransaction(accountNumber, failedTx);
                setState(ATMState.AUTHENTICATED);

                throw ex;
            }

            // Success
            WithdrawalTransaction txn = new WithdrawalTransaction(
                    "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
            txn.setDispensedNotes(dispensedNotes);
            txn.setStatus("SUCCESS");
            recordTransaction(accountNumber, txn);

            setState(ATMState.AUTHENTICATED);
            return txn;

        } finally {
            acc.getLock().unlock();
        }
    }

    public DepositTransaction deposit(String accountNumber, double amount, Map<NoteDenomination, Integer> notes) {
        Account acc = bankingRepository.getAccount(accountNumber);

        // Same fix as withdraw() (see its comment and RCA-029): the session check and initial state
        // transition must happen inside the account lock, not before it.
        acc.getLock().lock();
        try {
            requireAuthenticatedSessionFor(accountNumber);
            setState(ATMState.TRANSACTION_IN_PROGRESS);
            acc.setBalance(acc.getBalance() + amount);

            // Add notes to dispenser inventory if provided
            if (notes != null) {
                for (Map.Entry<NoteDenomination, Integer> entry : notes.entrySet()) {
                    cashDispenser.addNotes(entry.getKey(), entry.getValue());
                }
            }

            DepositTransaction txn = new DepositTransaction(
                    "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount, notes);
            txn.setStatus("SUCCESS");
            recordTransaction(accountNumber, txn);

            setState(ATMState.AUTHENTICATED);
            return txn;

        } finally {
            acc.getLock().unlock();
        }
    }

    public Map<String, Object> ejectCard() {
        sessionLock.lock();
        try {
            if (currentState != ATMState.IDLE) {
                transitionTo(ATMState.SESSION_ENDED);
                transitionTo(ATMState.IDLE);
            }
            activeCard = null;
            activeAccount = null;
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("state", currentState);
            res.put("message", "Card ejected. Session ended.");
            return res;
        } finally {
            sessionLock.unlock();
        }
    }

    public List<Transaction> getTransactions(String accountNumber) {
        return accountTransactions.getOrDefault(accountNumber, Collections.emptyList());
    }

    private void recordTransaction(String accountNumber, Transaction txn) {
        accountTransactions.computeIfAbsent(accountNumber, k -> new CopyOnWriteArrayList<>()).add(txn);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized void initSimState() {
        simEventLog.clear();
        simCashDispenser.initDefaultInventory();

        // Seed sim accounts
        Account a1 = Account.builder().id("sim-acc-1").accountNumber("ACC-SIM-1").holderName("Sim Alice").balance(1000.0).build(); // Low balance ₹1000
        Account a2 = Account.builder().id("sim-acc-2").accountNumber("ACC-SIM-2").holderName("Sim Bob").balance(5000.0).build();
        simBankingRepository.addAccount(a1);
        simBankingRepository.addAccount(a2);

        Card c1 = Card.builder().cardNumber("CARD-SIM-1").pin("1234").accountNumber("ACC-SIM-1").build();
        Card c2 = Card.builder().cardNumber("CARD-SIM-2").pin("5678").accountNumber("ACC-SIM-2").build();
        simBankingRepository.addCard(c1);
        simBankingRepository.addCard(c2);

        simState = ATMState.IDLE;
        simActiveCard = null;
        simActiveAccount = null;

        logSimEvent("SIM_RESET", "System", "Initialized simulation ATM with 2 accounts and dispenser notes (Total: ₹" + simCashDispenser.getTotalCashAvailable() + ")", null);
    }

    public synchronized Map<String, Object> simInsertCard(String cardNumber) {
        Card card = simBankingRepository.getCard(cardNumber);
        if (card.isBlocked()) {
            simState = ATMState.CARD_BLOCKED;
            logSimEvent("CARD_BLOCKED", cardNumber, "Card is already BLOCKED. Insert refused.", null);
            return getSimSnapshots();
        }
        simActiveCard = card;
        simActiveAccount = simBankingRepository.getAccount(card.getAccountNumber());
        simState = ATMState.CARD_INSERTED;
        logSimEvent("CARD_INSERTED", cardNumber, "Card inserted for account " + simActiveAccount.getAccountNumber() + ". Awaiting PIN.", null);
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simAuthenticate(String cardNumber, String pin) {
        Card card = simBankingRepository.getCard(cardNumber);
        if (card.isBlocked()) {
            simState = ATMState.CARD_BLOCKED;
            logSimEvent("AUTH_FAILED", cardNumber, "CARD IS BLOCKED due to 3 failed PIN attempts!", null);
            return getSimSnapshots();
        }

        if (!card.getPin().equals(pin)) {
            int attempts = card.incrementFailedAttempts();
            if (attempts >= 3) {
                card.blockCard();
                simState = ATMState.CARD_BLOCKED;
                logSimEvent("CARD_BLOCKED", cardNumber, "3 CONSECUTIVE FAILED PINs! Card is now PERMANENTLY BLOCKED.", null);
            } else {
                logSimEvent("AUTH_FAILED", cardNumber, String.format("Incorrect PIN. Failed attempts: %d/3", attempts), null);
            }
            return getSimSnapshots();
        }

        card.resetFailedAttempts();
        simActiveCard = card;
        simActiveAccount = simBankingRepository.getAccount(card.getAccountNumber());
        simState = ATMState.AUTHENTICATED;

        logSimEvent("AUTHENTICATED", card.getCardNumber(), "PIN verified successfully for account " + simActiveAccount.getAccountNumber(), null);
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simWithdraw(String accountNumber, double amount, DispenseMode mode) {
        if (simState != ATMState.AUTHENTICATED && simState != ATMState.TRANSACTION_IN_PROGRESS) {
            logSimEvent("WITHDRAW_REJECTED", accountNumber, "Session is in state " + simState + " — authenticate before withdrawing.", null);
            return getSimSnapshots();
        }

        Account acc = simBankingRepository.getAccount(accountNumber);
        int intAmount = (int) amount;
        simState = ATMState.TRANSACTION_IN_PROGRESS;

        acc.getLock().lock();
        try {
            if (acc.getBalance() < amount) {
                logSimEvent("WITHDRAW_FAILED", accountNumber, String.format("INSUFFICIENT BALANCE! Requested: ₹%.2f, Available: ₹%.2f", amount, acc.getBalance()), null);
                simState = ATMState.AUTHENTICATED;
                return getSimSnapshots();
            }

            // Debit
            acc.setBalance(acc.getBalance() - amount);
            simState = ATMState.DISPENSING;

            try {
                Map<NoteDenomination, Integer> notes = simCashDispenser.dispenseCash(intAmount, mode);
                logSimEvent("WITHDRAW_SUCCESS", accountNumber, String.format("Successfully withdrew ₹%.2f using %s. Dispensed notes: %s", amount, mode, notes), null);
            } catch (InsufficientCashException ex) {
                // Compensate
                acc.setBalance(acc.getBalance() + amount);
                logSimEvent("DISPENSER_FAIL_REVERT", accountNumber, "DISPENSER DENOMINATION MISMATCH! Reverted ₹" + amount + " debit back to account balance.", null);
            }

            simState = ATMState.AUTHENTICATED;
            return getSimSnapshots();
        } finally {
            acc.getLock().unlock();
        }
    }

    public synchronized Map<String, Object> simEject() {
        simActiveCard = null;
        simActiveAccount = null;
        simState = ATMState.IDLE;
        logSimEvent("SESSION_ENDED", "System", "Card ejected. Sim session reset to IDLE.", null);
        return getSimSnapshots();
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("simState", simState);
        res.put("accounts", simBankingRepository.getAllAccounts());
        res.put("cards", simBankingRepository.getAllCards());
        res.put("activeAccount", simActiveAccount);
        res.put("activeCard", simActiveCard);
        res.put("dispenserCash", simCashDispenser.getTotalCashAvailable());
        res.put("inventory", simCashDispenser.getInventory());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
