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
import java.time.Clock;
import java.util.function.Supplier;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * One physical ATM and an isolated simulation. The live terminal holds sessionLock
 * across admission, account/cassette mutation, settlement and detached capture.
 * Lock order is terminal -> account -> dispenser; ejection waits for admitted work.
 * Per-account and cassette locks still protect their own independently used state.
 * This is in-memory coordination, not a durable transaction or hardware guarantee.
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

    private final AtmLiveSessionCoordinator liveSessions;
    private boolean coordinatedCommand; // Accessed only while sessionLock is held.

    // Isolated Simulation Engine State
    private final BankingRepository simBankingRepository = new BankingRepository();
    private final CashDispenser simCashDispenser;
    private ATMState simState = ATMState.IDLE;
    private Card simActiveCard;
    private Account simActiveAccount;
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    @org.springframework.beans.factory.annotation.Autowired
    public AtmService(BankingRepository bankingRepository, CashDispenser cashDispenser,
                      com.lld.atm.dispenser.DenominationDispenseStrategyFactory strategyFactory) {
        this(bankingRepository, cashDispenser, strategyFactory, Clock.systemUTC());
    }

    AtmService(BankingRepository bankingRepository, CashDispenser cashDispenser,
               com.lld.atm.dispenser.DenominationDispenseStrategyFactory strategyFactory, Clock clock) {
        this.bankingRepository = bankingRepository;
        this.cashDispenser = cashDispenser;
        this.simCashDispenser = new CashDispenser(strategyFactory);
        this.liveSessions = new AtmLiveSessionCoordinator(this, clock);
        initSimState();
    }

    public ATMState getCurrentState() {
        return currentState;
    }

    public Account getActiveAccount() {
        sessionLock.lock();
        try { return copyLiveAccount(activeAccount); } finally { sessionLock.unlock(); }
    }

    public Card getActiveCard() {
        sessionLock.lock();
        try { return copySimCard(activeCard); } finally { sessionLock.unlock(); }
    }

    public CashDispenser getCashDispenser() {
        return cashDispenser;
    }

    // =========================================================================
    // STATE MACHINE TRANSITIONS & GUARDS
    // =========================================================================

    /** All live phase changes are checked while the caller owns the terminal lock. */
    private void transitionTo(ATMState target) {
        sessionLock.lock();
        try {
            SessionState state = SessionStates.of(currentState);
            if (!state.canTransitionTo(target)) {
                throw new InvalidSessionStateException(
                        "Illegal session transition: " + currentState + " -> " + target);
            }
            currentState = target;
            if (!coordinatedCommand) liveSessions.legacyChanged();
        } finally {
            sessionLock.unlock();
        }
    }

    /**
     * Guard for every money-moving/balance-reading operation: the terminal must currently be in an
     * authenticated session, and the account being operated on must be the one that session
     * authenticated into — a caller cannot pass an arbitrary {@code accountNumber} to withdraw
     * from an account nobody entered a PIN for.
     */
    private void requireAuthenticatedSessionFor(String accountNumber) {
        ATMState state = currentState;
        if (state != ATMState.AUTHENTICATED) {
            throw new InvalidSessionStateException(
                    "This operation requires an authenticated session. Current state: " + state);
        }
        if (activeAccount == null || !activeAccount.getAccountNumber().equals(accountNumber)) {
            throw new InvalidSessionStateException(
                    "Account " + accountNumber + " is not the account authenticated in this session.");
        }
    }

    public Map<String, Object> insertCard(String cardNumber) {
        requireIdentifier(cardNumber, "cardNumber");
        sessionLock.lock();
        try {
            requireLegacyAccess();
            if (currentState != ATMState.IDLE && currentState != ATMState.SESSION_ENDED) {
                throw new InvalidSessionStateException("Cannot insert card! Session is currently in state: " + currentState);
            }

            Card card = bankingRepository.getCard(cardNumber);
            activeAccount = bankingRepository.getAccount(card.getAccountNumber());
            activeCard = card;
            if (card.isBlocked()) {
                transitionTo(ATMState.CARD_BLOCKED);
                throw new CardBlockedException("Card " + cardNumber + " is BLOCKED due to 3 failed PIN attempts!");
            }

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
        requireIdentifier(cardNumber, "cardNumber");
        requirePin(pin);
        sessionLock.lock();
        try {
            requireLegacyAccess();
            // Guard state transition
            if (currentState == ATMState.IDLE || activeCard == null) {
                insertCard(cardNumber);
            }

            if (!activeCard.getCardNumber().equals(cardNumber)) {
                throw new InvalidSessionStateException("Authenticate the card currently inserted in this terminal");
            }
            if (activeCard.isBlocked()) {
                if (currentState != ATMState.CARD_BLOCKED) transitionTo(ATMState.CARD_BLOCKED);
                throw new CardBlockedException("Card is BLOCKED!");
            }

            if (currentState != ATMState.CARD_INSERTED) {
                throw new InvalidSessionStateException("Enter a PIN only after inserting the card");
            }
            if (!activeCard.getPin().equals(pin)) {
                int attempts = activeCard.incrementFailedAttempts();
                if (!coordinatedCommand) liveSessions.legacyChanged();
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
            return copyLiveAccount(activeAccount);
        } finally {
            sessionLock.unlock();
        }
    }

    public double getBalance(String accountNumber) {
        sessionLock.lock();
        try {
            requireLegacyAccess();
            Account acc = bankingRepository.getAccount(accountNumber);
            acc.getLock().lock();
            try {
                requireAuthenticatedSessionFor(accountNumber);
                return acc.getBalance();
            } finally {
                acc.getLock().unlock();
            }

        } finally { sessionLock.unlock(); }
    }

    public WithdrawalTransaction withdraw(String accountNumber, double amount) {
        return withdraw(accountNumber, amount, DispenseMode.MINIMIZE_NOTES);
    }

    public WithdrawalTransaction withdraw(String accountNumber, double amount, DispenseMode mode) {
        sessionLock.lock();
        try {
            requireLegacyAccess();
            requireIdentifier(accountNumber, "accountNumber");
            int intAmount = withdrawalAmount(amount, mode);
            Account acc = bankingRepository.getAccount(accountNumber);

            // One terminal admits and settles a transaction before ejection or another command.
            acc.getLock().lock();
            boolean admitted = false;
            try {
                requireAuthenticatedSessionFor(accountNumber);
                admitted = true;
                transitionTo(ATMState.TRANSACTION_IN_PROGRESS);

                // Validate balance
                if (acc.getBalance() < amount) {
                    WithdrawalTransaction failedTx = new WithdrawalTransaction(
                            "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                    failedTx.setStatus("FAILED");
                    failedTx.setFailureReason("Insufficient account balance");
                    recordTransaction(accountNumber, failedTx);
                    transitionTo(ATMState.AUTHENTICATED);

                    throw new InsufficientBalanceException(String.format("Insufficient account balance! Requested: ₹%.2f, Available: ₹%.2f",
                            amount, acc.getBalance()));
                }

                double debitedBalance = acc.getBalance() - amount;
                if (debitedBalance == acc.getBalance()) {
                    throw new InvalidAtmRequestException("The withdrawal amount is too small for this balance's supported precision");
                }
                // Step 1: Debit account balance only after checking representability.
                acc.setBalance(debitedBalance);
                transitionTo(ATMState.DISPENSING);

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
                    transitionTo(ATMState.AUTHENTICATED);

                    throw ex;
                }

                // Success
                WithdrawalTransaction txn = new WithdrawalTransaction(
                        "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                txn.setDispensedNotes(dispensedNotes);
                txn.setStatus("SUCCESS");
                recordTransaction(accountNumber, txn);

                transitionTo(ATMState.AUTHENTICATED);
                return txn.detachedCopy();

            } catch (com.lld.config.DomainException knownRejection) {
                throw knownRejection;
            } catch (AtmOperationUncertainException uncertain) {
                throw uncertain;
            } catch (RuntimeException unexpected) {
                throw new AtmOperationUncertainException(unexpected);
            } finally {
                // Restore an inspectable phase even after an unexpected failure. This does
                // not compensate unknown money effects or allow an automatic new request.
                try {
                    if (admitted && currentState != ATMState.AUTHENTICATED) transitionTo(ATMState.AUTHENTICATED);
                } finally { acc.getLock().unlock(); }
            }

        } finally { sessionLock.unlock(); }
    }

    public DepositTransaction deposit(String accountNumber, double amount, Map<NoteDenomination, Integer> notes) {
        sessionLock.lock();
        try {
            requireLegacyAccess();
            requireIdentifier(accountNumber, "accountNumber");
            requirePositiveAmount(amount);
            Account acc = bankingRepository.getAccount(accountNumber);

            acc.getLock().lock();
            boolean admitted = false;
            try {
                requireAuthenticatedSessionFor(accountNumber);
                admitted = true;
                double updatedBalance = acc.getBalance() + amount;
                if (!Double.isFinite(updatedBalance)) {
                    throw new InvalidAtmRequestException("Deposit would exceed the account balance range");
                }
                if (updatedBalance == acc.getBalance()) {
                    throw new InvalidAtmRequestException("The deposit amount is too small for this balance's supported precision");
                }
                transitionTo(ATMState.TRANSACTION_IN_PROGRESS);
                acc.setBalance(updatedBalance);

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

                transitionTo(ATMState.AUTHENTICATED);
                return txn.detachedCopy();

            } catch (com.lld.config.DomainException knownRejection) {
                throw knownRejection;
            } catch (AtmOperationUncertainException uncertain) {
                throw uncertain;
            } catch (RuntimeException unexpected) {
                throw new AtmOperationUncertainException(unexpected);
            } finally {
                // Restore an inspectable phase even after an unexpected failure. This does
                // not compensate unknown money effects or allow an automatic new request.
                try {
                    if (admitted && currentState != ATMState.AUTHENTICATED) transitionTo(ATMState.AUTHENTICATED);
                } finally { acc.getLock().unlock(); }
            }

        } finally { sessionLock.unlock(); }
    }

    public Map<String, Object> ejectCard() {
        sessionLock.lock();
        try {
            requireLegacyAccess();
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
        sessionLock.lock();
        try {
            return accountTransactions.getOrDefault(accountNumber, Collections.emptyList()).stream()
                    .map(Transaction::detachedCopy).toList();
        } finally { sessionLock.unlock(); }
    }

    private void recordTransaction(String accountNumber, Transaction txn) {
        accountTransactions.computeIfAbsent(accountNumber, k -> new CopyOnWriteArrayList<>()).add(txn.detachedCopy());
    }

    private void requireLegacyAccess() {
        if (!coordinatedCommand && liveSessions.hasOwner())
            throw new AtmSessionConflictException("This terminal belongs to a browser session; use its coordinated requests");
    }

    /** Runs only under sessionLock; nested internal calls retain the validated owner context. */
    <T> T coordinated(Supplier<T> operation) {
        if (!sessionLock.isHeldByCurrentThread()) throw new IllegalStateException("Terminal lock required");
        boolean previous = coordinatedCommand;
        coordinatedCommand = true;
        try { return operation.get(); } finally { coordinatedCommand = previous; }
    }

    public Map<String, Object> terminalState(String token) {
        sessionLock.lock();
        try { return liveSessions.state(token); } finally { sessionLock.unlock(); }
    }

    public Map<String, Object> terminalCommand(String token, String requestId, Map<String, Object> body) {
        sessionLock.lock();
        try { return liveSessions.command(token, requestId, body); } finally { sessionLock.unlock(); }
    }

    public Map<String, Object> terminalOutcome(String token, String requestId) {
        sessionLock.lock();
        try { return liveSessions.outcome(token, requestId); } finally { sessionLock.unlock(); }
    }

    private Account copyLiveAccount(Account account) {
        if (account == null) return null;
        account.getLock().lock();
        try { return copySimAccount(account); } finally { account.getLock().unlock(); }
    }

    /** Capture authentication result and phase before ejection can run. */
    public Map<String, Object> authenticateSnapshot(String cardNumber, String pin) {
        sessionLock.lock();
        try {
            Account account = authenticate(cardNumber, pin);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", account.getId()); response.put("accountNumber", account.getAccountNumber());
            response.put("holderName", account.getHolderName()); response.put("balance", account.getBalance());
            response.put("state", currentState); return response;
        } finally { sessionLock.unlock(); }
    }

    public List<Transaction> getAuthenticatedTransactions(String accountNumber) {
        sessionLock.lock();
        try {
            requireLegacyAccess();
            requireAuthenticatedSessionFor(accountNumber);
            return getTransactions(accountNumber);
        } finally { sessionLock.unlock(); }
    }

    /** Both values describe the same cassette capture, including direct hardware callers. */
    public Map<String, Object> getDispenserSnapshot() {
        cashDispenser.getLock().lock();
        try { return Map.of("totalCash", cashDispenser.getTotalCashAvailable(), "inventory", cashDispenser.getInventory()); }
        finally { cashDispenser.getLock().unlock(); }
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

    /** Reset and capture share the sandbox monitor; another request cannot enter between them. */
    public synchronized Map<String, Object> simReset() {
        initSimState();
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simInsertCard(String cardNumber) {
        requireIdentifier(cardNumber, "cardNumber");
        if (simState != ATMState.IDLE) {
            throw new InvalidSessionStateException("Eject the current sandbox card before inserting another");
        }
        Card card = simBankingRepository.getCard(cardNumber);
        simActiveCard = card;
        simActiveAccount = simBankingRepository.getAccount(card.getAccountNumber());
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
        requireIdentifier(cardNumber, "cardNumber");
        requirePin(pin);
        if (simState != ATMState.CARD_INSERTED || simActiveCard == null
                || !simActiveCard.getCardNumber().equals(cardNumber)) {
            throw new InvalidSessionStateException("Insert this sandbox card before authenticating");
        }
        Card card = simActiveCard;
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
        requireIdentifier(accountNumber, "accountNumber");
        int intAmount = withdrawalAmount(amount, mode);
        if (simState != ATMState.AUTHENTICATED || simActiveAccount == null
                || !simActiveAccount.getAccountNumber().equals(accountNumber)) {
            logSimEvent("WITHDRAW_REJECTED", accountNumber,
                    "Authenticate the selected account before withdrawing.", null);
            return withdrawalSnapshot("REJECTED");
        }

        Account acc = simActiveAccount;
        simState = ATMState.TRANSACTION_IN_PROGRESS;
        acc.getLock().lock();
        try {
            if (acc.getBalance() < amount) {
                logSimEvent("WITHDRAW_FAILED", accountNumber, String.format("INSUFFICIENT BALANCE! Requested: ₹%.2f, Available: ₹%.2f", amount, acc.getBalance()), null);
                simState = ATMState.AUTHENTICATED;
                return withdrawalSnapshot("INSUFFICIENT_BALANCE");
            }
            acc.setBalance(acc.getBalance() - amount);
            simState = ATMState.DISPENSING;
            String outcome;
            try {
                Map<NoteDenomination, Integer> notes = simCashDispenser.dispenseCash(intAmount, mode);
                logSimEvent("WITHDRAW_SUCCESS", accountNumber, String.format("Successfully withdrew ₹%.2f using %s. Dispensed notes: %s", amount, mode, notes), null);
                outcome = "SUCCESS";
            } catch (InsufficientCashException ex) {
                acc.setBalance(acc.getBalance() + amount);
                logSimEvent("DISPENSER_FAIL_REVERT", accountNumber, "DISPENSER DENOMINATION MISMATCH! Reverted ₹" + amount + " debit back to account balance.", null);
                outcome = "DISPENSER_FAILED";
            }
            simState = ATMState.AUTHENTICATED;
            return withdrawalSnapshot(outcome);
        } finally {
            acc.getLock().unlock();
        }
    }

    private Map<String, Object> withdrawalSnapshot(String outcome) {
        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("withdrawalOutcome", outcome);
        return snapshot;
    }

    public synchronized Map<String, Object> simEject() {
        simActiveCard = null;
        simActiveAccount = null;
        simState = ATMState.IDLE;
        logSimEvent("SESSION_ENDED", "System", "Card ejected. Sim session reset to IDLE.", null);
        return getSimSnapshots();
    }

    public synchronized List<SimEvent> getSimEvents() {
        return simEventLog.stream().map(AtmService::copySimEvent).toList();
    }

    /** Every field is captured under the same monitor used by sandbox mutations. */
    public synchronized Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("simState", simState);
        res.put("accounts", simBankingRepository.getAllAccounts().stream().map(AtmService::copySimAccount).toList());
        res.put("cards", simBankingRepository.getAllCards().stream().map(AtmService::copySimCard).toList());
        res.put("activeAccount", copySimAccount(simActiveAccount));
        res.put("activeCard", copySimCard(simActiveCard));
        res.put("dispenserCash", simCashDispenser.getTotalCashAvailable());
        res.put("inventory", simCashDispenser.getInventory());
        res.put("events", getSimEvents());
        return res;
    }

    private static Account copySimAccount(Account account) {
        if (account == null) return null;
        return Account.builder().id(account.getId()).accountNumber(account.getAccountNumber())
                .holderName(account.getHolderName()).balance(account.getBalance()).build();
    }

    private static Card copySimCard(Card card) {
        if (card == null) return null;
        return Card.builder().cardNumber(card.getCardNumber()).pin(card.getPin())
                .accountNumber(card.getAccountNumber()).isBlocked(card.isBlocked())
                .failedPinAttempts(new java.util.concurrent.atomic.AtomicInteger(card.getFailedPinAttempts())).build();
    }

    private static SimEvent copySimEvent(SimEvent event) {
        return new SimEvent(event.getId(), event.getTimestamp(), event.getType(), event.getActor(),
                event.getDescription(), copySimDetails(event.getDetails()));
    }

    private static Map<String, Object> copySimDetails(Map<String, Object> details) {
        if (details == null) return null;
        Map<String, Object> copy = new LinkedHashMap<>();
        details.forEach((key, value) -> copy.put(key, copySimValue(value)));
        return copy;
    }

    private static Object copySimValue(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<Object, Object> copy = new LinkedHashMap<>();
            map.forEach((key, item) -> copy.put(key, copySimValue(item)));
            return copy;
        }
        if (value instanceof List<?> list) return list.stream().map(AtmService::copySimValue).toList();
        // Sandbox event details contain JSON scalars, maps and lists only.
        return value;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    private static void requireIdentifier(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new InvalidAtmRequestException("'" + name + "' must be a nonblank string");
        }
    }

    private static void requirePin(String pin) {
        if (pin == null || !pin.matches("[0-9]{4}")) {
            throw new InvalidAtmRequestException("'pin' must contain exactly four digits");
        }
    }

    private static void requirePositiveAmount(double amount) {
        if (!Double.isFinite(amount) || amount <= 0) {
            throw new InvalidAtmRequestException("'amount' must be finite and greater than zero");
        }
    }

    private static int withdrawalAmount(double amount, DispenseMode mode) {
        requirePositiveAmount(amount);
        if (amount > Integer.MAX_VALUE || amount % 100 != 0) {
            throw new InvalidAtmRequestException("Withdrawal amount must be a whole multiple of ₹100 within the dispenser range");
        }
        if (mode == null) {
            throw new InvalidAtmRequestException("A dispense mode is required");
        }
        return (int) amount;
    }
}
