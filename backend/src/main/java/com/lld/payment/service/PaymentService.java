package com.lld.payment.service;

import com.lld.payment.exception.FraudCheckFailedException;
import com.lld.payment.exception.InvalidRefundException;
import com.lld.payment.fraud.FraudCheckChainFactory;
import com.lld.payment.fraud.FraudCheckContext;
import com.lld.payment.fraud.FraudCheckResult;
import com.lld.payment.model.*;
import com.lld.payment.repository.PaymentRepository;
import com.lld.payment.strategy.PaymentGatewayProcessor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade for the payment gateway. {@link #charge} is the concurrency centerpiece: a client
 * retrying the same {@code idempotencyKey} (e.g. after a timeout) must never be charged twice.
 *
 * <p>The fix mirrors {@code shoppingcart.service.ShoppingCartService#placeOrder}'s idempotency
 * handling exactly, per RCA-053's lesson: a check-then-act idempotency lock that dedupes
 * <em>which record</em> two racing callers agree on is not the same guarantee as deduping
 * <em>which caller gets to act on it afterward</em>. A lazily-created lock object per
 * idempotency key wraps the whole "check cache → do the charge → populate cache" sequence, so two
 * concurrent retries sharing the same key can never both observe a cache miss and both run
 * {@link #doCharge}. A lock-free {@code ConcurrentHashMap.putIfAbsent} claim was considered and
 * rejected: it can only atomically claim <em>that a</em> payment id owns the key, not that the
 * actual {@link Payment} behind it has finished being created — a loser could read a "claimed"
 * key before the winner ever calls {@code repository.save}.
 *
 * <p>{@link #refund} is the second race: two concurrent refund attempts on the same payment must
 * serialize on that payment's own {@link ReentrantLock}, with the state machine rejecting the
 * loser's transition rather than double-crediting.
 */
@Service
public class PaymentService {

    private final PaymentRepository repository;
    private final FraudCheckChainFactory chainFactory;
    private final PaymentGatewayProcessor paymentProcessor;
    private final AtomicLong paymentIdGen = new AtomicLong(1001);
    private final Map<String, Payment> idempotencyCache = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, Object> idempotencyKeyLocks = new java.util.concurrent.ConcurrentHashMap<>();

    private static final long VELOCITY_WINDOW_MILLIS = 10_000;

    // Isolated Simulation Engine State
    private final PaymentRepository simRepository = new PaymentRepository();
    private final AtomicLong simPaymentIdGen = new AtomicLong(1);
    private final Map<String, Payment> simIdempotencyCache = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, Object> simIdempotencyKeyLocks = new java.util.concurrent.ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public PaymentService(PaymentRepository repository, FraudCheckChainFactory chainFactory, PaymentGatewayProcessor paymentProcessor) {
        this.repository = repository;
        this.chainFactory = chainFactory;
        this.paymentProcessor = paymentProcessor;
        initSimState();
    }

    public Payment charge(String idempotencyKey, String payerId, double amount, PaymentMethodType method) {
        return chargeWithIdempotency(repository, idempotencyCache, idempotencyKeyLocks, paymentIdGen, idempotencyKey, payerId, amount, method);
    }

    private Payment chargeWithIdempotency(PaymentRepository targetRepo, Map<String, Payment> cache, Map<String, Object> locks,
                                           AtomicLong idGen, String idempotencyKey, String payerId, double amount, PaymentMethodType method) {
        boolean hasKey = idempotencyKey != null && !idempotencyKey.isBlank();
        if (!hasKey) {
            return doCharge(targetRepo, idGen, payerId, amount, method);
        }

        Object keyLock = locks.computeIfAbsent(idempotencyKey, k -> new Object());
        synchronized (keyLock) {
            Payment cached = cache.get(idempotencyKey);
            if (cached != null) {
                return cached;
            }
            Payment payment = doCharge(targetRepo, idGen, payerId, amount, method);
            cache.put(idempotencyKey, payment);
            return payment;
        }
    }

    private Payment doCharge(PaymentRepository targetRepo, AtomicLong idGen, String payerId, double amount, PaymentMethodType method) {
        long now = System.currentTimeMillis();
        String id = "PAY-" + idGen.getAndIncrement();
        Payment payment = new Payment(id, null, payerId, amount, method, now);
        targetRepo.save(payment);

        long windowStart = now - VELOCITY_WINDOW_MILLIS;
        int recentCount = (int) targetRepo.getByPayer(payerId).stream()
                .filter(p -> p.getCreatedAtEpoch() >= windowStart)
                .count();
        FraudCheckResult result = chainFactory.run(new FraudCheckContext(payerId, amount, method, recentCount));

        payment.getLock().lock();
        try {
            if (!result.isApproved()) {
                payment.transitionTo(PaymentStatus.FAILED);
                payment.setFailureReason(result.getRejectionReason());
                throw new FraudCheckFailedException(result.getRejectionReason());
            }
            payment.transitionTo(PaymentStatus.AUTHORIZED);
            String txId = paymentProcessor.process(id, amount, method);
            payment.setTransactionId(txId);
            payment.transitionTo(PaymentStatus.CAPTURED);
        } finally {
            payment.getLock().unlock();
        }
        return payment;
    }

    public Payment getPayment(String paymentId) {
        return repository.get(paymentId);
    }

    public Payment refund(String paymentId) {
        return doRefund(repository, paymentId);
    }

    private Payment doRefund(PaymentRepository targetRepo, String paymentId) {
        Payment payment = targetRepo.get(paymentId);
        payment.getLock().lock();
        try {
            if (payment.getStatus() != PaymentStatus.CAPTURED) {
                throw new InvalidRefundException("Cannot refund payment " + paymentId + " in status " + payment.getStatus());
            }
            payment.transitionTo(PaymentStatus.REFUNDED);
            payment.setRefundedAtEpoch(System.currentTimeMillis());
        } finally {
            payment.getLock().unlock();
        }
        return payment;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simIdempotencyCache.clear();
        simIdempotencyKeyLocks.clear();
        simEventLog.clear();
        logSimEvent("SIM_RESET", "System", "Initialized sandbox — empty payment ledger", null);
    }

    public Map<String, Object> simCharge(String idempotencyKey, String payerId, double amount, PaymentMethodType method) {
        trySimCharge(idempotencyKey, payerId, amount, method);
        return getSimSnapshots();
    }

    /** Not {@code synchronized} — see {@link #simRace}: every racing thread must genuinely run this
     *  concurrently, with only the per-idempotency-key lock (inside {@link #chargeWithIdempotency})
     *  serializing the contested case. A method-level lock here would fake the race entirely — the
     *  exact mistake caught and fixed in this portfolio's locker module, see RCA-058. */
    private Optional<Payment> trySimCharge(String idempotencyKey, String payerId, double amount, PaymentMethodType method) {
        try {
            Payment payment = chargeWithIdempotency(simRepository, simIdempotencyCache, simIdempotencyKeyLocks,
                    simPaymentIdGen, idempotencyKey, payerId, amount, method);
            logSimEvent("CHARGE", payerId, String.format("Charged %.2f via %s -> %s (payment %s)", amount, method, payment.getStatus(), payment.getId()), null);
            return Optional.of(payment);
        } catch (FraudCheckFailedException e) {
            logSimEvent("CHARGE_REJECTED", payerId, "FRAUD CHECK FAILED: " + e.getMessage(), null);
            return Optional.empty();
        }
    }

    public Map<String, Object> simRefund(String paymentId) {
        try {
            Payment payment = doRefund(simRepository, paymentId);
            logSimEvent("REFUND", payment.getPayerId(), String.format("Refunded payment %s", payment.getId()), null);
        } catch (InvalidRefundException e) {
            logSimEvent("REFUND_REJECTED", "Unknown", e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    public Map<String, Object> simDoubleSubmitRace(String idempotencyKey, String payerId, double amount, PaymentMethodType method, int attempts) throws InterruptedException {
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(attempts);
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(attempts);
        Set<String> distinctPaymentIds = java.util.Collections.newSetFromMap(new java.util.concurrent.ConcurrentHashMap<>());
        Set<String> distinctTransactionIds = java.util.Collections.newSetFromMap(new java.util.concurrent.ConcurrentHashMap<>());

        for (int i = 0; i < attempts; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    Optional<Payment> result = trySimCharge(idempotencyKey, payerId, amount, method);
                    result.ifPresent(p -> {
                        distinctPaymentIds.add(p.getId());
                        if (p.getTransactionId() != null) distinctTransactionIds.add(p.getTransactionId());
                    });
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        Map<String, Object> details = new HashMap<>();
        details.put("attempts", attempts);
        details.put("distinctPaymentsCreated", distinctPaymentIds.size());
        details.put("distinctTransactionIds", distinctTransactionIds.size());
        logSimEvent("RACE_COMPLETE", payerId, String.format(
                "%d concurrent charges with the SAME idempotency key -- exactly %d payment(s) created, %d distinct transaction id(s)",
                attempts, distinctPaymentIds.size(), distinctTransactionIds.size()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("payments", simRepository.getAll());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
