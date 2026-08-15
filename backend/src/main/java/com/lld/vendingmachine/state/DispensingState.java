package com.lld.vendingmachine.state;

import com.lld.vendingmachine.exception.InsufficientChangeException;
import com.lld.vendingmachine.exception.InvalidStateException;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.model.*;

import java.util.HashMap;
import java.util.Map;

public class DispensingState implements VendingMachineState {

    @Override
    public void selectProduct(VendingMachine machine, String slotCode) {
        throw new InvalidStateException("Cannot select product: Machine is currently dispensing.");
    }

    @Override
    public void insertMoney(VendingMachine machine, Denomination denomination) {
        throw new InvalidStateException("Cannot insert cash: Machine is currently dispensing.");
    }

    @Override
    public Transaction dispense(VendingMachine machine) {
        Transaction txn = machine.getCurrentTransaction();
        if (txn == null) {
            machine.setCurrentState(machine.getIdleState());
            throw new InvalidStateException("No active transaction to dispense.");
        }

        Slot slot = machine.getSlot(txn.getSlotCode());
        if (slot == null || !slot.isAvailable()) {
            // Out of stock right at dispense time
            txn.setStatus("FAILED");
            txn.setMessage("Dispense failed: Item went out of stock. Refunding cash.");
            // Refund inserted money
            int refundTotal = (int) Math.round(txn.getInsertedAmount());
            if (refundTotal > 0) {
                Map<Denomination, Integer> refundChange = machine.getChangeDispenserChain()
                        .calculateChange(refundTotal, machine.getAvailableChangeSnapshot());
                machine.deductChange(refundChange);
                Map<String, Integer> bMap = new HashMap<>();
                refundChange.forEach((k, v) -> bMap.put(k.name(), v));
                txn.setChangeBreakdown(bMap);
                txn.setChangeAmount(refundTotal);
            }
            machine.getTransactionHistory().add(txn);
            machine.setCurrentTransaction(null);
            machine.setCurrentState(machine.getIdleState());
            throw new OutOfStockException("Item is out of stock in slot " + (slot != null ? slot.getCode() : "unknown"));
        }

        // Calculate change due
        int changeDue = (int) Math.round(txn.getInsertedAmount() - txn.getItemPrice());
        Map<Denomination, Integer> changeBreakdown = new HashMap<>();

        if (changeDue > 0) {
            try {
                changeBreakdown = machine.getChangeDispenserChain()
                        .calculateChange(changeDue, machine.getAvailableChangeSnapshot());
            } catch (InsufficientChangeException ex) {
                // If change cannot be provided, cancel and refund full amount inserted
                txn.setStatus("FAILED");
                txn.setMessage("Dispense failed: Insufficient change in machine cashbox. Refunding ₹" + txn.getInsertedAmount());
                
                int refundTotal = (int) Math.round(txn.getInsertedAmount());
                try {
                    Map<Denomination, Integer> refundChange = machine.getChangeDispenserChain()
                            .calculateChange(refundTotal, machine.getAvailableChangeSnapshot());
                    machine.deductChange(refundChange);
                    Map<String, Integer> bMap = new HashMap<>();
                    refundChange.forEach((k, v) -> bMap.put(k.name(), v));
                    txn.setChangeBreakdown(bMap);
                    txn.setChangeAmount(refundTotal);
                } catch (Exception ignored) {}

                machine.getTransactionHistory().add(txn);
                machine.setCurrentTransaction(null);
                machine.setCurrentState(machine.getIdleState());
                throw ex;
            }
        }

        // Decrement product stock from slot
        slot.decrementStock();

        // Deduct change from machine hopper
        if (!changeBreakdown.isEmpty()) {
            machine.deductChange(changeBreakdown);
        }

        Map<String, Integer> changeBreakdownStr = new HashMap<>();
        changeBreakdown.forEach((k, v) -> changeBreakdownStr.put(k.name(), v));

        txn.setChangeBreakdown(changeBreakdownStr);
        txn.setChangeAmount(changeDue);
        txn.setStatus("DISPENSED");
        txn.setMessage("Product " + txn.getProductName() + " (" + txn.getSlotCode() + ") dispensed successfully! Change returned: ₹" + changeDue);

        machine.getTransactionHistory().add(txn);
        machine.setCurrentTransaction(null);
        machine.setCurrentState(machine.getIdleState());

        return txn;
    }

    @Override
    public Transaction cancelTransaction(VendingMachine machine) {
        throw new InvalidStateException("Cannot cancel transaction while machine is dispensing.");
    }

    @Override
    public String getStateName() {
        return "DISPENSING";
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.DISPENSING;
    }
}
