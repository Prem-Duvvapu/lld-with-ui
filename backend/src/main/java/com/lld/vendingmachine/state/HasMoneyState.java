package com.lld.vendingmachine.state;

import com.lld.vendingmachine.exception.InvalidStateException;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.exception.ProductNotFoundException;
import com.lld.vendingmachine.exception.SlotNotFoundException;
import com.lld.vendingmachine.model.*;

import java.util.Map;

public class HasMoneyState implements VendingMachineState {

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

            double remaining = product.getPrice() - txn.getInsertedAmount();
            if (remaining > 0) {
                txn.setMessage("Selected " + product.getName() + " (" + slotCode + ") - ₹" + product.getPrice() + ". Please insert ₹" + remaining + " more.");
            } else {
                txn.setMessage("Selected " + product.getName() + " (" + slotCode + ") - ₹" + product.getPrice() + ". Payment ready! (Change due: ₹" + Math.abs(remaining) + ")");
            }
        }

        machine.setCurrentState(machine.getHasSelectionState());
    }

    @Override
    public void insertMoney(VendingMachine machine, Denomination denomination) {
        Transaction txn = machine.getCurrentTransaction();
        if (txn != null) {
            txn.addInsertedDenomination(denomination);
            machine.addCash(denomination);
            txn.setMessage("Inserted ₹" + denomination.getValue() + ". Total credit: ₹" + txn.getInsertedAmount());
        }
    }

    @Override
    public Transaction dispense(VendingMachine machine) {
        throw new InvalidStateException("Cannot dispense: Please select a product first.");
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

        int refundTotal = (int) Math.round(txn.getInsertedAmount());
        if (refundTotal > 0) {
            Map<Denomination, Integer> refundBreakdown = machine.getChangeDispenserChain()
                    .calculateChange(refundTotal, machine.getAvailableChangeSnapshot());
            machine.deductChange(refundBreakdown);

            Map<String, Integer> breakdownStr = new java.util.HashMap<>();
            refundBreakdown.forEach((k, v) -> breakdownStr.put(k.name(), v));
            txn.setChangeBreakdown(breakdownStr);
            txn.setChangeAmount(refundTotal);
            txn.setStatus("REFUNDED");
            txn.setMessage("Refund dispensed: ₹" + refundTotal);
        } else {
            txn.setStatus("CANCELLED");
        }

        machine.getTransactionHistory().add(txn);
        machine.setCurrentTransaction(null);
        machine.setCurrentState(machine.getIdleState());
        return txn;
    }

    @Override
    public String getStateName() {
        return "HAS_MONEY";
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.PAYMENT_PENDING;
    }
}
