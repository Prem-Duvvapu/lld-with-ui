package com.lld.locker.strategy;

import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerSize;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Picks which candidate locker a deposit should try to claim next. A candidate is only ever a
 * suggestion, not a reservation — {@code LockerService#deposit} re-checks the candidate is still
 * {@code EMPTY} under that locker's own lock before claiming it, and asks the strategy for a
 * fresh candidate (via {@code excludeIds}, lockers already ruled out this attempt) if it lost
 * the race to another courier.
 */
public interface LockerAllocationStrategy {
    Optional<Locker> selectCandidate(List<Locker> lockersInBank, LockerSize requiredSize, Set<String> excludeIds);
}
