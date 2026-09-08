package com.lld.locker.strategy;

import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerSize;
import com.lld.locker.model.LockerStatus;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Takes the first {@code EMPTY} locker (bank scan order) big enough for the package, regardless
 * of whether a tighter fit exists further down the list — genuinely different behavior from
 * {@link SmallestFitFirstAllocationStrategy}: it can hand a SMALL package a LARGE locker if that
 * happens to be first, wasting capacity {@code SmallestFitFirstAllocationStrategy} would have
 * preserved.
 */
@Component
public class FirstFitAllocationStrategy implements LockerAllocationStrategy {

    @Override
    public Optional<Locker> selectCandidate(List<Locker> lockersInBank, LockerSize requiredSize, Set<String> excludeIds) {
        return lockersInBank.stream()
                .filter(l -> l.getStatus() == LockerStatus.EMPTY)
                .filter(l -> l.getSize().fits(requiredSize))
                .filter(l -> !excludeIds.contains(l.getId()))
                .findFirst();
    }
}
