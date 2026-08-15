package com.lld.vendingmachine.model;

import com.lld.vendingmachine.cor.ChangeDispenserChain;
import com.lld.vendingmachine.exception.*;
import com.lld.vendingmachine.state.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class VendingMachine {
    private final String machineId;
    private final Map<String, Slot> slots = new ConcurrentHashMap<>();
    private final Map<Denomination, AtomicInteger> changeInventory = new ConcurrentHashMap<>();
    private final AtomicLong cashboxBalance = new AtomicLong(0);
    private final List<Transaction> transactionHistory = new CopyOnWriteArrayList<>();
    private final AtomicLong transactionIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();
    private final ChangeDispenserChain changeDispenserChain = new ChangeDispenserChain();

    // State instances
    private final IdleState idleState;
    private final HasSelectionState hasSelectionState;
    private final HasMoneyState hasMoneyState;
    private final DispensingState dispensingState;

    private volatile VendingMachineState currentState;
    private volatile Transaction currentTransaction;

    public VendingMachine(String machineId) {
        this.machineId = machineId;
        this.idleState = new IdleState();
        this.hasSelectionState = new HasSelectionState();
        this.hasMoneyState = new HasMoneyState();
        this.dispensingState = new DispensingState();
        this.currentState = this.idleState;

        // Initialize change inventory with 0 counts
        for (Denomination d : Denomination.values()) {
            this.changeInventory.put(d, new AtomicInteger(0));
        }
    }

    public String getMachineId() { return machineId; }

    public VendingMachineState getCurrentState() { return currentState; }
    public void setCurrentState(VendingMachineState currentState) { this.currentState = currentState; }

    public IdleState getIdleState() { return idleState; }
    public HasSelectionState getHasSelectionState() { return hasSelectionState; }
    public HasMoneyState getHasMoneyState() { return hasMoneyState; }
    public DispensingState getDispensingState() { return dispensingState; }

    public Transaction getCurrentTransaction() { return currentTransaction; }
    public void setCurrentTransaction(Transaction currentTransaction) { this.currentTransaction = currentTransaction; }

    public Map<String, Slot> getSlots() { return slots; }
    public Map<Denomination, AtomicInteger> getChangeInventory() { return changeInventory; }
    public List<Transaction> getTransactionHistory() { return transactionHistory; }
    public ReentrantLock getLock() { return lock; }
    public ChangeDispenserChain getChangeDispenserChain() { return changeDispenserChain; }
    public long getCashboxBalance() { return cashboxBalance.get(); }

    public long nextTransactionId() {
        return transactionIdGen.getAndIncrement();
    }

    public void addSlot(Slot slot) {
        slots.put(slot.getCode(), slot);
    }

    public Slot getSlot(String code) {
        return slots.get(code);
    }

    public void refillChange(Denomination denomination, int count) {
        lock.lock();
        try {
            changeInventory.computeIfAbsent(denomination, k -> new AtomicInteger(0)).addAndGet(count);
            cashboxBalance.addAndGet((long) denomination.getValue() * count);
        } finally {
            lock.unlock();
        }
    }

    public Map<Denomination, Integer> getAvailableChangeSnapshot() {
        Map<Denomination, Integer> snapshot = new EnumMap<>(Denomination.class);
        for (Map.Entry<Denomination, AtomicInteger> entry : changeInventory.entrySet()) {
            snapshot.put(entry.getKey(), entry.getValue().get());
        }
        return snapshot;
    }

    public void deductChange(Map<Denomination, Integer> changeBreakdown) {
        for (Map.Entry<Denomination, Integer> entry : changeBreakdown.entrySet()) {
            AtomicInteger count = changeInventory.get(entry.getKey());
            if (count != null) {
                count.addAndGet(-entry.getValue());
                cashboxBalance.addAndGet(-((long) entry.getKey().getValue() * entry.getValue()));
            }
        }
    }

    public void addCash(Denomination denomination) {
        changeInventory.computeIfAbsent(denomination, k -> new AtomicInteger(0)).incrementAndGet();
        cashboxBalance.addAndGet(denomination.getValue());
    }

    // State Pattern Delegated Operations
    public void selectProduct(String slotCode) {
        lock.lock();
        try {
            currentState.selectProduct(this, slotCode);
        } finally {
            lock.unlock();
        }
    }

    public void insertMoney(Denomination denomination) {
        lock.lock();
        try {
            currentState.insertMoney(this, denomination);
        } finally {
            lock.unlock();
        }
    }

    public Transaction dispense() {
        lock.lock();
        try {
            return currentState.dispense(this);
        } finally {
            lock.unlock();
        }
    }

    public Transaction cancelTransaction() {
        lock.lock();
        try {
            return currentState.cancelTransaction(this);
        } finally {
            lock.unlock();
        }
    }

    public void restockSlot(String slotCode, int quantity) {
        lock.lock();
        try {
            Slot slot = slots.get(slotCode);
            if (slot == null) {
                throw new SlotNotFoundException("Slot " + slotCode + " does not exist.");
            }
            slot.restock(quantity);
        } finally {
            lock.unlock();
        }
    }
}
