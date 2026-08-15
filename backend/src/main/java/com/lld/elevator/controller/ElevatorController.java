package com.lld.elevator.controller;

import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.Request;
import com.lld.elevator.model.SimEvent;
import com.lld.elevator.service.ElevatorControllerService;
import com.lld.elevator.service.ElevatorService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/elevator")
@CrossOrigin(origins = "*")
public class ElevatorController {

    private final ElevatorService elevatorService;
    private final ElevatorControllerService controllerService;

    public ElevatorController(ElevatorService elevatorService, ElevatorControllerService controllerService) {
        this.elevatorService = elevatorService;
        this.controllerService = controllerService;
    }

    @GetMapping("/elevators")
    public List<Elevator> getElevators() {
        return elevatorService.getElevators();
    }

    @PostMapping("/request")
    public Request requestElevator(@RequestBody Map<String, Object> body) {
        int fromFloor = Integer.parseInt(body.get("fromFloor").toString());
        int toFloor = Integer.parseInt(body.get("toFloor").toString());
        return elevatorService.requestElevator(fromFloor, toFloor);
    }

    @PostMapping("/destination")
    public void selectDestination(@RequestBody Map<String, Object> body) {
        long elevatorId = Long.parseLong(body.get("elevatorId").toString());
        int destinationFloor = Integer.parseInt(body.get("destinationFloor").toString());
        controllerService.handleInternalRequest(elevatorId, destinationFloor);
    }

    @PostMapping("/maintenance")
    public void setMaintenance(@RequestBody Map<String, Object> body) {
        long elevatorId = Long.parseLong(body.get("elevatorId").toString());
        boolean maintenance = Boolean.parseBoolean(body.get("maintenance").toString());
        controllerService.setElevatorMaintenance(elevatorId, maintenance);
    }

    @GetMapping("/requests")
    public List<Request> getRequests() {
        return elevatorService.getRequests();
    }

    @PostMapping("/tick")
    public List<Elevator> tick() {
        return elevatorService.tick();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        controllerService.initSimState();
        return controllerService.getSimSnapshots();
    }

    @PostMapping("/sim/request")
    public Map<String, Object> simRequest(@RequestBody Map<String, Object> body) {
        int sourceFloor = Integer.parseInt(body.get("sourceFloor").toString());
        int destinationFloor = Integer.parseInt(body.get("destinationFloor").toString());
        return controllerService.simRequest(sourceFloor, destinationFloor);
    }

    @PostMapping("/sim/step")
    public Map<String, Object> simStep() {
        return controllerService.simStep();
    }

    @PostMapping("/sim/maintenance")
    public Map<String, Object> simMaintenance(@RequestBody Map<String, Object> body) {
        long elevatorId = Long.parseLong(body.get("elevatorId").toString());
        boolean maintenance = Boolean.parseBoolean(body.get("maintenance").toString());
        return controllerService.simToggleMaintenance(elevatorId, maintenance);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return controllerService.getSimEvents();
    }

    @GetMapping("/sim/snapshots")
    public Map<String, Object> simGetSnapshots() {
        return controllerService.getSimSnapshots();
    }
}
