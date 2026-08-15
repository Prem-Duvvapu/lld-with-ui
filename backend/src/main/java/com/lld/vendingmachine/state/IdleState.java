package com.lld.vendingmachine.state;

import com.lld.vendingmachine.exception.InvalidStateException;
import com.lld.vendingmachine.exception.OutOfStockException;
import com.lld.vendingmachine.exception.ProductNotFoundException;
import com.lld.vendingmachine.exception.SlotNotFoundException;
import com.lld.vendingmachine.model.*;

public class IdleState implements VendingMachineState {

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

        Transaction txn = new Transaction(
            machine.nextTransactionId(),
            slotCode,
            product.getId(),
            product.getName(),
            product.getPrice()
        );
        machine.setCurrentTransaction(txn);
        machine.setCurrentState(machine.getHasSelectionState());
    }

    @Override
    public void insertMoney(VendingMachine machine, Denomination denomination) {
        // Customer inserts money first before choosing an item
        Transaction txn = new Transaction(
            machine.nextTransactionId(),
            null,
            null,
            "Unselected Item",
            0.0
        );
        txn.addInsertedDenomination(denomination);
        machine.addCash(denomination);
        machine.setCurrentTransaction(txn);
        machine.setCurrentState(machine.getHasMoneyState());
    }

    @Override
    public Transaction dispense(VendingMachine machine) {
        throw new InvalidStateException("Cannot dispense: Machine is IDLE. Please select a product and insert payment.");
    }

    @Override
    public Transaction cancelTransaction(VendingMachine machine) {
        Transaction idleTxn = new Transaction();
        idleTxn.setStatus("IDLE");
        idleTxn.setMessage("No active transaction to cancel.");
        return idleTxn;
    }

    @Override
    public String getStateName() {
        return "IDLE";
    }

    @Override
    public MachineStatus getStatus() {
        return MachineStatus.IDLE;
    }
}
