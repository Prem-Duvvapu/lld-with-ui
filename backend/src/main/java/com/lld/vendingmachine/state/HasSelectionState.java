package com.lld.vendingmachine.state;

import com.lld.vendingmachine.exception.InsufficientPaymentException;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.exception.ProductNotFoundException;
import com.lld.vendingmachine.exception.SlotNotFoundException;
import com.lld.vendingmachine.model.*;

import java.util.Map;

public class HasSelectionState implements VendingMachineState {

    @Override
    public void selectProduct(VendingMachine machine, String slotCode) {
        Slot slot = machine.getSlot(slotCode);
        if (slot == null) {
            throw new SlotNotFoundException("Slot " + slotCode + " does not exist.");
        }
        Product product = slot.getProduct();
        if (product == null) {
            throw new ProductNotFoundException("No product assigned to slot " + slotCode);
        }
        if (!slot.isAvailable()) {
            throw new OutOfStockException("Product " + product.getName() + " in slot " + slotCode + " is OUT OF STOCK.");
        }

        Transaction txn = machine.getCurrentTransaction();
        if (txn != null) {
            txn.setSlotCode(slotCode);
            txn.setProductId(product.getId());
            txn.setProductName(product.getName());
            txn.setItemPrice(product.getPrice());
            txn.setMessage("Updated selection to " + product.getName() + " (" + slotCode + ") - ₹" + product.getPrice());
        }
    }

    @Override
    public void insertMoney(VendingMachine machine, Denomination denomination) {
        Transaction txn = machine.getCurrentTransaction();
        if (txn == null) {
            machine.setCurrentState(machine.getIdleState());
            return;
        }

        txn.addInsertedDenomination(denomination);
        machine.addCash(denomination);

        double remaining = txn.getItemPrice() - txn.getInsertedAmount();
        if (remaining > 0) {
            txn.setMessage("Inserted ₹" + denomination.getValue() + ". Please insert ₹" + remaining + " more.");
        } else {
            txn.setMessage("Payment complete! Ready to dispense. (Change due: ₹" + Math.abs(remaining) + ")");
        }
    }

    @Override
    public Transaction dispense(VendingMachine machine) {
        Transaction txn = machine.getCurrentTransaction();
        if (txn == null) {
            machine.setCurrentState(machine.getIdleState());
            throw new InsufficientPaymentException("No active transaction found.");
        }

        if (txn.getInsertedAmount() < txn.getItemPrice()) {
            double shortfall = txn.getItemPrice() - txn.getInsertedAmount();
            throw new InsufficientPaymentException("Insufficient payment: Inserted ₹" + txn.getInsertedAmount() + ", required ₹" + txn.getItemPrice() + " (Shortfall: ₹" + shortfall + ")");
        }

        // Transition to DispensingState and execute dispense
        machine.setCurrentState(machine.getDispensingState());
        return machine.getDispensingState().dispense(machine);
    }

    @Override
    public Transaction cancelTransaction(VendingMachine machine) {
        Transaction txn = machine.getCurrentTransaction();
        if (txn == null) {
            machine.setCurrentState(machine.getIdleState());
            Transaction idle = new Transaction();
            idle.setStatus("IDLE");
            return idle;
        }

        if (txn.getInsertedAmount() > 0) {
            // Calculate and refund inserted amount
            int refundTotal = (int) Math.round(txn.getInsertedAmount());
            Map<Denomination, Integer> refundBreakdown = machine.getChangeDispenserChain()
                    .calculateChange(refundTotal, machine.getAvailableChangeSnapshot());
            machine.deductChange(refundBreakdown);

            Map<String, Integer> breakdownStr = new java.util.HashMap<>();
            refundBreakdown.forEach((k, v) -> breakdownStr.put(k.name(), v));
            txn.setChangeBreakdown(breakdownStr);
            txn.setChangeAmount(refundTotal);
            txn.setStatus("REFUNDED");
            txn.setMessage("Transaction cancelled. Full refund of ₹" + refundTotal + " dispensed.");
        } else {
            txn.setStatus("CANCELLED");
            txn.setMessage("Selection cancelled. No payment was inserted.");
        }

        machine.getTransactionHistory().add(txn);
        machine.setCurrentTransaction(null);
        machine.setCurrentState(machine.getIdleState());
        return txn;
    }

    @Override
    public String getStateName() {
        return "HAS_SELECTION";
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.PRODUCT_SELECTED;
    }
}
