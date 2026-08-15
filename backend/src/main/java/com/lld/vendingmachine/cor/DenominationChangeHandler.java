package com.lld.vendingmachine.cor;

import com.lld.vendingmachine.exception.InsufficientChangeException;
import com.lld.vendingmachine.model.Denomination;
import java.util.Map;

public class DenominationChangeHandler extends ChangeDispenseHandler {

    public DenominationChangeHandler(Denomination denomination) {
        super(denomination);
    }

    @Override
    public void handle(int remainingAmount, Map<Denomination, Integer> availableInventory, Map<Denomination, Integer> dispensedBreakdown) {
        if (remainingAmount <= 0) {
            return;
        }

        int denomVal = denomination.getValue();
        int needed = remainingAmount / denomVal;

        if (needed > 0) {
            int available = availableInventory.getOrDefault(denomination, 0);
            int toDispense = Math.min(needed, available);

            if (toDispense > 0) {
                dispensedBreakdown.put(denomination, toDispense);
                remainingAmount -= toDispense * denomVal;
                // Decrement from working copy of available inventory
                availableInventory.put(denomination, available - toDispense);
            }
        }

        if (remainingAmount > 0) {
            if (nextHandler != null) {
                nextHandler.handle(remainingAmount, availableInventory, dispensedBreakdown);
            } else {
                throw new InsufficientChangeException("Unable to provide exact change: ₹" + remainingAmount + " could not be dispensed from available coin/note inventory.");
            }
        }
    }
}
