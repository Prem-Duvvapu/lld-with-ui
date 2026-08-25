package com.lld.digitalwallet;

import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.repository.WalletRepository;
import com.lld.digitalwallet.service.WalletService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards {@link com.lld.digitalwallet.command.TransferCommand}'s ascending-wallet-id lock
 * ordering — the load-bearing property is that no matter how many transfers race, in whatever
 * direction, the sum of the two wallets' balances never drifts by even a cent, and racing
 * opposite-direction transfers never deadlock. Every test here is latch-gated (not sleep-based)
 * so threads genuinely start together instead of merely being likely to overlap.
 */
@DisplayName("Wallet Concurrency — deadlock-free ascending-lock-order transfers")
class WalletConcurrencyTest {

    private WalletService newService() {
        return new WalletService(new WalletRepository());
    }

    @Test
    @DisplayName("40 simultaneous transfers between two wallets: combined total is conserved exactly")
    void concurrentTransfersConserveTotal() throws InterruptedException {
        WalletService service = newService();
        double totalBefore = service.getBalance(1) + service.getBalance(2);

        int threads = 40;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        for (int i = 0; i < threads; i++) {
            boolean aToB = i % 2 == 0;
            long from = aToB ? 1 : 2;
            long to = aToB ? 2 : 1;
            pool.submit(() -> {
                try {
                    start.await();
                    service.sendMoney(from, to, 10.0, "race");
                } catch (RuntimeException expected) {
                    // an occasional InsufficientBalanceException under heavy one-directional
                    // contention is fine — the invariant under test is conservation, not that
                    // every transfer succeeds.
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "transfers did not finish in time — possible deadlock");
        pool.shutdown();

        double totalAfter = service.getBalance(1) + service.getBalance(2);
        assertEquals(totalBefore, totalAfter, 0.0, "combined balance must be conserved exactly");
    }

    @Test
    @DisplayName("200 rounds of opposite-direction transfers (A->B and B->A) racing never deadlock, total conserved")
    void bidirectionalTransfersNeverDeadlockAndConserveTotal() throws InterruptedException {
        WalletService service = newService();
        double totalBefore = service.getBalance(1) + service.getBalance(2);

        int rounds = 200;
        ExecutorService pool = Executors.newFixedThreadPool(20);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(rounds * 2);

        for (int r = 0; r < rounds; r++) {
            pool.submit(() -> {
                try {
                    start.await();
                    service.sendMoney(1, 2, 1.0, "A->B");
                } catch (RuntimeException ignored) {
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    start.await();
                    service.sendMoney(2, 1, 1.0, "B->A");
                } catch (RuntimeException ignored) {
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(15, TimeUnit.SECONDS), "bidirectional transfers deadlocked (or ran too slowly)");
        pool.shutdown();

        double totalAfter = service.getBalance(1) + service.getBalance(2);
        assertEquals(totalBefore, totalAfter, 0.0, "combined balance must be conserved exactly");
    }

    @Test
    @DisplayName("Disjoint wallet pairs transferring concurrently do not corrupt each other's balances")
    void disjointPairsDoNotCorrupt() throws InterruptedException {
        WalletService service = newService();
        Wallet fourth = service.createWallet("user4", "Dana");
        service.addFunds(fourth.getId(), 1000.0, "CARD");

        long[][] pairs = { {1, 2}, {3, fourth.getId()} };
        double totalBefore = 0;
        for (Wallet w : service.getAllWallets()) totalBefore += w.getBalance();

        int perPair = 10;
        ExecutorService pool = Executors.newFixedThreadPool(pairs.length * perPair);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs.length * perPair);

        for (long[] pair : pairs) {
            for (int i = 0; i < perPair; i++) {
                boolean forward = i % 2 == 0;
                long from = forward ? pair[0] : pair[1];
                long to = forward ? pair[1] : pair[0];
                pool.submit(() -> {
                    try {
                        start.await();
                        service.sendMoney(from, to, 1.0, "disjoint");
                    } catch (RuntimeException ignored) {
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "disjoint-pair transfers did not finish in time");
        pool.shutdown();

        double totalAfter = 0;
        for (Wallet w : service.getAllWallets()) totalAfter += w.getBalance();
        assertEquals(totalBefore, totalAfter, 0.0001, "unrelated wallet pairs must not corrupt each other's totals");
    }

    @Test
    @DisplayName("Repeated head-to-head race between two wallets never loses or creates money — 100 rounds")
    void repeatedRaceNeverLosesMoney() throws InterruptedException {
        for (int round = 0; round < 100; round++) {
            WalletService service = newService();
            double totalBefore = service.getBalance(1) + service.getBalance(2);

            ExecutorService pool = Executors.newFixedThreadPool(10);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(10);
            for (int i = 0; i < 10; i++) {
                boolean aToB = i % 2 == 0;
                long from = aToB ? 1 : 2;
                long to = aToB ? 2 : 1;
                pool.submit(() -> {
                    try {
                        start.await();
                        service.sendMoney(from, to, 5.0, "round");
                    } catch (RuntimeException ignored) {
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

            double totalAfter = service.getBalance(1) + service.getBalance(2);
            assertEquals(totalBefore, totalAfter, 0.0, "round " + round + " lost or created money");
        }
    }
}
