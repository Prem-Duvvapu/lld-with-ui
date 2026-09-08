package com.lld.locker.strategy;

import com.lld.locker.model.Locker;
import com.lld.locker.model.LockerSize;
import com.lld.locker.model.LockerStatus;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Minimizes wasted space: among every {@code EMPTY} locker big enough for the package, picks
 * the smallest one. A LARGE package can only ever claim a LARGE locker, but a SMALL package
 * will fill a SMALL locker before ever touching a MEDIUM or LARGE one.
 */
@Component
public class SmallestFitFirstAllocationStrategy implements LockerAllocationStrategy {

    @Override
    public Optional<Locker> selectCandidate(List<Locker> lockersInBank, LockerSize requiredSize, Set<String> excludeIds) {
        return lockersInBank.stream()
                .filter(l -> l.getStatus() == LockerStatus.EMPTY)
                .filter(l -> l.getSize().fits(requiredSize))
                .filter(l -> !excludeIds.contains(l.getId()))
                .min(Comparator.comparing(l -> l.getSize().ordinal()));
    }
}
