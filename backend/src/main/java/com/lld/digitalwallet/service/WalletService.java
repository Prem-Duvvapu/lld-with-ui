package com.lld.digitalwallet.service;

import com.lld.digitalwallet.command.CreditCommand;
import com.lld.digitalwallet.command.DebitCommand;
import com.lld.digitalwallet.command.TransferCommand;
import com.lld.digitalwallet.command.WalletCommand;
import com.lld.digitalwallet.exception.WalletNotFoundException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.model.WalletSimEvent;
import com.lld.digitalwallet.repository.WalletRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongFunction;
import java.util.stream.Collectors;

/**
 * Facade the controller delegates to wholesale. Owns the production {@link WalletRepository}
 * plus one {@link ReentrantLock} per wallet (lazily created, never removed — matching
 * {@code InventoryService}'s per-product lock idiom) and a completely separate isolated sandbox
 * {@link WalletRepository} with its own lock map for the {@code /sim/*} engine, so a demo run can
 * never leak into or corrupt live balances.
 *
 * <p>Every credit, debit and transfer is modelled as a {@link WalletCommand} (Command pattern):
 * the arithmetic and locking live inside the command, and {@code WalletService} only builds the
 * command, executes it, and appends it to {@link #commandLog} — the wallet's operational history
 * is literally that list of executed commands, in order.
 */
@Service
public class WalletService {

    // ------------------------------------------------------------- live state
    private final WalletRepository repository;
    private final ConcurrentHashMap<Long, ReentrantLock> walletLocks = new ConcurrentHashMap<>();
    private final List<WalletCommand> commandLog = new CopyOnWriteArrayList<>();

    // ------------------------------------------------------- isolated sim sandbox
    private volatile WalletRepository simRepository;
    private volatile ConcurrentHashMap<Long, ReentrantLock> simWalletLocks;
    private final List<WalletSimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public WalletService(WalletRepository repository) {
        this.repository = repository;
        resetSandbox();
    }

    private ReentrantLock lockFor(long walletId) {
        return walletLocks.computeIfAbsent(walletId, id -> new ReentrantLock());
    }

    private ReentrantLock simLockFor(long walletId) {
        return simWalletLocks.computeIfAbsent(walletId, id -> new ReentrantLock());
    }

    // ================================================================= LIVE API

    public Wallet createWallet(String userId, String userName) {
        Wallet wallet = Wallet.builder()
                .id(repository.nextWalletId())
                .userId(userId)
                .userName(userName)
                .balance(0.0)
                .currency("INR")
                .createdAt(LocalDateTime.now())
                .build();
        ReentrantLock lock = lockFor(wallet.getId());
        lock.lock();
        try {
            repository.saveWallet(wallet);
            return copyOf(wallet);
        } finally {
            lock.unlock();
        }
    }

    public double getBalance(long walletId) {
        return readBalance(repository, this::lockFor, walletId);
    }

    public Map<String, Object> addFunds(long walletId, double amount, String paymentMethod) {
        CreditCommand command = new CreditCommand(repository, lockFor(walletId), walletId, amount,
                paymentMethod == null || paymentMethod.isBlank() ? "CARD" : paymentMethod);
        Transaction txn = runCommand(command);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("newBalance", command.getResultingBalance());
        result.put("transaction", txn);
        return result;
    }

    public Map<String, Object> withdrawFunds(long walletId, double amount, String description) {
        DebitCommand command = new DebitCommand(repository, lockFor(walletId), walletId, amount, description);
        Transaction txn = runCommand(command);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("newBalance", command.getResultingBalance());
        result.put("transaction", txn);
        return result;
    }

    /** Transfers money between two wallets — see {@link TransferCommand} for the deadlock-free locking rule. */
    public Map<String, Object> sendMoney(long fromWalletId, long toWalletId, double amount, String description) {
        TransferCommand command = new TransferCommand(repository, this::lockFor, fromWalletId, toWalletId, amount, description);
        Transaction txn = runCommand(command);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("fromBalance", command.getResultingFromBalance());
        result.put("toBalance", command.getResultingToBalance());
        result.put("transaction", txn);
        return result;
    }

    public List<Transaction> getTransactions(long walletId) {
        requireWallet(repository, walletId);
        return repository.getTransactionsByWalletId(walletId);
    }

    public List<Wallet> getAllWallets() {
        return snapshotWallets(repository, this::lockFor);
    }

    public Wallet getWallet(long walletId) {
        return snapshotWallet(repository, this::lockFor, walletId);
    }

    /** The command log IS the execution history — every credit/debit/transfer ever run, in order. */
    public List<String> getCommandLog() {
        return commandLog.stream().map(WalletCommand::describe).collect(Collectors.toList());
    }

    private Transaction runCommand(WalletCommand command) {
        Transaction txn = command.execute();
        commandLog.add(command);
        return txn;
    }

    private Wallet requireWallet(WalletRepository repo, long walletId) {
        Wallet wallet = repo.findWalletById(walletId);
        if (wallet == null) {
            throw new WalletNotFoundException(walletId);
        }
        return wallet;
    }

    /**
     * Reads one balance under the same lock every writer uses. ConcurrentHashMap safely publishes
     * the Wallet reference, but it does not make later mutations of Wallet#balance visible.
     */
    private double readBalance(WalletRepository repo, LongFunction<ReentrantLock> lockProvider, long walletId) {
        requireWallet(repo, walletId); // avoid allocating a permanent lock for an unknown id
        ReentrantLock lock = lockProvider.apply(walletId);
        lock.lock();
        try {
            return requireWallet(repo, walletId).getBalance();
        } finally {
            lock.unlock();
        }
    }

    private Wallet snapshotWallet(WalletRepository repo, LongFunction<ReentrantLock> lockProvider, long walletId) {
        requireWallet(repo, walletId);
        ReentrantLock lock = lockProvider.apply(walletId);
        lock.lock();
        try {
            return copyOf(requireWallet(repo, walletId));
        } finally {
            lock.unlock();
        }
    }

    /**
     * Acquires every wallet lock in ascending id order, matching TransferCommand, then returns
     * detached values. This prevents a transfer snapshot from observing the sender debit without
     * the corresponding recipient credit, and prevents JSON serialization after return from
     * racing later mutations of the repository's live Wallet objects.
     */
    private List<Wallet> snapshotWallets(WalletRepository repo, LongFunction<ReentrantLock> lockProvider) {
        List<Long> ids = repo.getWalletIds();
        List<ReentrantLock> locks = new ArrayList<>(ids.size());
        for (Long id : ids) {
            ReentrantLock lock = lockProvider.apply(id);
            lock.lock();
            locks.add(lock);
        }
        try {
            List<Wallet> snapshots = new ArrayList<>(ids.size());
            for (Long id : ids) {
                snapshots.add(copyOf(requireWallet(repo, id)));
            }
            return List.copyOf(snapshots);
        } finally {
            for (int i = locks.size() - 1; i >= 0; i--) {
                locks.get(i).unlock();
            }
        }
    }

    private double totalBalanceSnapshot(WalletRepository repo, LongFunction<ReentrantLock> lockProvider) {
        return snapshotWallets(repo, lockProvider).stream().mapToDouble(Wallet::getBalance).sum();
    }

    private static Wallet copyOf(Wallet wallet) {
        return Wallet.builder()
                .id(wallet.getId())
                .userId(wallet.getUserId())
                .userName(wallet.getUserName())
                .balance(wallet.getBalance())
                .currency(wallet.getCurrency())
                .createdAt(wallet.getCreatedAt())
                .build();
    }

    // ================================================================= ISOLATED SIMULATION ENGINE

    private void resetSandbox() {
        this.simRepository = new WalletRepository();
        this.simWalletLocks = new ConcurrentHashMap<>();
    }

    public synchronized Map<String, Object> simReset() {
        resetSandbox();
        simEvents.clear();
        simEventIdGen.set(1);
        simEvents.add(WalletSimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Sandbox Reset")
                .description("Isolated sim wallet repository re-seeded with 3 wallets (Alice ₹5000, Bob ₹3000, Charlie ₹10000) — separate from live data.")
                .build());
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> getSimSnapshot() {
        List<Wallet> wallets = snapshotWallets(simRepository, this::simLockFor);
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("wallets", wallets);
        snapshot.put("totalBalance", wallets.stream().mapToDouble(Wallet::getBalance).sum());
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    public synchronized Map<String, Object> simCredit(long walletId, double amount, String paymentMethod, int step) {
        try {
            CreditCommand command = new CreditCommand(simRepository, simLockFor(walletId), walletId, amount,
                    paymentMethod == null || paymentMethod.isBlank() ? "CARD" : paymentMethod);
            Transaction txn = command.execute();
            simEvents.add(WalletSimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("CREDIT").status("SUCCESS")
                    .title("Funds Added")
                    .description(command.describe() + " -> new balance " + command.getResultingBalance())
                    .build()
                    .addDetail("transactionId", txn.getId()));
        } catch (RuntimeException ex) {
            simEvents.add(errorEvent(step, "CREDIT_ERROR", "Credit Rejected", ex));
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simDebit(long walletId, double amount, int step) {
        try {
            DebitCommand command = new DebitCommand(simRepository, simLockFor(walletId), walletId, amount, "Simulated withdrawal");
            Transaction txn = command.execute();
            simEvents.add(WalletSimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("DEBIT").status("SUCCESS")
                    .title("Funds Withdrawn")
                    .description(command.describe() + " -> new balance " + command.getResultingBalance())
                    .build()
                    .addDetail("transactionId", txn.getId()));
        } catch (RuntimeException ex) {
            simEvents.add(errorEvent(step, "DEBIT_ERROR", "Debit Rejected", ex));
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simTransfer(long fromWalletId, long toWalletId, double amount, String description, int step) {
        try {
            TransferCommand command = new TransferCommand(simRepository, this::simLockFor, fromWalletId, toWalletId, amount, description);
            Transaction txn = command.execute();
            simEvents.add(WalletSimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("TRANSFER").status("SUCCESS")
                    .title("Transfer Complete")
                    .description(command.describe() + " succeeded — locks acquired in ascending wallet-id order, so this can never deadlock against a reverse-direction transfer.")
                    .build()
                    .addDetail("transactionId", txn.getId()));
        } catch (RuntimeException ex) {
            simEvents.add(errorEvent(step, "TRANSFER_ERROR", "Transfer Rejected", ex));
            throw ex;
        }
        return getSimSnapshot();
    }

    /**
     * Fires {@code concurrentTransfers} simultaneous transfers between two wallets, alternating
     * direction, via a {@link CountDownLatch} so they genuinely race. Demonstrates live that the
     * ascending-lock-order rule in {@link TransferCommand} keeps the sum of both balances exactly
     * conserved no matter how many transfers interleave or how many are rejected for insufficient
     * balance.
     */
    public synchronized Map<String, Object> simRace(long walletAId, long walletBId, int concurrentTransfers, double amountEach, int step) {
        double totalBefore = totalBalanceSnapshot(simRepository, this::simLockFor);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger succeeded = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Thread[] threads = new Thread[concurrentTransfers];
        for (int i = 0; i < concurrentTransfers; i++) {
            boolean aToB = i % 2 == 0;
            long from = aToB ? walletAId : walletBId;
            long to = aToB ? walletBId : walletAId;
            threads[i] = new Thread(() -> {
                try {
                    start.await();
                    new TransferCommand(simRepository, this::simLockFor, from, to, amountEach, "Sim race transfer").execute();
                    succeeded.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (RuntimeException e) {
                    rejected.incrementAndGet();
                }
            }, "wallet-sim-race-" + i);
            threads[i].start();
        }
        start.countDown();
        for (Thread t : threads) {
            try {
                t.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        double totalAfter = totalBalanceSnapshot(simRepository, this::simLockFor);

        WalletSimEvent event = WalletSimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("RACE").status(totalBefore == totalAfter ? "SUCCESS" : "ERROR")
                .title("Concurrent Transfer Race")
                .description(concurrentTransfers + " simultaneous transfers between wallet " + walletAId + " and wallet " + walletBId
                        + ": " + succeeded.get() + " succeeded, " + rejected.get() + " rejected. Total balance conserved: "
                        + totalBefore + " -> " + totalAfter + ".")
                .build()
                .addDetail("totalBefore", totalBefore)
                .addDetail("totalAfter", totalAfter)
                .addDetail("succeeded", succeeded.get())
                .addDetail("rejected", rejected.get());
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("succeeded", succeeded.get());
        result.put("rejected", rejected.get());
        result.put("totalBefore", totalBefore);
        result.put("totalAfter", totalAfter);
        result.put("conserved", totalBefore == totalAfter);
        result.put("snapshot", getSimSnapshot());
        return result;
    }

    public List<WalletSimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    private WalletSimEvent errorEvent(int step, String type, String title, RuntimeException ex) {
        return WalletSimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType(type).status("ERROR")
                .title(title)
                .description(ex.getMessage())
                .build();
    }
}
