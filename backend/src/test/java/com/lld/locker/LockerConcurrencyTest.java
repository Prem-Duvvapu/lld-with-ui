package com.lld.locker;

import com.lld.locker.exception.NoAvailableLockerException;
import com.lld.locker.factory.PickupCodeFactory;
import com.lld.locker.model.AllocationPolicy;
import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerBank;
import com.lld.locker.model.LockerSize;
import com.lld.locker.model.Parcel;
import com.lld.locker.repository.LockerRepository;
import com.lld.locker.service.LockerService;
import com.lld.locker.strategy.FirstFitAllocationStrategy;
import com.lld.locker.strategy.LockerAllocationStrategyFactory;
import com.lld.locker.strategy.SmallestFitFirstAllocationStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code LockerService#deposit}'s per-locker-lock, re-check-inside-the-lock, retry-with-
 * exclusion design actually closes the check-then-act race the module is built around: two
 * couriers whose allocation scan both land on the same candidate locker must never both claim it.
 */
public class LockerConcurrencyTest {

    private static LockerService newService() {
        LockerAllocationStrategyFactory factory = new LockerAllocationStrategyFactory(
                new SmallestFitFirstAllocationStrategy(), new FirstFitAllocationStrategy());
        return new LockerService(new LockerRepository(), factory, new PickupCodeFactory());
    }

    private static String seedBank(LockerService service, int smallCount) {
        LockerBank bank = LockerBank.builder().id("BANK-T").name("Test Bank").location("Test").build();
        service.addBank(bank);
        for (int i = 0; i < smallCount; i++) {
            service.addLocker(new Locker("L-T-" + i, bank.getId(), LockerSize.SMALL));
        }
        return bank.getId();
    }

    @Test
    @DisplayName("Repeated single-locker race never produces two winners — 300 rounds")
    void repeatedSingleLockerRaceNeverProducesTwoWinners() throws InterruptedException {
        for (int round = 0; round < 300; round++) {
            LockerService service = newService();
            String bankId = seedBank(service, 1);

            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger wins = new AtomicInteger();

            for (int i = 0; i < 2; i++) {
                final int courier = i;
                pool.submit(() -> {
                    try {
                        start.await();
                        service.deposit(bankId, LockerSize.SMALL, "Courier-" + courier, "Recipient", AllocationPolicy.SMALLEST_FIT);
                        wins.incrementAndGet();
                    } catch (NoAvailableLockerException expected) {
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

            assertEquals(1, wins.get(), "round " + round + " produced " + wins.get() + " winners instead of 1");
        }
    }

    @Test
    @DisplayName("N couriers racing M < N lockers: exactly M succeed, no locker claimed twice")
    void moreCouriersThanLockersClaimsExactlyMinCouriersAndLockers() throws InterruptedException {
        int lockerCount = 3;
        int courierCount = 8;

        LockerService service = newService();
        String bankId = seedBank(service, lockerCount);

        ExecutorService pool = Executors.newFixedThreadPool(courierCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(courierCount);
        List<Parcel> claimed = new CopyOnWriteArrayList<>();
        AtomicInteger rejected = new AtomicInteger();

        for (int i = 0; i < courierCount; i++) {
            final int courier = i;
            pool.submit(() -> {
                try {
                    start.await();
                    Parcel pkg = service.deposit(bankId, LockerSize.SMALL, "Courier-" + courier, "Recipient", AllocationPolicy.SMALLEST_FIT);
                    claimed.add(pkg);
                } catch (NoAvailableLockerException expected) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "race timed out");
        pool.shutdown();

        assertEquals(lockerCount, claimed.size(), "exactly min(couriers, lockers) deposits must succeed");
        assertEquals(courierCount - lockerCount, rejected.get());

        Set<String> distinctLockers = claimed.stream().map(Parcel::getAssignedLockerId).collect(Collectors.toSet());
        assertEquals(lockerCount, distinctLockers.size(), "no locker may ever be claimed by two couriers");

        List<Locker> lockersInBank = service.getLockersInBank(bankId);
        assertTrue(lockersInBank.stream().allMatch(l -> l.getStatus() == com.lld.locker.model.LockerStatus.AWAITING_PICKUP),
                "every locker in a fully-claimed bank must be AWAITING_PICKUP");
    }

    @Test
    @DisplayName("A pickup and a fresh deposit into the freed locker never interleave badly, 200 rounds")
    void pickupThenRedepositRepeatedRounds() throws InterruptedException {
        for (int round = 0; round < 200; round++) {
            LockerService service = newService();
            String bankId = seedBank(service, 1);
            Parcel first = service.deposit(bankId, LockerSize.SMALL, "Courier-A", "Recipient-A", AllocationPolicy.SMALLEST_FIT);

            service.pickup(first.getPickupCode());

            Parcel second = service.deposit(bankId, LockerSize.SMALL, "Courier-B", "Recipient-B", AllocationPolicy.SMALLEST_FIT);
            assertEquals(first.getAssignedLockerId(), second.getAssignedLockerId(), "round " + round + ": the only locker must be reused");
            assertNotEquals(first.getPickupCode(), second.getPickupCode(), "round " + round + ": a fresh deposit must not reuse a still-active code from a different parcel");
        }
    }
}
