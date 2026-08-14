package com.lld.elevator.service;

import com.lld.elevator.model.*;
import com.lld.elevator.observer.ElevatorNotifier;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.strategy.ElevatorDispatchStrategy;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ElevatorControllerService {

    private static final int DOOR_OPEN_TICKS = 2;

    private final ElevatorRepository repository;
    private final ElevatorDispatchStrategy dispatchStrategy;
    private final ElevatorNotifier notifier;
    private final ReentrantLock controllerLock = new ReentrantLock(true);
    private final Queue<Request> pendingExternalRequests = new ConcurrentLinkedQueue<>();
    private final Map<Long, Integer> doorOpenTimers = new HashMap<>();

    // Isolated Simulation Engine State
    private final Map<Long, Elevator> simElevators = new ConcurrentHashMap<>();
    private final Queue<Request> simPendingRequests = new ConcurrentLinkedQueue<>();
    private final Map<Long, Integer> simDoorTimers = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public ElevatorControllerService(ElevatorRepository repository,
                                     ElevatorDispatchStrategy dispatchStrategy,
                                     ElevatorNotifier notifier) {
        this.repository = repository;
        this.dispatchStrategy = dispatchStrategy;
        this.notifier = notifier;
        initSimState();
    }

    public Request handleExternalRequest(int sourceFloor, Direction direction) {
        controllerLock.lock();
        try {
            Request request = new Request(sourceFloor, sourceFloor + (direction == Direction.UP ? 1 : -1));
            request.setId(repository.nextRequestId());
            request.setDirection(direction);
            request.setType(RequestType.EXTERNAL);

            Elevator best = dispatchStrategy.selectOptimalElevator(repository.getAllElevators(), sourceFloor, direction, 1);
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
        Elevator elevator = repository.getElevator(elevatorId);
        if (elevator == null || elevator.getState() == ElevatorState.MAINTENANCE) {
            return;
        }

        elevator.getLock().lock();
        try {
            elevator.addDestination(destinationFloor);
            if (elevator.getState() == ElevatorState.IDLE) {
                if (destinationFloor > elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.UP);
                    elevator.setState(ElevatorState.MOVING_UP);
                } else if (destinationFloor < elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.DOWN);
                    elevator.setState(ElevatorState.MOVING_DOWN);
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
            if (elevator == null) return;

            ElevatorState oldState = elevator.getState();
            if (maintenance) {
                elevator.setState(ElevatorState.MAINTENANCE);
                elevator.setDirection(Direction.IDLE);

                List<Integer> orphanedStops = elevator.getPendingFloors();
                elevator.getUpStops().clear();
                elevator.getDownStops().clear();

                for (int stop : orphanedStops) {
                    Direction dir = stop > elevator.getCurrentFloor() ? Direction.UP : Direction.DOWN;
                    Request req = new Request(stop, stop + (dir == Direction.UP ? 1 : -1));
                    req.setId(repository.nextRequestId());
                    req.setStatus("REASSIGNED_MAINTENANCE");
                    pendingExternalRequests.add(req);
                }
                notifier.notifyStateChange(elevator, oldState, ElevatorState.MAINTENANCE);
            } else {
                elevator.setState(ElevatorState.IDLE);
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
                            determineNextElevatorState(elevator);
                        } else {
                            doorOpenTimers.put(elevator.getId(), remainingTicks);
                        }
                    } else if (currentState == ElevatorState.MOVING_UP || currentState == ElevatorState.MOVING_DOWN) {
                        int nextFloor = (currentState == ElevatorState.MOVING_UP)
                                ? elevator.getCurrentFloor() + 1
                                : elevator.getCurrentFloor() - 1;

                        elevator.setCurrentFloor(nextFloor);
                        notifier.notifyFloorReached(elevator, nextFloor);

                        boolean isStopRequired = false;
                        if (currentState == ElevatorState.MOVING_UP && elevator.getUpStops().contains(nextFloor)) {
                            isStopRequired = true;
                        } else if (currentState == ElevatorState.MOVING_DOWN && elevator.getDownStops().contains(nextFloor)) {
                            isStopRequired = true;
                        } else if (elevator.getUpStops().contains(nextFloor) || elevator.getDownStops().contains(nextFloor)) {
                            isStopRequired = true;
                        }

                        if (isStopRequired) {
                            elevator.removeStop(nextFloor);
                            elevator.setState(ElevatorState.DOOR_OPEN);
                            doorOpenTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                            elevator.deboardPassenger(1);
                            elevator.boardPassenger();
                            notifier.notifyDoorChange(elevator, true);
                            completeMatchingRequests(elevator.getId(), nextFloor);
                        }
                    } else if (currentState == ElevatorState.IDLE) {
                        determineNextElevatorState(elevator);
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
                    elevator.setState(ElevatorState.MOVING_UP);
                } else if (target < elevator.getCurrentFloor()) {
                    elevator.setDirection(Direction.DOWN);
                    elevator.setState(ElevatorState.MOVING_DOWN);
                } else {
                    elevator.setState(ElevatorState.DOOR_OPEN);
                    doorOpenTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                    elevator.boardPassenger();
                    notifier.notifyDoorChange(elevator, true);
                }
            }
        } finally {
            elevator.getLock().unlock();
        }
    }

    private void determineNextElevatorState(Elevator elevator) {
        Set<Integer> upStops = elevator.getUpStops();
        Set<Integer> downStops = elevator.getDownStops();

        if (elevator.getDirection() == Direction.UP) {
            if (!upStops.isEmpty()) {
                elevator.setState(ElevatorState.MOVING_UP);
            } else if (!downStops.isEmpty()) {
                elevator.setDirection(Direction.DOWN);
                elevator.setState(ElevatorState.MOVING_DOWN);
            } else {
                elevator.setDirection(Direction.IDLE);
                elevator.setState(ElevatorState.IDLE);
            }
        } else if (elevator.getDirection() == Direction.DOWN) {
            if (!downStops.isEmpty()) {
                elevator.setState(ElevatorState.MOVING_DOWN);
            } else if (!upStops.isEmpty()) {
                elevator.setDirection(Direction.UP);
                elevator.setState(ElevatorState.MOVING_UP);
            } else {
                elevator.setDirection(Direction.IDLE);
                elevator.setState(ElevatorState.IDLE);
            }
        } else {
            if (!upStops.isEmpty()) {
                int target = upStops.iterator().next();
                elevator.setDirection(target >= elevator.getCurrentFloor() ? Direction.UP : Direction.DOWN);
                elevator.setState(target >= elevator.getCurrentFloor() ? ElevatorState.MOVING_UP : ElevatorState.MOVING_DOWN);
            } else if (!downStops.isEmpty()) {
                int target = downStops.iterator().next();
                elevator.setDirection(target >= elevator.getCurrentFloor() ? Direction.UP : Direction.DOWN);
                elevator.setState(target >= elevator.getCurrentFloor() ? ElevatorState.MOVING_UP : ElevatorState.MOVING_DOWN);
            } else {
                elevator.setDirection(Direction.IDLE);
                elevator.setState(ElevatorState.IDLE);
            }
        }
    }

    private void drainPendingRequests() {
        Iterator<Request> iterator = pendingExternalRequests.iterator();
        while (iterator.hasNext()) {
            Request req = iterator.next();
            Elevator best = dispatchStrategy.selectOptimalElevator(
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
        Direction dir = sourceFloor < destinationFloor ? Direction.UP : Direction.DOWN;
        Elevator best = dispatchStrategy.selectOptimalElevator(new ArrayList<>(simElevators.values()), sourceFloor, dir, 1);

        Map<String, Object> details = new HashMap<>();
        details.put("sourceFloor", sourceFloor);
        details.put("destinationFloor", destinationFloor);
        details.put("direction", dir);

        if (best != null) {
            best.addStop(sourceFloor);
            best.addStop(destinationFloor);
            if (best.getState() == ElevatorState.IDLE) {
                best.setDirection(sourceFloor >= best.getCurrentFloor() ? Direction.UP : Direction.DOWN);
                best.setState(sourceFloor >= best.getCurrentFloor() ? ElevatorState.MOVING_UP : ElevatorState.MOVING_DOWN);
            }
            details.put("assignedElevator", best.getName());
            logSimEvent("ELEVATOR_ASSIGNED", "Requester at F" + sourceFloor, "Assigned request F" + sourceFloor + "->" + destinationFloor + " to " + best.getName(), details);
        } else {
            Request req = new Request(sourceFloor, destinationFloor);
            simPendingRequests.add(req);
            details.put("queued", true);
            logSimEvent("REQUEST_QUEUED", "Requester at F" + sourceFloor, "All elevators full or maintenance! Request queued for F" + sourceFloor, details);
        }

        return getSimSnapshots();
    }

    public Map<String, Object> simStep() {
        for (Elevator elevator : simElevators.values()) {
            if (elevator.getState() == ElevatorState.MAINTENANCE) continue;

            ElevatorState currentState = elevator.getState();
            if (currentState == ElevatorState.DOOR_OPEN) {
                int rem = simDoorTimers.getOrDefault(elevator.getId(), 0) - 1;
                if (rem <= 0) {
                    simDoorTimers.remove(elevator.getId());
                    determineNextElevatorState(elevator);
                } else {
                    simDoorTimers.put(elevator.getId(), rem);
                }
            } else if (currentState == ElevatorState.MOVING_UP || currentState == ElevatorState.MOVING_DOWN) {
                int next = (currentState == ElevatorState.MOVING_UP) ? elevator.getCurrentFloor() + 1 : elevator.getCurrentFloor() - 1;
                elevator.setCurrentFloor(next);

                if (elevator.getUpStops().contains(next) || elevator.getDownStops().contains(next)) {
                    elevator.removeStop(next);
                    elevator.setState(ElevatorState.DOOR_OPEN);
                    simDoorTimers.put(elevator.getId(), DOOR_OPEN_TICKS);
                    elevator.deboardPassenger(1);
                    elevator.boardPassenger();
                    logSimEvent("FLOOR_STOP", elevator.getName(), "Reached Floor " + next + ", doors opening for passenger boarding/deboarding", null);
                }
            } else if (currentState == ElevatorState.IDLE) {
                determineNextElevatorState(elevator);
            }
        }

        logSimEvent("TICK_STEP", "SimEngine", "Stepped simulation ticks for active elevators", null);
        return getSimSnapshots();
    }

    public Map<String, Object> simToggleMaintenance(long elevatorId, boolean maintenance) {
        Elevator elevator = simElevators.get(elevatorId);
        if (elevator != null) {
            elevator.setState(maintenance ? ElevatorState.MAINTENANCE : ElevatorState.IDLE);
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
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        Map<Long, ElevatorSnapshot> snapshots = new HashMap<>();
        for (Map.Entry<Long, Elevator> entry : simElevators.entrySet()) {
            snapshots.put(entry.getKey(), entry.getValue().createSnapshot());
        }
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data, snapshots);
        simEventLog.add(event);
    }
}
