package com.lld.vendingmachine;

import com.lld.vendingmachine.config.VendingMachineInitializer;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.model.Slot;
import com.lld.vendingmachine.model.Transaction;
import com.lld.vendingmachine.service.VendingMachineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards against overselling a slot's stock under concurrent purchases.
 *
 * <p>{@link VendingMachineService#selectProduct}, {@code insertMoney} and {@code dispense} are
 * each individually locked, but composing them as three separate calls from concurrent callers
 * is NOT atomic — {@code currentTransaction} is one shared field, so two interleaved customers
 * could stomp each other's in-flight selection. {@link com.lld.vendingmachine.model.VendingMachine#purchase}
 * exists specifically to run select+pay+dispense as one atomic unit under the machine-wide lock,
 * so concurrent purchase attempts queue up like real customers at one physical machine.
 *
 * <p>Deleting the {@code currentState != idleState} guard or the lock in {@code purchase()} must
 * make {@link #concurrentPurchasesOnLimitedStock_neverOversell} fail — exactly stock-count
 * purchases dispense and every excess purchase gets {@link OutOfStockException}, never a
 * duplicate dispense and never negative stock.
 */
@DisplayName("Vending Machine Concurrency — Oversell Prevention")
class VendingMachineConcurrencyTest {

    private VendingMachineService service;

    @BeforeEach
    void setUp() {
        service = new VendingMachineService();
        VendingMachineInitializer.seedMachine(service.getMainMachine());
        service.getMainMachine().setCurrentState(service.getMainMachine().getIdleState());
        service.getMainMachine().setCurrentTransaction(null);
    }

    @Test
    @DisplayName("Concurrent purchases on the SAME slot with limited stock never oversell")
    void concurrentPurchasesOnLimitedStock_neverOversell() throws InterruptedException {
        // Slot B3 (Roasted Almonds, ₹50). Pin stock to a known small value regardless of seed
        // data drift, so the assertions below don't depend on VendingMachineInitializer's numbers.
        Slot slot = service.getMainMachine().getSlot("B3");
        while (slot.getCurrentStock() > 0) {
            slot.decrementStock();
        }
        slot.restock(3);
        int stock = slot.getCurrentStock();
        assertEquals(3, stock, "test setup must pin stock to a known value");

        int attempts = 15;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(attempts);
        AtomicInteger dispensed = new AtomicInteger();
        AtomicInteger outOfStock = new AtomicInteger();
        AtomicInteger otherFailures = new AtomicInteger();

        for (int i = 0; i < attempts; i++) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Transaction txn = service.purchase("B3", List.of(50));
                    if ("DISPENSED".equals(txn.getStatus())) {
                        dispensed.incrementAndGet();
                    }
                } catch (OutOfStockException expected) {
                    outOfStock.incrementAndGet();
                } catch (Exception unexpected) {
                    otherFailures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "purchases did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, otherFailures.get(), "no purchase should fail with anything but OutOfStockException");
        assertEquals(stock, dispensed.get(), "exactly stock-count purchases must succeed");
        assertEquals(attempts - stock, outOfStock.get(), "every excess purchase must be rejected as out of stock");
        assertEquals(0, slot.getCurrentStock(), "stock must land at exactly zero, never negative");
    }

    @Test
    @DisplayName("A single purchase attempt on an empty slot fails cleanly with OutOfStockException")
    void purchaseOnEmptySlotFailsCleanly() {
        Slot slot = service.getMainMachine().getSlot("A3"); // seeded with 0 stock
        assertEquals(0, slot.getCurrentStock());
        assertThrows(OutOfStockException.class, () -> service.purchase("A3", List.of(50)));
    }
}
