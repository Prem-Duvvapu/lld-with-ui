package com.lld.parkinglot.service;

import com.lld.parkinglot.model.*;
import com.lld.parkinglot.repository.ParkingLotRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ParkingLotService {

    private static final double HOURLY_RATE_CAR = 20.0;
    private static final double HOURLY_RATE_BIKE = 10.0;
    private static final double HOURLY_RATE_TRUCK = 40.0;

    private final ParkingLotRepository repository;

    public ParkingLotService(ParkingLotRepository repository) {
        this.repository = repository;
    }

    public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr) {
        Gate gate = repository.getGate(gateId);
        if (gate == null) throw new IllegalArgumentException("Invalid gate: " + gateId);
        if (gate.getType() != Gate.GateType.ENTRY) throw new IllegalArgumentException("Not an entry gate");

        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());

        ParkingSpot spot = repository.occupySpot(vehicleType.name());
        if (spot == null) {
            throw new IllegalStateException("No available spot for vehicle type: " + vehicleType);
        }

        String ticketNumber = repository.generateTicketNumber();
        Ticket ticket = new Ticket(ticketNumber, vehicleNumber, vehicleType, spot.getId(), LocalDateTime.now());
        repository.saveTicket(ticket);

        return ticket;
    }

    public Ticket exit(String gateId, String ticketNumber) {
        Gate gate = repository.getGate(gateId);
        if (gate == null) throw new IllegalArgumentException("Invalid gate: " + gateId);
        if (gate.getType() != Gate.GateType.EXIT) throw new IllegalArgumentException("Not an exit gate");

        Ticket ticket = repository.getTicket(ticketNumber);
        if (ticket == null) throw new IllegalArgumentException("Invalid ticket: " + ticketNumber);
        if (ticket.getExitTime() != null) throw new IllegalStateException("Ticket already used for exit");

        LocalDateTime exitTime = LocalDateTime.now();
        long hours = ChronoUnit.HOURS.between(ticket.getEntryTime(), exitTime);
        if (hours < 1) hours = 1;

        double rate = switch (ticket.getVehicleType()) {
            case CAR -> HOURLY_RATE_CAR;
            case BIKE -> HOURLY_RATE_BIKE;
            case TRUCK -> HOURLY_RATE_TRUCK;
        };

        ticket.setExitTime(exitTime);
        ticket.setAmount(hours * rate);
        repository.updateTicket(ticket);

        repository.releaseSpot(ticket.getSpotId());

        return ticket;
    }

    public List<Gate> getGates() {
        return repository.getAllGates();
    }

    public List<Floor> getFloors() {
        return repository.getAllFloors();
    }

    public List<ParkingSpot> getAvailableSpots() {
        return repository.getAvailableSpots();
    }

    public List<ParkingSpot> getAvailableSpotsByType(String vehicleType) {
        return repository.getAvailableSpotsByType(vehicleType);
    }

    public List<Ticket> getActiveTickets() {
        return repository.getActiveTickets();
    }
}
