package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GreedyDenominationDispenseStrategy implements DenominationDispenseStrategy {

    @Override
    public Map<NoteDenomination, Integer> calculateNotes(int amount, Map<NoteDenomination, Integer> availableInventory) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than 0");
        }
        if (amount % 100 != 0) {
            throw new InsufficientCashException("Amount must be a multiple of ₹100");
        }

        Map<NoteDenomination, Integer> result = new LinkedHashMap<>();
        int remaining = amount;

        // Iterate through note denominations in descending order: 2000 -> 500 -> 200 -> 100
        NoteDenomination[] denominations = NoteDenomination.values();
        for (NoteDenomination denom : denominations) {
            int denomValue = denom.getValue();
            int needed = remaining / denomValue;
            int available = availableInventory.getOrDefault(denom, 0);

            int take = Math.min(needed, available);
            if (take > 0) {
                result.put(denom, take);
                remaining -= take * denomValue;
            }
        }

        if (remaining != 0) {
            throw new InsufficientCashException(String.format(
                    "Cannot dispense exact amount ₹%d using available note denominations! Remaining unfulfilled: ₹%d",
                    amount, remaining));
        }

        return result;
    }
}
