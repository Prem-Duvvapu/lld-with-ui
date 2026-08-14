package com.lld.atm.service;

import com.lld.atm.dispenser.CashDispenser;
import com.lld.atm.exception.*;
import com.lld.atm.model.*;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class AtmService {

    private final BankingService bankingService;
    private final CashDispenser cashDispenser;

    private ATMState currentState = ATMState.IDLE;
    private Card activeCard;
    private Account activeAccount;

    private final Map<String, List<Transaction>> accountTransactions = new ConcurrentHashMap<>();
    private final AtomicLong transactionIdGen = new AtomicLong(1001);
    private final ReentrantLock sessionLock = new ReentrantLock(true);

    // Isolated Simulation Engine State
    private final BankingService simBankingService = new BankingService();
    private final CashDispenser simCashDispenser;
    private ATMState simState = ATMState.IDLE;
    private Card simActiveCard;
    private Account simActiveAccount;
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public AtmService(BankingService bankingService, CashDispenser cashDispenser) {
        this.bankingService = bankingService;
        this.cashDispenser = cashDispenser;
        this.simCashDispenser = new CashDispenser(cashDispenser.getInventory() != null ?
                new com.lld.atm.dispenser.GreedyDenominationDispenseStrategy() : null);
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

    public Map<String, Object> insertCard(String cardNumber) {
        sessionLock.lock();
        try {
            if (currentState != ATMState.IDLE && currentState != ATMState.SESSION_ENDED) {
                throw new InvalidSessionStateException("Cannot insert card! Session is currently in state: " + currentState);
            }

            Card card = bankingService.getCard(cardNumber);
            if (card.isBlocked()) {
                currentState = ATMState.CARD_BLOCKED;
                throw new CardBlockedException("Card " + cardNumber + " is BLOCKED due to 3 failed PIN attempts!");
            }

            activeCard = card;
            activeAccount = bankingService.getAccount(card.getAccountNumber());
            currentState = ATMState.CARD_INSERTED;

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
                currentState = ATMState.CARD_BLOCKED;
                throw new CardBlockedException("Card is BLOCKED!");
            }

            if (!activeCard.getPin().equals(pin)) {
                int attempts = activeCard.incrementFailedAttempts();
                if (attempts >= 3) {
                    activeCard.blockCard();
                    currentState = ATMState.CARD_BLOCKED;
                    throw new CardBlockedException("3 consecutive incorrect PINs! Card has been BLOCKED.");
                }
                throw new AuthenticationFailedException(String.format("Invalid PIN! Attempts remaining: %d", 3 - attempts));
            }

            // Authentication success
            activeCard.resetFailedAttempts();
            currentState = ATMState.AUTHENTICATED;
            return activeAccount;
        } finally {
            sessionLock.unlock();
        }
    }

    public double getBalance(String accountNumber) {
        Account acc = bankingService.getAccount(accountNumber);
        acc.getLock().lock();
        try {
            return acc.getBalance();
        } finally {
            acc.getLock().unlock();
        }
    }

    public WithdrawalTransaction withdraw(String accountNumber, double amount) {
        Account acc = bankingService.getAccount(accountNumber);
        int intAmount = (int) amount;

        if (intAmount <= 0 || intAmount % 100 != 0) {
            throw new InsufficientCashException("Withdrawal amount must be a positive multiple of ₹100");
        }

        // Acquire fine-grained per-account lock
        acc.getLock().lock();
        try {
            // Validate balance
            if (acc.getBalance() < amount) {
                WithdrawalTransaction failedTx = new WithdrawalTransaction(
                        "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                failedTx.setStatus("FAILED");
                failedTx.setFailureReason("Insufficient account balance");
                recordTransaction(accountNumber, failedTx);

                throw new InsufficientBalanceException(String.format("Insufficient account balance! Requested: ₹%.2f, Available: ₹%.2f",
                        amount, acc.getBalance()));
            }

            // Step 1: Debit account balance
            acc.setBalance(acc.getBalance() - amount);

            // Step 2: Attempt physical cash dispensing under dispenser lock
            Map<NoteDenomination, Integer> dispensedNotes;
            try {
                dispensedNotes = cashDispenser.dispenseCash(intAmount);
            } catch (InsufficientCashException ex) {
                // COMPENSATING TRANSACTION: Revert debit on hardware dispense failure
                acc.setBalance(acc.getBalance() + amount);

                WithdrawalTransaction failedTx = new WithdrawalTransaction(
                        "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
                failedTx.setStatus("FAILED");
                failedTx.setFailureReason("Dispenser failure: " + ex.getMessage());
                recordTransaction(accountNumber, failedTx);

                throw ex;
            }

            // Success
            WithdrawalTransaction txn = new WithdrawalTransaction(
                    "TXN-" + transactionIdGen.getAndIncrement(), accountNumber, amount);
            txn.setDispensedNotes(dispensedNotes);
            txn.setStatus("SUCCESS");
            recordTransaction(accountNumber, txn);

            currentState = ATMState.TRANSACTION_IN_PROGRESS;
            return txn;

        } finally {
            acc.getLock().unlock();
        }
    }

    public DepositTransaction deposit(String accountNumber, double amount, Map<NoteDenomination, Integer> notes) {
        Account acc = bankingService.getAccount(accountNumber);

        acc.getLock().lock();
        try {
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

            currentState = ATMState.TRANSACTION_IN_PROGRESS;
            return txn;

        } finally {
            acc.getLock().unlock();
        }
    }

    public Map<String, Object> ejectCard() {
        sessionLock.lock();
        try {
            activeCard = null;
            activeAccount = null;
            currentState = ATMState.IDLE;
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
        Account a1 = new Account("sim-acc-1", "ACC-SIM-1", "Sim Alice", 1000.0); // Low balance ₹1000
        Account a2 = new Account("sim-acc-2", "ACC-SIM-2", "Sim Bob", 5000.0);
        simBankingService.addAccount(a1);
        simBankingService.addAccount(a2);

        Card c1 = new Card("CARD-SIM-1", "1234", "ACC-SIM-1");
        Card c2 = new Card("CARD-SIM-2", "5678", "ACC-SIM-2");
        simBankingService.addCard(c1);
        simBankingService.addCard(c2);

        simState = ATMState.IDLE;
        simActiveCard = null;
        simActiveAccount = null;

        logSimEvent("SIM_RESET", "System", "Initialized simulation ATM with 2 accounts and dispenser notes (Total: ₹" + simCashDispenser.getTotalCashAvailable() + ")", null);
    }

    public synchronized Map<String, Object> simAuthenticate(String cardNumber, String pin) {
        Card card = simBankingService.getCard(cardNumber);
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
        simActiveAccount = simBankingService.getAccount(card.getAccountNumber());
        simState = ATMState.AUTHENTICATED;

        logSimEvent("AUTHENTICATED", card.getCardNumber(), "PIN verified successfully for account " + simActiveAccount.getAccountNumber(), null);
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simWithdraw(String accountNumber, double amount) {
        Account acc = simBankingService.getAccount(accountNumber);
        int intAmount = (int) amount;

        acc.getLock().lock();
        try {
            if (acc.getBalance() < amount) {
                logSimEvent("WITHDRAW_FAILED", accountNumber, String.format("INSUFFICIENT BALANCE! Requested: ₹%.2f, Available: ₹%.2f", amount, acc.getBalance()), null);
                return getSimSnapshots();
            }

            // Debit
            acc.setBalance(acc.getBalance() - amount);

            try {
                Map<NoteDenomination, Integer> notes = simCashDispenser.dispenseCash(intAmount);
                logSimEvent("WITHDRAW_SUCCESS", accountNumber, String.format("Successfully withdrew ₹%.2f. Dispensed notes: %s", amount, notes), null);
            } catch (InsufficientCashException ex) {
                // Compensate
                acc.setBalance(acc.getBalance() + amount);
                logSimEvent("DISPENSER_FAIL_REVERT", accountNumber, "DISPENSER DENOMINATION MISMATCH! Reverted ₹" + amount + " debit back to account balance.", null);
            }

            return getSimSnapshots();
        } finally {
            acc.getLock().unlock();
        }
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("simState", simState);
        res.put("accounts", simBankingService.getAllAccounts());
        res.put("cards", simBankingService.getAllCards());
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
