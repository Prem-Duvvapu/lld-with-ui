package com.elevator.service;

import com.elevator.model.Direction;
import com.elevator.model.Elevator;
import com.elevator.model.ElevatorStatus;
import com.elevator.model.Request;
import com.elevator.repository.ElevatorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ElevatorService {

    private static final int PENALTY_MISMATCH = 100;
    private static final int PENALTY_PASSED = 50;
    private static final int MAX_FLOOR = 10;
    private static final int MIN_FLOOR = 1;

    private final ElevatorRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public ElevatorService(ElevatorRepository repository) {
        this.repository = repository;
    }

    public List<Elevator> getElevators() {
        return repository.getAllElevators();
    }

    public Request requestElevator(int fromFloor, int toFloor) {
        lock.lock();
        try {
            Request request = new Request(fromFloor, toFloor);
            request.setId(repository.nextRequestId());

            Elevator best = findBestElevator(fromFloor, toFloor);
            if (best != null) {
                request.setAssignedElevatorId(best.getId());
                request.setStatus("ASSIGNED");
                best.addStop(fromFloor);
                best.addStop(toFloor);
                if (best.getDirection() == Direction.IDLE) {
                    best.setDirection(fromFloor > best.getCurrentFloor() ? Direction.UP : Direction.DOWN);
                    best.setStatus(ElevatorStatus.MOVING);
                }
                best.setDestinationFloor(toFloor);
                repository.saveElevator(best);
            }

            repository.saveRequest(request);
            return request;
        } finally {
            lock.unlock();
        }
    }

    public List<Request> getRequests() {
        return repository.getAllRequests();
    }

    public List<Elevator> tick() {
        lock.lock();
        try {
            for (Elevator elevator : repository.getAllElevators()) {
                if (elevator.getStatus() == ElevatorStatus.OUT_OF_ORDER) {
                    continue;
                }

                List<Integer> pending = elevator.getPendingFloors();

                if (pending.isEmpty()) {
                    if (elevator.getStatus() != ElevatorStatus.STOPPED) {
                        elevator.setDirection(Direction.IDLE);
                        elevator.setStatus(ElevatorStatus.STOPPED);
                    }
                    continue;
                }

                if (elevator.getDirection() == Direction.IDLE) {
                    int nextStop = pending.get(0);
                    if (nextStop > elevator.getCurrentFloor()) {
                        elevator.setDirection(Direction.UP);
                    } else if (nextStop < elevator.getCurrentFloor()) {
                        elevator.setDirection(Direction.DOWN);
                    }
                    elevator.setStatus(ElevatorStatus.MOVING);
                }

                if (elevator.getStatus() == ElevatorStatus.MOVING) {
                    int nextStop = pending.get(0);
                    if (elevator.getCurrentFloor() == nextStop) {
                        completeStop(elevator, nextStop);
                    } else {
                        if (elevator.getDirection() == Direction.UP) {
                            elevator.setCurrentFloor(elevator.getCurrentFloor() + 1);
                        } else {
                            elevator.setCurrentFloor(elevator.getCurrentFloor() - 1);
                        }
                        if (elevator.getCurrentFloor() == nextStop) {
                            completeStop(elevator, nextStop);
                        }
                    }
                }

                repository.saveElevator(elevator);
            }
            return repository.getAllElevators();
        } finally {
            lock.unlock();
        }
    }

    private void completeStop(Elevator elevator, int floor) {
        elevator.setCurrentFloor(floor);
        elevator.removeStop(floor);

        for (Request request : repository.getPendingRequests()) {
            if (request.getAssignedElevatorId() == elevator.getId()
                    && request.getToFloor() == floor
                    && "ASSIGNED".equals(request.getStatus())) {
                request.setStatus("COMPLETED");
                repository.saveRequest(request);
            }
        }

        if (elevator.getPendingFloors().isEmpty()) {
            elevator.setDirection(Direction.IDLE);
            elevator.setStatus(ElevatorStatus.STOPPED);
        } else {
            elevator.setStatus(ElevatorStatus.STOPPED);
            int nextStop = elevator.getPendingFloors().get(0);
            if (nextStop > elevator.getCurrentFloor()) {
                elevator.setDirection(Direction.UP);
            } else if (nextStop < elevator.getCurrentFloor()) {
                elevator.setDirection(Direction.DOWN);
            }
            elevator.setStatus(ElevatorStatus.MOVING);
        }
    }

    @Scheduled(fixedRate = 1500)
    public void scheduledTick() {
        tick();
    }

    private Elevator findBestElevator(int fromFloor, int toFloor) {
        Direction requestDir = fromFloor < toFloor ? Direction.UP : Direction.DOWN;
        double bestScore = Double.MAX_VALUE;
        Elevator best = null;

        for (Elevator elevator : repository.getAllElevators()) {
            if (elevator.getStatus() == ElevatorStatus.OUT_OF_ORDER || elevator.isFull()) {
                continue;
            }

            int dist = Math.abs(elevator.getCurrentFloor() - fromFloor);
            double score;

            if (elevator.getDirection() == Direction.IDLE) {
                score = dist;
            } else if (elevator.getDirection() == requestDir) {
                if (isOnWay(elevator, fromFloor, requestDir)) {
                    score = dist;
                } else {
                    score = dist + PENALTY_PASSED;
                }
            } else {
                score = dist + PENALTY_MISMATCH;
            }

            if (score < bestScore) {
                bestScore = score;
                best = elevator;
            }
        }

        return best;
    }

    private boolean isOnWay(Elevator elevator, int targetFloor, Direction direction) {
        if (direction == Direction.UP) {
            return elevator.getCurrentFloor() <= targetFloor;
        } else {
            return elevator.getCurrentFloor() >= targetFloor;
        }
    }
}
