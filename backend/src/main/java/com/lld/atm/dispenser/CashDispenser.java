package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Component
public class CashDispenser {

    private final Map<NoteDenomination, Integer> noteInventory = new ConcurrentHashMap<>();
    private final ReentrantLock dispenserLock = new ReentrantLock(true);
    private final DenominationDispenseStrategy dispenseStrategy;

    public CashDispenser(DenominationDispenseStrategy dispenseStrategy) {
        this.dispenseStrategy = dispenseStrategy;
        initDefaultInventory();
    }

    public void initDefaultInventory() {
        dispenserLock.lock();
        try {
            noteInventory.put(NoteDenomination.TWO_THOUSAND, 5); // ₹10,000
            noteInventory.put(NoteDenomination.FIVE_HUNDRED, 20); // ₹10,000
            noteInventory.put(NoteDenomination.TWO_HUNDRED, 25);  // ₹5,000
            noteInventory.put(NoteDenomination.ONE_HUNDRED, 50);  // ₹5,000
        } finally {
            dispenserLock.unlock();
        }
    }

    public ReentrantLock getLock() {
        return dispenserLock;
    }

    public int getTotalCashAvailable() {
        dispenserLock.lock();
        try {
            return noteInventory.entrySet().stream()
                    .mapToInt(e -> e.getKey().getValue() * e.getValue())
                    .sum();
        } finally {
            dispenserLock.unlock();
        }
    }

    public Map<NoteDenomination, Integer> getInventory() {
        dispenserLock.lock();
        try {
            return new LinkedHashMap<>(noteInventory);
        } finally {
            dispenserLock.unlock();
        }
    }

    public void addNotes(NoteDenomination denomination, int count) {
        dispenserLock.lock();
        try {
            noteInventory.merge(denomination, count, Integer::sum);
        } finally {
            dispenserLock.unlock();
        }
    }

    public void setNoteCount(NoteDenomination denomination, int count) {
        dispenserLock.lock();
        try {
            noteInventory.put(denomination, count);
        } finally {
            dispenserLock.unlock();
        }
    }

    public Map<NoteDenomination, Integer> dispenseCash(int amount) {
        dispenserLock.lock();
        try {
            if (amount > getTotalCashAvailable()) {
                throw new InsufficientCashException(String.format("ATM insufficient total cash! Requested: ₹%d, Available: ₹%d",
                        amount, getTotalCashAvailable()));
            }

            Map<NoteDenomination, Integer> notesToDispense = dispenseStrategy.calculateNotes(amount, noteInventory);

            // Deduct notes from inventory under lock
            for (Map.Entry<NoteDenomination, Integer> entry : notesToDispense.entrySet()) {
                NoteDenomination denom = entry.getKey();
                int qty = entry.getValue();
                noteInventory.put(denom, noteInventory.get(denom) - qty);
            }

            return notesToDispense;
        } finally {
            dispenserLock.unlock();
        }
    }
}
