package com.lld.elevator.service;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.Request;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ElevatorSystem {

    private static volatile ElevatorSystem instance;
    private final ElevatorControllerService controller;

    public ElevatorSystem(ElevatorControllerService controller) {
        this.controller = controller;
        synchronized (ElevatorSystem.class) {
            instance = this;
        }
    }

    public static ElevatorSystem getInstance() {
        return instance;
    }

    public Request requestElevator(int sourceFloor, Direction direction) {
        return controller.handleExternalRequest(sourceFloor, direction);
    }

    public void selectDestination(long elevatorId, int destinationFloor) {
        controller.handleInternalRequest(elevatorId, destinationFloor);
    }

    public void toggleMaintenance(long elevatorId, boolean maintenance) {
        controller.setElevatorMaintenance(elevatorId, maintenance);
    }

    public List<Elevator> stepSimulation() {
        return controller.stepSimulation();
    }

    public List<Elevator> getStatus() {
        return controller.getElevators();
    }
}
