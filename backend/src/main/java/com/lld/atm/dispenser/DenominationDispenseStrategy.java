package com.lld.atm.dispenser;

import com.lld.atm.model.NoteDenomination;

import java.util.Map;

public interface DenominationDispenseStrategy {
    Map<NoteDenomination, Integer> calculateNotes(int amount, Map<NoteDenomination, Integer> availableInventory);
}
