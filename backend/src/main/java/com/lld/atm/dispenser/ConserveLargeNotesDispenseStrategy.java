package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The interchangeable alternative to {@link GreedyDenominationDispenseStrategy}: instead of
 * minimizing the note count handed to the customer, it spends the smallest denominations first so
 * the ATM's ₹2000/₹500 reserve depletes slower — useful for a terminal that mostly serves small
 * withdrawals and needs its big notes to still be there for the occasional large one.
 *
 * <p>Still has to land on the exact requested amount using only what is in {@code
 * availableInventory} — a request it cannot fulfil exactly throws {@link InsufficientCashException}
 * just like the greedy strategy, it just tries a different note mix first.
 */
@Component
public class ConserveLargeNotesDispenseStrategy implements DenominationDispenseStrategy {

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

        // Ascending value order (₹100 -> ₹200 -> ₹500 -> ₹2000): opposite of the greedy strategy,
        // so smaller notes are consumed first and the largest denomination is the last resort.
        NoteDenomination[] ascending = NoteDenomination.values();
        for (int i = ascending.length - 1; i >= 0; i--) {
            NoteDenomination denom = ascending[i];
            int denomValue = denom.getValue();
            int available = availableInventory.getOrDefault(denom, 0);

            int needed = remaining / denomValue;
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
