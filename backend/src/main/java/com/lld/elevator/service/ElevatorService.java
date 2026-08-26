package com.lld.elevator.service;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.Request;
import com.lld.elevator.repository.ElevatorRepository;
import com.lld.elevator.strategy.DispatchPolicy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/** Thin facade the controller delegates to for the real (non-sim) elevator bank. */
@Service
public class ElevatorService {

    private final ElevatorRepository repository;
    private final ElevatorControllerService controller;

    public ElevatorService(ElevatorRepository repository, ElevatorControllerService controller) {
        this.repository = repository;
        this.controller = controller;
    }

    public List<Elevator> getElevators() {
        return controller.getElevators();
    }

    /** One call: the dispatched car gets both the pickup and destination stops immediately. */
    public Request requestElevator(int fromFloor, int toFloor) {
        return controller.handleExternalRequest(fromFloor, toFloor);
    }

    public List<Request> getRequests() {
        return repository.getAllRequests();
    }

    public List<Elevator> tick() {
        return controller.stepSimulation();
    }

    public DispatchPolicy getDispatchPolicy() {
        return controller.getDispatchPolicy();
    }

    public void setDispatchPolicy(DispatchPolicy policy) {
        controller.setDispatchPolicy(policy);
    }

    @Scheduled(fixedRate = 1500)
    public void scheduledTick() {
        tick();
    }
}
