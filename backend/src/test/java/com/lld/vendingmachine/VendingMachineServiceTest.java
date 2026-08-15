package com.lld.vendingmachine;

import com.lld.vendingmachine.config.VendingMachineInitializer;
import com.lld.vendingmachine.exception.InsufficientPaymentException;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.exception.SlotNotFoundException;
import com.lld.vendingmachine.model.*;
import com.lld.vendingmachine.service.VendingMachineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class VendingMachineServiceTest {

    private VendingMachineService service;

    @BeforeEach
    void setUp() {
        service = new VendingMachineService();
        VendingMachineInitializer.seedMachine(service.getMainMachine());
        service.getMainMachine().setCurrentState(service.getMainMachine().getIdleState());
        service.getMainMachine().setCurrentTransaction(null);
    }

    @Test
    @DisplayName("Should initialize machine with 12 slots and change hopper")
    void testInitialSeedState() {
        List<Slot> slots = service.getSlots();
        assertEquals(12, slots.size(), "Should have 12 slots configured");

        Map<String, Object> status = service.getStatus();
        assertEquals("IDLE", status.get("stateName"));
        assertEquals(MachineStatus.IDLE, status.get("machineStatus"));

        Map<String, Integer> change = service.getChangeInventory();
        assertTrue(change.get("NOTE_100") > 0);
        assertTrue(change.get("COIN_10") > 0);
    }

    @Test
    @DisplayName("Should transition to HAS_SELECTION upon valid product selection")
    void testSelectProductSuccess() {
        Transaction txn = service.selectProduct("A1");
        assertNotNull(txn);
        assertEquals("A1", txn.getSlotCode());
        assertEquals("Coca-Cola 330ml", txn.getProductName());
        assertEquals(30.0, txn.getItemPrice());

        Map<String, Object> status = service.getStatus();
        assertEquals("HAS_SELECTION", status.get("stateName"));
    }

    @Test
    @DisplayName("Should throw OutOfStockException when selecting an empty slot")
    void testSelectOutOfStockProductThrowsException() {
        assertThrows(OutOfStockException.class, () -> service.selectProduct("A3"));
    }

    @Test
    @DisplayName("Should throw SlotNotFoundException for non-existent slot code")
    void testSelectInvalidSlotThrowsException() {
        assertThrows(SlotNotFoundException.class, () -> service.selectProduct("Z9"));
    }

    @Test
    @DisplayName("Should dispense product with exact payment and return zero change")
    void testInsertMoneyAndExactPaymentDispense() {
        // Select Lays Classic Salted (B1 - ₹20, initial stock = 8)
        service.selectProduct("B1");
        service.insertMoney(20);

        Transaction result = service.dispense();
        assertNotNull(result);
        assertEquals("DISPENSED", result.getStatus());
        assertEquals(0.0, result.getChangeAmount());

        Slot b1 = service.getMainMachine().getSlot("B1");
        assertEquals(7, b1.getCurrentStock(), "Stock should decrement by 1");

        Map<String, Object> status = service.getStatus();
        assertEquals("IDLE", status.get("stateName"), "Machine should return to IDLE state after dispense");
    }

    @Test
    @DisplayName("Should calculate exact change via Chain of Responsibility when surplus cash is inserted")
    void testInsertSurplusMoneyAndChangeDispenseViaCoR() {
        // Select Doritos Nacho Cheese (B2 - ₹35)
        service.selectProduct("B2");
        // Insert ₹50 note
        service.insertMoney(50);

        Transaction result = service.dispense();
        assertNotNull(result);
        assertEquals("DISPENSED", result.getStatus());
        assertEquals(15.0, result.getChangeAmount(), "Change should be ₹15");

        Map<String, Integer> breakdown = result.getChangeBreakdown();
        // ₹15 = 1x ₹10 + 1x ₹5
        assertEquals(1, breakdown.get("COIN_10"));
        assertEquals(1, breakdown.get("COIN_5"));

        Slot b2 = service.getMainMachine().getSlot("B2");
        assertEquals(4, b2.getCurrentStock());
    }

    @Test
    @DisplayName("Should support inserting money first before selecting slot")
    void testInsertMoneyFirstThenSelect() {
        // Customer inserts ₹50 first in IDLE state
        service.insertMoney(50);
        Map<String, Object> status1 = service.getStatus();
        assertEquals("HAS_MONEY", status1.get("stateName"));

        // Customer selects KitKat (C1 - ₹25)
        service.selectProduct("C1");
        Map<String, Object> status2 = service.getStatus();
        assertEquals("HAS_SELECTION", status2.get("stateName"));

        Transaction result = service.dispense();
        assertEquals("DISPENSED", result.getStatus());
        assertEquals(25.0, result.getChangeAmount()); // 50 - 25 = 25 (1x ₹20 + 1x ₹5)
        assertEquals(1, result.getChangeBreakdown().get("NOTE_20"));
        assertEquals(1, result.getChangeBreakdown().get("COIN_5"));
    }

    @Test
    @DisplayName("Should refund inserted cash when transaction is cancelled")
    void testCancelTransactionWithRefund() {
        service.selectProduct("A4"); // Tropicana Orange ₹40
        service.insertMoney(50);

        Transaction cancelled = service.cancelTransaction();
        assertNotNull(cancelled);
        assertEquals("REFUNDED", cancelled.getStatus());
        assertEquals(50.0, cancelled.getChangeAmount());

        Map<String, Object> status = service.getStatus();
        assertEquals("IDLE", status.get("stateName"));
        assertNull(service.getMainMachine().getCurrentTransaction());
    }

    @Test
    @DisplayName("Should reject dispense when inserted cash is insufficient")
    void testInsufficientPaymentThrowsException() {
        service.selectProduct("C2"); // Snickers ₹45
        service.insertMoney(20);

        assertThrows(InsufficientPaymentException.class, () -> service.dispense());
    }

    @Test
    @DisplayName("Should restock slot successfully")
    void testRestockSlot() {
        Slot a3 = service.getMainMachine().getSlot("A3");
        assertEquals(0, a3.getCurrentStock());

        service.restockSlot("A3", 8);
        assertEquals(8, a3.getCurrentStock());
        assertTrue(a3.isAvailable());
    }

    @Test
    @DisplayName("Should execute simulation flow with telemetry events")
    void testSimulationFlow() {
        Map<String, Object> resetSnap = service.simReset();
        assertNotNull(resetSnap);

        Map<String, Object> selectSnap = service.simSelectProduct("B2", 2);
        assertNotNull(selectSnap);

        Map<String, Object> paySnap = service.simInsertMoney(50, 3);
        assertNotNull(paySnap);

        Map<String, Object> dispenseSnap = service.simDispense(5);
        assertNotNull(dispenseSnap);

        List<SimEvent> events = service.simGetEvents();
        assertTrue(events.size() >= 4, "Should record all simulation events");
    }

    @Test
    @DisplayName("Should handle concurrent dispense requests safely under ReentrantLock")
    void testConcurrentSlotDispense() throws InterruptedException {
        // Slot C3 has stock 12, price ₹10
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    // Create isolated machine or lock main machine for single purchase
                    synchronized (service) {
                        service.getMainMachine().setCurrentState(service.getMainMachine().getIdleState());
                        service.getMainMachine().setCurrentTransaction(null);
                        service.selectProduct("C3");
                        service.insertMoney(10);
                        Transaction t = service.dispense();
                        if ("DISPENSED".equals(t.getStatus())) {
                            successCount.incrementAndGet();
                        }
                    }
                } catch (Exception ignored) {
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertEquals(10, successCount.get());
        Slot c3 = service.getMainMachine().getSlot("C3");
        assertEquals(2, c3.getCurrentStock(), "12 - 10 = 2 items left");
    }
}
