package com.elevator.controller;

import com.elevator.model.Elevator;
import com.elevator.model.Request;
import com.elevator.service.ElevatorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/elevator")
public class ElevatorController {

    private final ElevatorService elevatorService;

    public ElevatorController(ElevatorService elevatorService) {
        this.elevatorService = elevatorService;
    }

    @GetMapping("/elevators")
    public List<Elevator> getElevators() {
        return elevatorService.getElevators();
    }

    @PostMapping("/request")
    public Request requestElevator(@RequestBody Map<String, Integer> body) {
        int fromFloor = body.get("fromFloor");
        int toFloor = body.get("toFloor");
        return elevatorService.requestElevator(fromFloor, toFloor);
    }

    @GetMapping("/requests")
    public List<Request> getRequests() {
        return elevatorService.getRequests();
    }

    @PostMapping("/tick")
    public List<Elevator> tick() {
        return elevatorService.tick();
    }
}
