package com.lld.vendingmachine.cor;

import com.lld.vendingmachine.model.Denomination;
import java.util.Map;

public abstract class ChangeDispenseHandler {
    protected ChangeDispenseHandler nextHandler;
    protected final Denomination denomination;

    public ChangeDispenseHandler(Denomination denomination) {
        this.denomination = denomination;
    }

    public ChangeDispenseHandler setNext(ChangeDispenseHandler nextHandler) {
        this.nextHandler = nextHandler;
        return nextHandler;
    }

    public abstract void handle(int remainingAmount, Map<Denomination, Integer> availableInventory, Map<Denomination, Integer> dispensedBreakdown);
}
