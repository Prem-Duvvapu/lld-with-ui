package com.lld.atm.dispenser;

import com.lld.atm.model.NoteDenomination;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Historical strategy name retained for callers; bounded stock requires exact planning. */
@Component
public class GreedyDenominationDispenseStrategy implements DenominationDispenseStrategy {

    @Override
    public Map<NoteDenomination, Integer> calculateNotes(int amount, Map<NoteDenomination, Integer> availableInventory) {
        return ExactDenominationPlanner.calculate(amount, availableInventory, DispenseMode.MINIMIZE_NOTES);
    }
}
