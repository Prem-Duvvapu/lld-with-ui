package com.lld.locker.strategy;

import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerSize;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the two strategies genuinely diverge, not just carry different names for one loop. */
public class LockerAllocationStrategyTest {

    @Test
    void smallestFitPicksTheTightestFitEvenWhenALargerOneComesFirstInScanOrder() {
        // LARGE locker listed FIRST, SMALL locker listed second -- scan order deliberately
        // works against the "just take the first one" shortcut.
        Locker large = new Locker("L-LARGE", "bank", LockerSize.LARGE);
        Locker small = new Locker("L-SMALL", "bank", LockerSize.SMALL);
        List<Locker> lockers = List.of(large, small);

        LockerAllocationStrategy strategy = new SmallestFitFirstAllocationStrategy();
        Optional<Locker> chosen = strategy.selectCandidate(lockers, LockerSize.SMALL, Set.of());

        assertTrue(chosen.isPresent());
        assertEquals("L-SMALL", chosen.get().getId(), "smallest-fit must prefer the tighter fit even though LARGE was scanned first");
    }

    @Test
    void firstFitTakesWhicheverFittingLockerComesFirstInScanOrderEvenIfWasteful() {
        Locker large = new Locker("L-LARGE", "bank", LockerSize.LARGE);
        Locker small = new Locker("L-SMALL", "bank", LockerSize.SMALL);
        List<Locker> lockers = List.of(large, small);

        LockerAllocationStrategy strategy = new FirstFitAllocationStrategy();
        Optional<Locker> chosen = strategy.selectCandidate(lockers, LockerSize.SMALL, Set.of());

        assertTrue(chosen.isPresent());
        assertEquals("L-LARGE", chosen.get().getId(), "first-fit must take the first fitting locker (LARGE) even though it wastes space");
    }

    @Test
    void neitherStrategyEverReturnsALockerSmallerThanRequired() {
        Locker small = new Locker("L-SMALL", "bank", LockerSize.SMALL);
        List<Locker> lockers = List.of(small);

        assertTrue(new SmallestFitFirstAllocationStrategy().selectCandidate(lockers, LockerSize.LARGE, Set.of()).isEmpty());
        assertTrue(new FirstFitAllocationStrategy().selectCandidate(lockers, LockerSize.LARGE, Set.of()).isEmpty());
    }

    @Test
    void occupiedLockersAreNeverSelectedByEitherStrategy() {
        Locker locker = new Locker("L-1", "bank", LockerSize.SMALL);
        locker.getLock().lock();
        try {
            locker.transitionTo(com.lld.locker.model.LockerStatus.OCCUPIED);
        } finally {
            locker.getLock().unlock();
        }
        List<Locker> lockers = List.of(locker);

        assertTrue(new SmallestFitFirstAllocationStrategy().selectCandidate(lockers, LockerSize.SMALL, Set.of()).isEmpty());
        assertTrue(new FirstFitAllocationStrategy().selectCandidate(lockers, LockerSize.SMALL, Set.of()).isEmpty());
    }

    @Test
    void excludedLockerIdsAreSkippedEvenIfOtherwiseEligible() {
        Locker locker = new Locker("L-1", "bank", LockerSize.SMALL);
        List<Locker> lockers = List.of(locker);

        Optional<Locker> result = new SmallestFitFirstAllocationStrategy()
                .selectCandidate(lockers, LockerSize.SMALL, Set.of("L-1"));

        assertTrue(result.isEmpty(), "an excluded locker must never be re-offered as a candidate");
    }
}
