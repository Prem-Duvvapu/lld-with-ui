package com.lld.locker.service;

import com.lld.locker.exception.InvalidPickupCodeException;
import com.lld.locker.exception.NoAvailableLockerException;
import com.lld.locker.factory.PickupCodeFactory;
import com.lld.locker.model.*;
import com.lld.locker.repository.LockerRepository;
import com.lld.locker.strategy.LockerAllocationStrategy;
import com.lld.locker.strategy.LockerAllocationStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Facade for the whole locker network. {@link #deposit} is the concurrency centerpiece: two
 * couriers racing to claim the last {@code SMALL} locker in a bank must never both succeed.
 *
 * <p>The fix is a per-locker {@link ReentrantLock} held across the whole
 * "is this candidate still EMPTY? if so, claim it" sequence — not just the write. A courier's
 * allocation-strategy scan is a plain, unlocked read (cheap, and safe to run concurrently), so
 * two couriers can legitimately both pick the *same* candidate locker as their first choice.
 * Whichever courier's thread acquires that locker's lock first wins: it re-checks
 * {@code EMPTY} under the lock (the read that matters), claims it, and returns. The loser
 * acquires the same lock only after the winner has released it, re-checks, finds the locker no
 * longer {@code EMPTY}, and retries the whole scan — excluding that locker id — until it finds a
 * different candidate or the bank is genuinely out of lockers of that size.
 */
@Service
public class LockerService {

    private final LockerRepository repository;
    private final LockerAllocationStrategyFactory strategyFactory;
    private final PickupCodeFactory codeFactory;
    private final AtomicLong parcelIdGen = new AtomicLong(1001);

    // Isolated Simulation Engine State
    private final LockerRepository simRepository = new LockerRepository();
    private final AtomicLong simParcelIdGen = new AtomicLong(1);
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public LockerService(LockerRepository repository,
                          LockerAllocationStrategyFactory strategyFactory,
                          PickupCodeFactory codeFactory) {
        this.repository = repository;
        this.strategyFactory = strategyFactory;
        this.codeFactory = codeFactory;
        initSimState();
    }

    public void addBank(LockerBank bank) {
        repository.addBank(bank);
    }

    public void addLocker(Locker locker) {
        repository.addLocker(locker);
    }

    public List<LockerBank> getAllBanks() {
        return repository.getAllBanks();
    }

    public List<Locker> getLockersInBank(String bankId) {
        repository.getBank(bankId);
        return repository.getLockersInBank(bankId);
    }

    public Parcel deposit(String bankId, LockerSize size, String courierId, String recipientId, AllocationPolicy policy) {
        repository.getBank(bankId);
        List<Locker> lockersInBank = repository.getLockersInBank(bankId);
        LockerAllocationStrategy strategy = strategyFactory.forPolicy(policy);
        Set<String> activeCodes = repository.getAllParcels().stream()
                .filter(p -> p.getPickedUpAtEpoch() == null)
                .map(Parcel::getPickupCode)
                .collect(Collectors.toSet());

        return claimLocker(lockersInBank, size, courierId, recipientId, strategy, repository,
                parcelIdGen, activeCodes);
    }

    private Parcel claimLocker(List<Locker> lockersInBank, LockerSize size, String courierId,
                                 String recipientId, LockerAllocationStrategy strategy,
                                 LockerRepository targetRepository, AtomicLong idGen, Set<String> activeCodes) {
        Set<String> excludeIds = new HashSet<>();

        while (true) {
            Optional<Locker> candidate = strategy.selectCandidate(lockersInBank, size, excludeIds);
            if (candidate.isEmpty()) {
                throw new NoAvailableLockerException("No available locker of size " + size + " or larger in this bank");
            }
            Locker locker = candidate.get();
            locker.getLock().lock();
            try {
                if (locker.getStatus() != LockerStatus.EMPTY) {
                    // Lost the race for this specific locker -- another courier claimed it first.
                    excludeIds.add(locker.getId());
                    continue;
                }
                locker.transitionTo(LockerStatus.OCCUPIED);
                locker.transitionTo(LockerStatus.AWAITING_PICKUP);

                String code = codeFactory.generate(activeCodes);
                long now = System.currentTimeMillis();
                Parcel pkg = Parcel.builder()
                        .id("PKG-" + idGen.getAndIncrement())
                        .size(size)
                        .courierId(courierId)
                        .recipientId(recipientId)
                        .assignedLockerId(locker.getId())
                        .pickupCode(code)
                        .depositedAtEpoch(now)
                        .expiresAtEpoch(now + 72L * 60 * 60 * 1000)
                        .build();
                targetRepository.saveParcel(pkg);
                return pkg;
            } finally {
                locker.getLock().unlock();
            }
        }
    }

    public Parcel pickup(String pickupCode) {
        return doPickup(repository, pickupCode);
    }

    private Parcel doPickup(LockerRepository targetRepository, String pickupCode) {
        Parcel pkg = targetRepository.getAllParcels().stream()
                .filter(p -> p.getPickupCode().equals(pickupCode) && p.getPickedUpAtEpoch() == null)
                .findFirst()
                .orElseThrow(() -> new InvalidPickupCodeException("No active package for pickup code: " + pickupCode));

        Locker locker = targetRepository.getLocker(pkg.getAssignedLockerId());
        locker.getLock().lock();
        try {
            locker.transitionTo(LockerStatus.EMPTY);
        } finally {
            locker.getLock().unlock();
        }
        pkg.setPickedUpAtEpoch(System.currentTimeMillis());
        targetRepository.saveParcel(pkg);
        return pkg;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simEventLog.clear();

        LockerBank bank = LockerBank.builder().id("BANK-SIM-1").name("Sim Plaza Locker Bank").location("Simulation Sandbox").build();
        simRepository.addBank(bank);

        // 1 SMALL, 1 MEDIUM, 1 LARGE -- deliberately scarce so the SMALL-locker race has bite.
        simRepository.addLocker(new Locker("L-SIM-1", bank.getId(), LockerSize.SMALL));
        simRepository.addLocker(new Locker("L-SIM-2", bank.getId(), LockerSize.MEDIUM));
        simRepository.addLocker(new Locker("L-SIM-3", bank.getId(), LockerSize.LARGE));

        logSimEvent("SIM_RESET", "System", "Initialized sandbox with 1 bank (3 lockers: SMALL/MEDIUM/LARGE)", null);
    }

    public Map<String, Object> simDeposit(String courierId, String recipientId, LockerSize size, AllocationPolicy policy) {
        trySimDeposit(courierId, recipientId, size, policy);
        return getSimSnapshots();
    }

    /**
     * Not {@code synchronized}: {@link #simRace} relies on every racing courier's thread
     * genuinely running this concurrently, with only each candidate locker's own
     * {@link ReentrantLock} (inside {@link #claimLocker}) serializing the contested case. A
     * method-level lock here would force couriers to queue one at a time and the race this
     * module exists to demonstrate would never actually happen.
     */
    private Optional<Parcel> trySimDeposit(String courierId, String recipientId, LockerSize size, AllocationPolicy policy) {
        LockerBank bank = simRepository.getAllBanks().get(0);
        List<Locker> lockersInBank = simRepository.getLockersInBank(bank.getId());
        LockerAllocationStrategy strategy = strategyFactory.forPolicy(policy);
        Set<String> activeCodes = simRepository.getAllParcels().stream()
                .filter(p -> p.getPickedUpAtEpoch() == null)
                .map(Parcel::getPickupCode)
                .collect(Collectors.toSet());
        try {
            Parcel pkg = claimLocker(lockersInBank, size, courierId, recipientId, strategy, simRepository, simParcelIdGen, activeCodes);
            logSimEvent("DEPOSIT", courierId, String.format("Deposited %s package into locker %s (code %s)", size, pkg.getAssignedLockerId(), pkg.getPickupCode()), null);
            return Optional.of(pkg);
        } catch (NoAvailableLockerException e) {
            logSimEvent("DEPOSIT_REJECTED", courierId, "NO LOCKER AVAILABLE: " + e.getMessage(), null);
            return Optional.empty();
        }
    }

    public Map<String, Object> simPickup(String pickupCode) {
        try {
            Parcel pkg = doPickup(simRepository, pickupCode);
            logSimEvent("PICKUP", pkg.getRecipientId(), String.format("Picked up package %s from locker %s", pkg.getId(), pkg.getAssignedLockerId()), null);
        } catch (InvalidPickupCodeException e) {
            logSimEvent("PICKUP_REJECTED", "Unknown", e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    public Map<String, Object> simRace(int courierCount, LockerSize size, AllocationPolicy policy) throws InterruptedException {
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(courierCount);
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch doneLatch = new java.util.concurrent.CountDownLatch(courierCount);
        java.util.concurrent.atomic.AtomicInteger succeeded = new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger rejected = new java.util.concurrent.atomic.AtomicInteger(0);

        for (int i = 0; i < courierCount; i++) {
            String courierId = "RaceCourier-" + (i + 1);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    Optional<Parcel> result = trySimDeposit(courierId, "RaceRecipient", size, policy);
                    if (result.isPresent()) {
                        succeeded.incrementAndGet();
                    } else {
                        rejected.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        Map<String, Object> details = new HashMap<>();
        details.put("attempts", courierCount);
        details.put("succeeded", succeeded.get());
        details.put("rejected", rejected.get());
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d couriers raced for %s lockers -- %d succeeded, %d rejected", courierCount, size, succeeded.get(), rejected.get()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("banks", simRepository.getAllBanks());
        res.put("lockers", simRepository.getAllLockers());
        res.put("parcels", simRepository.getAllParcels());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
