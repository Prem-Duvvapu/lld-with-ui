package com.lld.parkinglot.service;

import com.lld.parkinglot.dto.ParkingSpotRequestDto;
import com.lld.parkinglot.exception.GateNotFoundException;
import com.lld.parkinglot.exception.InvalidGateTypeException;
import com.lld.parkinglot.exception.InvalidParkingRequestException;
import com.lld.parkinglot.exception.SpotNotAvailableException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.exception.VehicleTypeNotSupportedException;
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
            throw new InvalidParkingRequestException("Request body cannot be null");
        }
        return entry(dto.getGateId(), dto.getVehicleNumber(), dto.getVehicleType(), dto.getStrategy());
    }

    public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr) {
        return entry(gateId, vehicleNumber, vehicleTypeStr, "NEAREST");
    }

    public Ticket entry(String gateId, String vehicleNumber, String vehicleTypeStr, String strategyName) {
        Gate gate = requireGate(gateId, Gate.GateType.ENTRY);
        VehicleType vehicleType = parseVehicleType(vehicleTypeStr);

        SpotAssignmentStrategy strategy = spotStrategyFactory.getStrategy(strategyName);
        ParkingSpot spot = repository.occupySpot(vehicleType, strategy);
        if (spot == null) {
            throw new SpotNotAvailableException(vehicleType);
        }

        String ticketNumber = repository.generateTicketNumber();
        Ticket ticket = new Ticket(ticketNumber, vehicleNumber, vehicleType, spot.getId(), LocalDateTime.now());
        repository.saveTicket(ticket);

        return ticket;
    }

    // Step 1: Scan Ticket at Exit Gate (Calculates & shows price preview, spot NOT released yet)
    public Ticket scanTicket(String gateId, String ticketNumber, String pricingStrategyName) {
        requireGate(gateId, Gate.GateType.EXIT);

        Ticket ticket = repository.getTicket(ticketNumber);
        if (ticket == null) throw new TicketNotFoundException(ticketNumber);
        if (ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID || ticket.getExitTime() != null) {
            throw new TicketAlreadyExitedException(ticketNumber);
        }

        Ticket previewTicket = new Ticket(
                ticket.getTicketNumber(),
                ticket.getVehicleNumber(),
                ticket.getVehicleType(),
                ticket.getSpotId(),
                ticket.getEntryTime()
        );
        previewTicket.setExitTime(LocalDateTime.now());

        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName);
        double amount = pricingStrategy.calculatePrice(previewTicket);
        previewTicket.setAmount(amount);
        previewTicket.setPaymentStatus(Ticket.PaymentStatus.UNPAID);

        return previewTicket;
    }

    // Step 2: Pay Price and Complete Exit (Releases spot and marks paid). The not-found /
    // already-exited check and the PAID mutation happen atomically inside
    // ParkingLotRepository#completeExit — see its javadoc for why that has to be one lock
    // acquisition rather than "check here, then write".
    public Ticket payAndExit(String gateId, String ticketNumber, String pricingStrategyName, String paymentMethod) {
        requireGate(gateId, Gate.GateType.EXIT);

        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName);
        Ticket ticket = repository.completeExit(ticketNumber, LocalDateTime.now(), pricingStrategy, paymentMethod);
        repository.releaseSpot(ticket.getSpotId());

        return ticket;
    }

    // Single-step Exit for backwards compatibility
    public Ticket exit(String gateId, String ticketNumber) {
        return exit(gateId, ticketNumber, "HOURLY");
    }

    public Ticket exit(String gateId, String ticketNumber, String pricingStrategyName) {
        return payAndExit(gateId, ticketNumber, pricingStrategyName, "CASH");
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

    private Gate requireGate(String gateId, Gate.GateType expectedType) {
        Gate gate = repository.getGate(gateId);
        if (gate == null) throw new GateNotFoundException(gateId);
        if (gate.getType() != expectedType) throw new InvalidGateTypeException(gateId, expectedType);
        return gate;
    }

    private VehicleType parseVehicleType(String vehicleTypeStr) {
        if (vehicleTypeStr == null || vehicleTypeStr.isBlank()) {
            throw new InvalidParkingRequestException("Vehicle type cannot be null");
        }
        try {
            return VehicleType.valueOf(vehicleTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new VehicleTypeNotSupportedException(vehicleTypeStr);
        }
    }
}
