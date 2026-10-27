package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * The interchangeable alternative to {@link GreedyDenominationDispenseStrategy}: instead of
 * minimizing the note count handed to the customer, it minimizes usage of ₹2000 notes, then ₹500,
 * then ₹200, while still finding an exact feasible plan. This spends smaller denominations so
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
        return ExactDenominationPlanner.calculate(amount, availableInventory, DispenseMode.CONSERVE_LARGE_NOTES);
    }
}
