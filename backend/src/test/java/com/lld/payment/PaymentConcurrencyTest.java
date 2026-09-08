package com.lld.payment;

import com.lld.payment.exception.InvalidRefundException;
import com.lld.payment.fraud.*;
import com.lld.payment.model.Payment;
import com.lld.payment.model.PaymentMethodType;
import com.lld.payment.repository.PaymentRepository;
import com.lld.payment.service.PaymentService;
import com.lld.payment.strategy.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code PaymentService#charge}'s idempotency-key lock and {@code #refund}'s per-payment
 * lock actually close the races this module is built around.
 */
public class PaymentConcurrencyTest {

    private static PaymentService newService() {
        FraudCheckChainFactory chainFactory = new FraudCheckChainFactory(
                new VelocityCheckHandler(), new BlacklistCheckHandler(), new AmountLimitHandler());
        PaymentGatewayProcessor processor = new PaymentGatewayProcessor(List.of(
                new CreditCardPaymentMethodStrategy(), new UpiPaymentMethodStrategy(), new WalletPaymentMethodStrategy()));
        return new PaymentService(new PaymentRepository(), chainFactory, processor);
    }

    @Test
    @DisplayName("Repeated double-submit race never charges twice — 300 rounds")
    void repeatedDoubleSubmitRaceNeverChargesTwice() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            PaymentService service = newService();
            int attempts = 4;

            ExecutorService pool = Executors.newFixedThreadPool(attempts);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(attempts);
            Set<String> distinctPaymentIds = ConcurrentHashMap.newKeySet();
            Set<String> distinctTransactionIds = ConcurrentHashMap.newKeySet();

            for (int i = 0; i < attempts; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        Payment payment = service.charge("IDEMP-SAME", "payer-race", 500.0, PaymentMethodType.UPI);
                        distinctPaymentIds.add(payment.getId());
                        distinctTransactionIds.add(payment.getTransactionId());
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, distinctPaymentIds.size(), "round " + round + ": every concurrent retry of the SAME idempotency key must return the SAME payment");
            assertEquals(1, distinctTransactionIds.size(), "round " + round + ": the underlying charge must only ever be processed once");
        }
    }

    @Test
    @DisplayName("Distinct idempotency keys never contend with each other")
    void distinctIdempotencyKeysAllSucceedIndependently() throws InterruptedException {
        PaymentService service = newService();
        int n = 10;

        // Distinct payers, not just distinct keys: the SAME payer firing 10 concurrent charges
        // would legitimately trip VelocityCheckHandler (a real, separate business rule already
        // covered by PaymentServiceTest) -- that would conflate "the idempotency lock blocks
        // unrelated keys" with "the velocity limit rejects a burst," which is not what this test
        // is about. Each thread here gets its own payer, so nothing but the (correctly
        // independent) per-key lock can affect the outcome.
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger succeeded = new AtomicInteger();

        for (int i = 0; i < n; i++) {
            String key = "IDEMP-" + i;
            String payer = "payer-disjoint-" + i;
            pool.submit(() -> {
                try {
                    start.await();
                    service.charge(key, payer, 100.0, PaymentMethodType.UPI);
                    succeeded.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(n, succeeded.get(), "distinct idempotency keys must never block each other");
    }

    @Test
    @DisplayName("Repeated concurrent refund race never double-refunds — 300 rounds")
    void repeatedConcurrentRefundRaceNeverDoubleRefunds() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            PaymentService service = newService();
            Payment payment = service.charge("K-" + round, "payer-refund", 1000.0, PaymentMethodType.CREDIT_CARD);
            int attempts = 4;

            ExecutorService pool = Executors.newFixedThreadPool(attempts);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(attempts);
            AtomicInteger wins = new AtomicInteger();

            for (int i = 0; i < attempts; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        service.refund(payment.getId());
                        wins.incrementAndGet();
                    } catch (InvalidRefundException expected) {
                        // the loser -- exactly right
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " successful refunds instead of 1");
        }
    }
}
