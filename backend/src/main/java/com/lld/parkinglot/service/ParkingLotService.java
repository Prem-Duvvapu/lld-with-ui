package com.lld.parkinglot.service;

import com.lld.parkinglot.dto.ParkingSpotRequestDto;
import com.lld.parkinglot.model.*;
import com.lld.parkinglot.repository.ParkingLotRepository;
import com.lld.parkinglot.strategy.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ParkingLotService {

    private final ParkingLotRepository repository;
    private final SpotAssignmentStrategyFactory spotStrategyFactory;
    private final PricingStrategyFactory pricingStrategyFactory;

    @Autowired
    public ParkingLotService(ParkingLotRepository repository, SpotAssignmentStrategyFactory spotStrategyFactory, PricingStrategyFactory pricingStrategyFactory) {
        this.repository = repository;
        this.spotStrategyFactory = spotStrategyFactory;
        this.pricingStrategyFactory = pricingStrategyFactory;
    }

    public ParkingLotService(ParkingLotRepository repository) {
        this(repository,
             new SpotAssignmentStrategyFactory(new NearestSpotStrategy(), new FarthestSpotStrategy()),
             new PricingStrategyFactory(new HourlyPricingStrategy(), new FlatRatePricingStrategy(), new DynamicPricingStrategy()));
    }

    public Ticket entry(ParkingSpotRequestDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Request body cannot be null");
        }
        return entry(dto.getGateId(), dto.getVehicleNumber(), dto.getVehicleType(), dto.getStrategy());
    }

    public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr) {
        return entry(gateId, vehicleNumber, vehicleTypeStr, "NEAREST");
    }

    public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr, String strategyName) {
        Gate gate = repository.getGate(gateId);
        if (gate == null) throw new IllegalArgumentException("Invalid gate: " + gateId);
        if (gate.getType() != Gate.GateType.ENTRY) throw new IllegalArgumentException("Not an entry gate");

        if (vehicleTypeStr == null) throw new IllegalArgumentException("Vehicle type cannot be null");
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());

        SpotAssignmentStrategy strategy = spotStrategyFactory.getStrategy(strategyName);
        ParkingSpot spot = repository.occupySpot(vehicleType, strategy);
        if (spot == null) {
            throw new IllegalStateException("No available spot for vehicle type: " + vehicleType);
        }

        String ticketNumber = repository.generateTicketNumber();
        Ticket ticket = new Ticket(ticketNumber, vehicleNumber, vehicleType, spot.getId(), LocalDateTime.now());
        repository.saveTicket(ticket);

        return ticket;
    }

    public Ticket exit(String gateId, String ticketNumber) {
        return exit(gateId, ticketNumber, "HOURLY");
    }

    public Ticket exit(String gateId, String ticketNumber, String pricingStrategyName) {
        Gate gate = repository.getGate(gateId);
        if (gate == null) throw new IllegalArgumentException("Invalid gate: " + gateId);
        if (gate.getType() != Gate.GateType.EXIT) throw new IllegalArgumentException("Not an exit gate");

        Ticket ticket = repository.getTicket(ticketNumber);
        if (ticket == null) throw new IllegalArgumentException("Invalid ticket: " + ticketNumber);
        if (ticket.getExitTime() != null) throw new IllegalStateException("Ticket already used for exit");

        LocalDateTime exitTime = LocalDateTime.now();
        ticket.setExitTime(exitTime);

        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName);
        double amount = pricingStrategy.calculatePrice(ticket);
        ticket.setAmount(amount);

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
