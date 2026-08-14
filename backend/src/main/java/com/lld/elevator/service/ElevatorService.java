package com.lld.elevator.service;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.Request;
import com.lld.elevator.repository.ElevatorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

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

    public Request requestElevator(int fromFloor, int toFloor) {
        Direction dir = fromFloor < toFloor ? Direction.UP : Direction.DOWN;
        Request req = controller.handleExternalRequest(fromFloor, dir);
        if (req.getAssignedElevatorId() > 0) {
            controller.handleInternalRequest(req.getAssignedElevatorId(), toFloor);
        }
        return req;
    }

    public List<Request> getRequests() {
        return repository.getAllRequests();
    }

    public List<Elevator> tick() {
        return controller.stepSimulation();
    }

    @Scheduled(fixedRate = 1500)
    public void scheduledTick() {
        tick();
    }
}
