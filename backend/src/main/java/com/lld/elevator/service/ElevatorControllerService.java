package com.lld.elevator.service;

import com.lld.elevator.exception.ElevatorNotFoundException;
import com.lld.elevator.exception.ElevatorUnavailableException;
import com.lld.elevator.exception.FloorOutOfRangeException;
import com.lld.elevator.exception.InvalidElevatorRequestException;
import com.lld.elevator.model.*;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.strategy.DispatchPolicy;
import com.lld.elevator.strategy.ElevatorDispatchStrategy;
import com.lld.elevator.strategy.ElevatorDispatchStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Facade the controller delegates to wholesale. Owns two entirely separate pieces of state: the
 * real elevator bank (backed by {@link ElevatorRepository}) and an isolated {@code /sim/*}
 * sandbox ({@link #simElevators} et al.) that a replayed demo can never corrupt.
 *
 * <p><b>Dispatch is a two-line handoff, not a two-phase call.</b> {@link #handleExternalRequest}
 * takes both the source floor and the real destination floor up front (the frontend already knows
 * both when a rider taps "Floor 1 -> Floor 5"), builds one {@link Request} carrying the true
 * destination, and queues *both* stops on the assigned car in {@link #assignRequestToElevator}.
 * An earlier revision split this into "external call" (which queued a bogus placeholder stop one
 * floor past the pickup) followed by a separate {@link #handleInternalRequest} call to add the
 * real destination — that placeholder stop was never removed, so every trip made one spurious
 * extra stop, and {@link #completeMatchingRequests} could never match the real destination floor
 * either. {@link #handleInternalRequest} still exists and is still exercised on its own (a rider
 * already on board pressing a different floor button than what was announced downstairs).
 */
@Service
public class ElevatorControllerService {

    private static final int DOOR_OPEN_TICKS = 2;

    /** Building's serviced floor range — shared by the real bank and the sim sandbox. */
    public static final int MIN_FLOOR = 1;
    public static final int MAX_FLOOR = 10;

    private final ElevatorRepository repository;
    private final ElevatorDispatchStrategyFactory strategyFactory;
    private final ElevatorNotifier notifier;
    private volatile DispatchPolicy activePolicy = DispatchPolicy.LOOK_SCAN;
    private final ReentrantLock controllerLock = new ReentrantLock(true);
    private final Queue<Request> pendingExternalRequests = new ConcurrentLinkedQueue<>();
    private final Map<Long, Integer> doorOpenTimers = new HashMap<>();

    // Isolated Simulation Engine State
    private final Map<Long, Elevator> simElevators = new ConcurrentHashMap<>();
    private final Queue<Request> simPendingRequests = new ConcurrentLinkedQueue<>();
    private final Map<Long, Integer> simDoorTimers = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private final AtomicLong simRequestIdGen = new AtomicLong(1);

    public ElevatorControllerService(ElevatorRepository repository,
                                     ElevatorDispatchStrategyFactory strategyFactory,
                                     ElevatorNotifier notifier) {
        this.repository = repository;
        this.strategyFactory = strategyFactory;
        this.notifier = notifier;
        initSimState();
    }

    public DispatchPolicy getDispatchPolicy() {
        return activePolicy;
    }

    public void setDispatchPolicy(DispatchPolicy policy) {
        if (policy == null) {
            throw new InvalidElevatorRequestException("Dispatch policy must not be null");
        }
        this.activePolicy = policy;
    }

    private ElevatorDispatchStrategy currentStrategy() {
        return strategyFactory.forPolicy(activePolicy);
    }

    private static void validateFloor(int floor) {
        if (floor < MIN_FLOOR || floor > MAX_FLOOR) {
            throw new FloorOutOfRangeException(floor, MIN_FLOOR, MAX_FLOOR);
        }
    }

    private static int clampFloor(int floor) {
        return Math.max(MIN_FLOOR, Math.min(MAX_FLOOR, floor));
    }

    public Request handleExternalRequest(int sourceFloor, int destinationFloor) {
        validateFloor(sourceFloor);
        validateFloor(destinationFloor);
        if (sourceFloor == destinationFloor) {
            throw new InvalidElevatorRequestException(
                    "Source floor and destination floor must differ (both were " + sourceFloor + ")");
        }

        controllerLock.lock();
        try {
            Request request = Request.of(sourceFloor, destinationFloor);
            request.setId(repository.nextRequestId());

            Elevator best = currentStrategy().selectOptimalElevator(
                    repository.getAllElevators(), sourceFloor, request.getDirection(), 1);
            if (best != null) {
                assignRequestToElevator(request, best);
            } else {
                request.setStatus("QUEUED");
                pendingExternalRequests.add(request);
            }

            repository.saveRequest(request);
            return request;
        } finally {
            controllerLock.unlock();
        }
    }

    public void handleInternalRequest(long elevatorId, int destinationFloor) {
        validateFloor(destinationFloor);
        Elevator elevator = repository.getElevator(elevatorId);
        if (elevator == null) {
            throw new ElevatorNotFoundException(elevatorId);
        }
        if (elevator.getState() == ElevatorState.MAINTENANCE) {
            throw new ElevatorUnavailableException(
                    "Elevator " + elevator.getName() + " is in MAINTENANCE and cannot accept a destination call");
        }

        elevator.getLock().lock();
        try {
            elevator.addDestination(destinationFloor);
            if (elevator.getState() == ElevatorState.IDLE) {
                if (destinationFloor > elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.UP);
                    elevator.transitionTo(ElevatorState.MOVING_UP);
                } else if (destinationFloor < elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.DOWN);
                    elevator.transitionTo(ElevatorState.MOVING_DOWN);
                }
            }
            repository.saveElevator(elevator);
        } finally {
            elevator.getLock().unlock();
        }
    }

    public void setElevatorMaintenance(long elevatorId, boolean maintenance) {
        controllerLock.lock();
        try {
            Elevator elevator = repository.getElevator(elevatorId);
            if (elevator == null) {
                throw new ElevatorNotFoundException(elevatorId);
            }

            ElevatorState oldState = elevator.getState();
            if (maintenance) {
                if (oldState == ElevatorState.MAINTENANCE) {
                    return; // already out of service — idempotent no-op
                }
                elevator.transitionTo(ElevatorState.MAINTENANCE);
                elevator.setDirection(Direction.IDLE);

                // Every stop this car was still carrying is orphaned; requeue each as a fresh
                // external call so another car can pick it up. A bare pending floor doesn't
                // record whether it was the original pickup or the destination, so the requeued
                // request's "destination" is a same-direction placeholder one floor further —
                // a documented simplification of this reassignment path, not a resurfacing of
                // the placeholder-stop bug described in the class javadoc (that bug queued the
                // placeholder as an actual elevator stop; this one is just a display value on a
                // freshly re-dispatched request).
                List<Integer> orphanedStops = elevator.getPendingFloors();
                elevator.getUpStops().clear();
                elevator.getDownStops().clear();

                for (int stop : orphanedStops) {
                    Direction dir = stop > elevator.getCurrentFloor() ? Direction.UP : Direction.DOWN;
                    int placeholderDest = clampFloor(stop + (dir == Direction.UP ? 1 : -1));
                    Request req = Request.of(stop, placeholderDest);
                    req.setId(repository.nextRequestId());
                    req.setStatus("REASSIGNED_MAINTENANCE");
                    pendingExternalRequests.add(req);
                    repository.saveRequest(req);
                }
                notifier.notifyStateChange(elevator, oldState, ElevatorState.MAINTENANCE);
            } else {
                if (oldState != ElevatorState.MAINTENANCE) {
                    return; // already in service — idempotent no-op
                }
                elevator.transitionTo(ElevatorState.IDLE);
                elevator.setDirection(Direction.IDLE);
                notifier.notifyStateChange(elevator, oldState, ElevatorState.IDLE);
                drainPendingRequests();
            }
            repository.saveElevator(elevator);
        } finally {
            controllerLock.unlock();
        }
    }

    public List<Elevator> stepSimulation() {
        controllerLock.lock();
        try {
            drainPendingRequests();

            for (Elevator elevator : repository.getAllElevators()) {
                if (elevator.getState() == ElevatorState.MAINTENANCE) {
                    continue;
                }

                elevator.getLock().lock();
                try {
                    ElevatorState currentState = elevator.getState();

                    if (currentState == ElevatorState.DOOR_OPEN) {
                        int remainingTicks = doorOpenTimers.getOrDefault(elevator.getId(), 0) - 1;
                        if (remainingTicks <= 0) {
                            doorOpenTimers.remove(elevator.getId());
                            notifier.notifyDoorChange(elevator, false);
                            determineNextElevatorState(elevator, false);
                        } else {
                            doorOpenTimers.put(elevator.getId(), remainingTicks);
                        }
                    } else if (currentState == ElevatorState.MOVING_UP || currentState == ElevatorState.MOVING_DOWN) {
                        int nextFloor = (currentState == ElevatorState.MOVING_UP)
                                ? elevator.getCurrentFloor() + 1
                                : elevator.getCurrentFloor() - 1;

                        if (nextFloor > MAX_FLOOR || nextFloor < MIN_FLOOR) {
                            // Hitting the roof or the pit with nothing left to stop for in this
                            // direction — whatever is still pending must be reachable only by
                            // reversing (or was misfiled behind the car). Reconsider now instead
                            // of leaving the building; see determineNextElevatorState's javadoc.
                            determineNextElevatorState(elevator, false);
                        } else {
                            elevator.setCurrentFloor(nextFloor);
                            notifier.notifyFloorReached(elevator, nextFloor);

                            boolean isStopRequired = elevator.getUpStops().contains(nextFloor)
                                    || elevator.getDownStops().contains(nextFloor);

                            if (isStopRequired) {
                                elevator.removeStop(nextFloor);
                                elevator.transitionTo(ElevatorState.DOOR_OPEN);
                                doorOpenTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                                elevator.deboardPassenger(1);
                                elevator.boardPassenger();
                                notifier.notifyDoorChange(elevator, true);
                                completeMatchingRequests(elevator.getId(), nextFloor);
                            }
                        }
                    } else if (currentState == ElevatorState.IDLE) {
                        determineNextElevatorState(elevator, false);
                    }

                    repository.saveElevator(elevator);
                } finally {
                    elevator.getLock().unlock();
                }
            }

            return repository.getAllElevators();
        } finally {
            controllerLock.unlock();
        }
    }

    private void assignRequestToElevator(Request request, Elevator elevator) {
        request.setAssignedElevatorId(elevator.getId());
        request.setStatus("ASSIGNED");

        elevator.getLock().lock();
        try {
            elevator.addStop(request.getSourceFloor());
            elevator.addStop(request.getDestinationFloor());

            if (elevator.getState() == ElevatorState.IDLE) {
                int target = request.getSourceFloor();
                if (target > elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.UP);
                    elevator.transitionTo(ElevatorState.MOVING_UP);
                } else if (target < elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.DOWN);
                    elevator.transitionTo(ElevatorState.MOVING_DOWN);
                } else {
                    // The car is already parked at the requested pickup floor — remove it from
                    // the pending set now, the same way stepSimulation does when it arrives at a
                    // stop mid-transit. Skipping this left a stale pending-floor entry sitting in
                    // the set forever whenever a request was assigned to an already-idle car
                    // parked at the source floor.
                    elevator.removeStop(target);
                    elevator.transitionTo(ElevatorState.DOOR_OPEN);
                    doorOpenTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                    elevator.boardPassenger();
                    notifier.notifyDoorChange(elevator, true);
                }
            }
        } finally {
            elevator.getLock().unlock();
        }
    }

    /**
     * Picks the next direction/state from where every pending stop <em>actually is right now</em>,
     * not from which bucket ({@code upStops}/{@code downStops}) a floor happened to land in when it
     * was queued. {@code addStop} buckets a floor once, at insertion time, relative to the car's
     * floor at that instant — but the car keeps moving after that, so a floor filed as an "up stop"
     * can end up behind a car that changed direction, or behind a car that simply passed it while
     * mid-transit before a new request for that exact floor arrived. The old version of this method
     * trusted {@code elevator.getDirection()} and a single bucket's non-emptiness blindly: if that
     * bucket's only remaining entries were actually behind the car, it kept committing to the same
     * direction forever, since nothing calls this method again until the car actually reaches a
     * stop — and a stop behind a car moving away from it is never reached. The car would cruise
     * straight through the top or bottom of the building and never come back (see RCA-026's
     * follow-up fix). Recomputing reachability fresh from the union of both sets every time this is
     * called — an O(stops) scan, trivially cheap at this building's scale — is what makes the fix
     * correct instead of just less likely to fail.
     *
     * <p>{@code sim} selects which door-timer map / telemetry sink a same-floor stop (see below)
     * is serviced against — the real bank's {@link #doorOpenTimers}/{@link #notifier} or the
     * sandbox's {@link #simDoorTimers}/event log — since this one method is shared by both
     * {@link #stepSimulation()} and {@link #simStep()}.
     */
    private void determineNextElevatorState(Elevator elevator, boolean sim) {
        int currentFloor = elevator.getCurrentFloor();
        List<Integer> pending = elevator.getPendingFloors();

        boolean hasAbove = false;
        boolean hasBelow = false;
        boolean hasHere = false;
        for (int floor : pending) {
            if (floor > currentFloor) hasAbove = true;
            else if (floor < currentFloor) hasBelow = true;
            else hasHere = true;
        }

        if (!hasAbove && !hasBelow && !hasHere) {
            elevator.setDirection(Direction.IDLE);
            elevator.transitionTo(ElevatorState.IDLE);
            return;
        }

        // A stop sitting exactly at the current floor with nowhere else to go (or left over from
        // a same-floor add while the car was already mid-transit past this exact floor) is
        // serviced in place — no direction would ever bring the car back to "here" otherwise.
        if (!hasAbove && !hasBelow) {
            elevator.removeStop(currentFloor);
            elevator.transitionTo(ElevatorState.DOOR_OPEN);
            elevator.deboardPassenger(1);
            elevator.boardPassenger();
            if (sim) {
                simDoorTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                logSimEvent("FLOOR_STOP", elevator.getName(), "Already at floor " + currentFloor + " for a newly queued stop, doors opening", null);
            } else {
                doorOpenTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                notifier.notifyDoorChange(elevator, true);
                completeMatchingRequests(elevator.getId(), currentFloor);
            }
            return;
        }

        Direction preferred = elevator.getDirection();
        boolean continueUp = (preferred == Direction.UP && hasAbove) || (preferred != Direction.DOWN && hasAbove);
        if (preferred == Direction.DOWN) {
            if (hasBelow) {
                elevator.transitionTo(ElevatorState.MOVING_DOWN);
            } else {
                elevator.setDirection(Direction.UP);
                elevator.transitionTo(ElevatorState.MOVING_UP);
            }
        } else if (continueUp) {
            elevator.setDirection(Direction.UP);
            elevator.transitionTo(ElevatorState.MOVING_UP);
        } else {
            elevator.setDirection(Direction.DOWN);
            elevator.transitionTo(ElevatorState.MOVING_DOWN);
        }
    }

    private void drainPendingRequests() {
        Iterator<Request> iterator = pendingExternalRequests.iterator();
        while (iterator.hasNext()) {
            Request req = iterator.next();
            Elevator best = currentStrategy().selectOptimalElevator(
                    repository.getAllElevators(), req.getSourceFloor(), req.getDirection(), 1);
            if (best != null) {
                assignRequestToElevator(req, best);
                iterator.remove();
            }
        }
    }

    private void completeMatchingRequests(long elevatorId, int floor) {
        for (Request r : repository.getPendingRequests()) {
            if (r.getAssignedElevatorId() == elevatorId && r.getDestinationFloor() == floor) {
                r.setStatus("COMPLETED");
                repository.saveRequest(r);
            }
        }
    }

    public List<Elevator> getElevators() {
        return repository.getAllElevators();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public void initSimState() {
        simElevators.clear();
        simPendingRequests.clear();
        simDoorTimers.clear();
        simEventLog.clear();

        simElevators.put(1L, new Elevator(1L, "Elevator Alpha (E1)", 8, 1));
        simElevators.put(2L, new Elevator(2L, "Elevator Beta (E2)", 6, 5));
        simElevators.put(3L, new Elevator(3L, "Elevator Gamma (E3)", 10, 8));
        Elevator e4 = new Elevator(4L, "Elevator Delta (E4)", 8, 10);
        e4.setState(ElevatorState.MAINTENANCE);
        simElevators.put(4L, e4);

        logSimEvent("SIM_RESET", "System", "Initialized 4 elevators (E1@F1, E2@F5, E3@F8, E4@F10 MAINTENANCE)", null);
    }

    public Map<String, Object> simRequest(int sourceFloor, int destinationFloor) {
        validateFloor(sourceFloor);
        validateFloor(destinationFloor);
        if (sourceFloor == destinationFloor) {
            throw new InvalidElevatorRequestException(
                    "Source floor and destination floor must differ (both were " + sourceFloor + ")");
        }

        Direction dir = sourceFloor < destinationFloor ? Direction.UP : Direction.DOWN;
        Elevator best = currentStrategy().selectOptimalElevator(new ArrayList<>(simElevators.values()), sourceFloor, dir, 1);

        Map<String, Object> details = new HashMap<>();
        details.put("sourceFloor", sourceFloor);
        details.put("destinationFloor", destinationFloor);
        details.put("direction", dir);

        if (best != null) {
            best.addStop(sourceFloor);
            best.addStop(destinationFloor);
            if (best.getState() == ElevatorState.IDLE) {
                Direction target = sourceFloor >= best.getCurrentFloor() ? Direction.UP : Direction.DOWN;
                best.setDirection(target);
                if (sourceFloor != best.getCurrentFloor()) {
                    best.transitionTo(target == Direction.UP ? ElevatorState.MOVING_UP : ElevatorState.MOVING_DOWN);
                } else {
                    best.removeStop(sourceFloor);
                    best.transitionTo(ElevatorState.DOOR_OPEN);
                    simDoorTimers.put(best.getId(), DOOR_OPEN_TICKS);
                    best.boardPassenger();
                }
            }
            details.put("assignedElevator", best.getName());
            details.put("assignedElevatorId", best.getId());
            logSimEvent("ELEVATOR_ASSIGNED", "Requester at F" + sourceFloor, "Assigned request F" + sourceFloor + "->" + destinationFloor + " to " + best.getName(), details);
        } else {
            Request req = Request.of(sourceFloor, destinationFloor);
            req.setId(simRequestIdGen.getAndIncrement());
            req.setStatus("QUEUED");
            simPendingRequests.add(req);
            details.put("queued", true);
            logSimEvent("REQUEST_QUEUED", "Requester at F" + sourceFloor, "All elevators full or maintenance! Request queued for F" + sourceFloor, details);
        }

        return getSimSnapshots();
    }

    public Map<String, Object> simStep() {
        drainSimPendingRequests();

        for (Elevator elevator : simElevators.values()) {
            if (elevator.getState() == ElevatorState.MAINTENANCE) continue;

            ElevatorState currentState = elevator.getState();
            if (currentState == ElevatorState.DOOR_OPEN) {
                int rem = simDoorTimers.getOrDefault(elevator.getId(), 0) - 1;
                if (rem <= 0) {
                    simDoorTimers.remove(elevator.getId());
                    determineNextElevatorState(elevator, true);
                } else {
                    simDoorTimers.put(elevator.getId(), rem);
                }
            } else if (currentState == ElevatorState.MOVING_UP || currentState == ElevatorState.MOVING_DOWN) {
                int next = (currentState == ElevatorState.MOVING_UP) ? elevator.getCurrentFloor() + 1 : elevator.getCurrentFloor() - 1;

                if (next > MAX_FLOOR || next < MIN_FLOOR) {
                    determineNextElevatorState(elevator, true);
                } else {
                    elevator.setCurrentFloor(next);

                    if (elevator.getUpStops().contains(next) || elevator.getDownStops().contains(next)) {
                        elevator.removeStop(next);
                        elevator.transitionTo(ElevatorState.DOOR_OPEN);
                        simDoorTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                        elevator.deboardPassenger(1);
                        elevator.boardPassenger();
                        logSimEvent("FLOOR_STOP", elevator.getName(), "Reached Floor " + next + ", doors opening for passenger boarding/deboarding", null);
                    }
                }
            } else if (currentState == ElevatorState.IDLE) {
                determineNextElevatorState(elevator, true);
            }
        }

        logSimEvent("TICK_STEP", "SimEngine", "Stepped simulation ticks for active elevators", null);
        return getSimSnapshots();
    }

    private void drainSimPendingRequests() {
        Iterator<Request> iterator = simPendingRequests.iterator();
        while (iterator.hasNext()) {
            Request req = iterator.next();
            Elevator best = currentStrategy().selectOptimalElevator(
                    new ArrayList<>(simElevators.values()), req.getSourceFloor(), req.getDirection(), 1);
            if (best != null) {
                best.addStop(req.getSourceFloor());
                best.addStop(req.getDestinationFloor());
                if (best.getState() == ElevatorState.IDLE) {
                    Direction target = req.getSourceFloor() >= best.getCurrentFloor() ? Direction.UP : Direction.DOWN;
                    best.setDirection(target);
                    best.transitionTo(target == Direction.UP ? ElevatorState.MOVING_UP : ElevatorState.MOVING_DOWN);
                }
                logSimEvent("QUEUED_REQUEST_ASSIGNED", "SimEngine", "Previously queued request F" + req.getSourceFloor() + "->" + req.getDestinationFloor() + " assigned to " + best.getName(), null);
                iterator.remove();
            }
        }
    }

    public Map<String, Object> simToggleMaintenance(long elevatorId, boolean maintenance) {
        Elevator elevator = simElevators.get(elevatorId);
        if (elevator == null) {
            throw new ElevatorNotFoundException(elevatorId);
        }
        ElevatorState target = maintenance ? ElevatorState.MAINTENANCE : ElevatorState.IDLE;
        if (elevator.getState() != target) {
            elevator.transitionTo(target);
            elevator.setDirection(Direction.IDLE);
            logSimEvent("MAINTENANCE_TOGGLE", elevator.getName(), "Elevator " + elevator.getName() + " maintenance set to " + maintenance, null);
        }
        return getSimSnapshots();
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        Map<Long, ElevatorSnapshot> snapshots = new HashMap<>();
        for (Map.Entry<Long, Elevator> entry : simElevators.entrySet()) {
            snapshots.put(entry.getKey(), entry.getValue().createSnapshot());
        }
        res.put("elevators", snapshots);
        res.put("events", simEventLog);
        res.put("pendingRequests", new ArrayList<>(simPendingRequests));
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        Map<Long, ElevatorSnapshot> snapshots = new HashMap<>();
        for (Map.Entry<Long, Elevator> entry : simElevators.entrySet()) {
            snapshots.put(entry.getKey(), entry.getValue().createSnapshot());
        }
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(ts)
                .eventType(type)
                .actorName(actor)
                .description(desc)
                .data(data)
                .elevatorSnapshots(snapshots)
                .build();
        simEventLog.add(event);
    }
}
