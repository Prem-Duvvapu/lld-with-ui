package com.lld.atm.dispenser;

import com.lld.atm.exception.InsufficientCashException;
import com.lld.atm.model.NoteDenomination;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * The physical note hardware. All inventory reads/writes go through {@link #dispenserLock} — a
 * single fair {@code ReentrantLock} for the whole cash cassette, not per-denomination, because a
 * dispense has to check-and-deduct across several denominations atomically (a request that reads
 * "enough ₹500s" and then a concurrent thread empties them between the read and the deduction would
 * double-dispense). {@link com.lld.atm.service.AtmService#withdraw} takes the per-account lock
 * first and this lock second, always in that order, so there is one fixed lock-acquisition
 * ordering and no risk of the classic two-lock deadlock.
 */
@Component
public class CashDispenser {

    private final Map<NoteDenomination, Integer> noteInventory = new ConcurrentHashMap<>();
    private final ReentrantLock dispenserLock = new ReentrantLock(true);
    private final DenominationDispenseStrategyFactory strategyFactory;
    private final DispenseMode defaultMode;

    @Autowired
    public CashDispenser(DenominationDispenseStrategyFactory strategyFactory) {
        this(strategyFactory, DispenseMode.MINIMIZE_NOTES);
    }

    public CashDispenser(DenominationDispenseStrategyFactory strategyFactory, DispenseMode defaultMode) {
        this.strategyFactory = strategyFactory;
        this.defaultMode = defaultMode;
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

    /** Dispenses using this cassette's default {@link DispenseMode}. */
    public Map<NoteDenomination, Integer> dispenseCash(int amount) {
        return dispenseCash(amount, defaultMode);
    }

    /**
     * Computes the note breakdown for {@code amount} under {@code mode} and deducts it from
     * inventory atomically. Both the availability check and the deduction happen under the same
     * lock acquisition, so two concurrent dispense calls can never both "see" the same last note.
     */
    public Map<NoteDenomination, Integer> dispenseCash(int amount, DispenseMode mode) {
        dispenserLock.lock();
        try {
            if (amount > getTotalCashAvailable()) {
                throw new InsufficientCashException(String.format("ATM insufficient total cash! Requested: ₹%d, Available: ₹%d",
                        amount, getTotalCashAvailable()));
            }

            DenominationDispenseStrategy strategy = strategyFactory.forMode(mode);
            Map<NoteDenomination, Integer> notesToDispense = strategy.calculateNotes(amount, noteInventory);

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
