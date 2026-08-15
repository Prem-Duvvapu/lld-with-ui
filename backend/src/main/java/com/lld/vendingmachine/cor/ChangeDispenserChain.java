package com.lld.vendingmachine.cor;

import com.lld.vendingmachine.model.Denomination;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

public class ChangeDispenserChain {
    private final ChangeDispenseHandler chainHead;

    public ChangeDispenserChain() {
        // Construct chain in descending order of value
        DenominationChangeHandler h500 = new DenominationChangeHandler(Denomination.NOTE_500);
        DenominationChangeHandler h100 = new DenominationChangeHandler(Denomination.NOTE_100);
        DenominationChangeHandler h50  = new DenominationChangeHandler(Denomination.NOTE_50);
        DenominationChangeHandler h20  = new DenominationChangeHandler(Denomination.NOTE_20);
        DenominationChangeHandler h10  = new DenominationChangeHandler(Denomination.COIN_10);
        DenominationChangeHandler h5   = new DenominationChangeHandler(Denomination.COIN_5);
        DenominationChangeHandler h2   = new DenominationChangeHandler(Denomination.COIN_2);
        DenominationChangeHandler h1   = new DenominationChangeHandler(Denomination.COIN_1);

        h500.setNext(h100)
            .setNext(h50)
            .setNext(h20)
            .setNext(h10)
            .setNext(h5)
            .setNext(h2)
            .setNext(h1);

        this.chainHead = h500;
    }

    public Map<Denomination, Integer> calculateChange(int amount, Map<Denomination, Integer> availableInventory) {
        Map<Denomination, Integer> changeResult = new EnumMap<>(Denomination.class);
        if (amount <= 0) {
            return changeResult;
        }

        // Create working copy of available inventory to prevent mutation on failure
        Map<Denomination, Integer> inventoryCopy = new HashMap<>(availableInventory);
        chainHead.handle(amount, inventoryCopy, changeResult);
        return changeResult;
    }
}
