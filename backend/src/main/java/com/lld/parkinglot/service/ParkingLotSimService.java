package com.lld.parkinglot.service;

import com.lld.parkinglot.exception.InvalidParkingRequestException;
import com.lld.parkinglot.exception.SpotNotAvailableException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.exception.VehicleTypeNotSupportedException;
import com.lld.parkinglot.model.*;
import com.lld.parkinglot.strategy.PricingStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
import com.lld.parkinglot.strategy.SpotAssignmentStrategy;
import com.lld.parkinglot.strategy.SpotAssignmentStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

/**
 * Isolated {@code /sim/*} sandbox: its own two-floor, ten-spot lot, its own gates and tickets,
 * entirely separate from {@link ParkingLotService}'s live repository, so a demo run driven from
 * the frontend's simulation tab can never occupy a spot or issue a ticket a real caller would see.
 *
 * <p>Reuses the same {@link SpotAssignmentStrategyFactory} / {@link PricingStrategyFactory} beans
 * as the live service — the strategies and their math are shared; only the state they operate on
 * is sandboxed. Mirrors {@code trafficsignal}/{@code elevator}'s sim-engine shape: an in-memory
 * event log a step at a time, reset on demand.
 */
@Service
public class ParkingLotSimService {

    private static final String ENTRY_GATE_ID = "SIM-G1";
    private static final String EXIT_GATE_ID = "SIM-G2";

    private final SpotAssignmentStrategyFactory spotStrategyFactory;
    private final PricingStrategyFactory pricingStrategyFactory;

    private final Map<String, ParkingSpot> simSpots = new ConcurrentHashMap<>();
    private final Map<String, Ticket> simTickets = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final ReentrantLock simSpotLock = new ReentrantLock();
    private final ReentrantLock simTicketLock = new ReentrantLock();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private int simTicketCounter = 0;

    public ParkingLotSimService(SpotAssignmentStrategyFactory spotStrategyFactory, PricingStrategyFactory pricingStrategyFactory) {
        this.spotStrategyFactory = spotStrategyFactory;
        this.pricingStrategyFactory = pricingStrategyFactory;
        reset();
    }

    public Map<String, Object> reset() {
        simSpots.clear();
        simTickets.clear();
        simEventLog.clear();
        simTicketCounter = 0;

        for (int floorNum = 1; floorNum <= 2; floorNum++) {
            for (int i = 1; i <= 2; i++) {
                simSpots.put("SF" + floorNum + "-C" + i, new ParkingSpot("SF" + floorNum + "-C" + i, floorNum, i, VehicleType.CAR));
            }
            for (int i = 1; i <= 2; i++) {
                simSpots.put("SF" + floorNum + "-B" + i, new ParkingSpot("SF" + floorNum + "-B" + i, floorNum, i, VehicleType.BIKE));
            }
            simSpots.put("SF" + floorNum + "-T1", new ParkingSpot("SF" + floorNum + "-T1", floorNum, 1, VehicleType.TRUCK));
        }

        logEvent("SIM_RESET", "System", "Sandbox reset: 2 floors, 10 spots (4 CAR, 4 BIKE, 2 TRUCK), gates " + ENTRY_GATE_ID + "/" + EXIT_GATE_ID, null);
        return getState();
    }

    public Map<String, Object> entry(String vehicleNumber, String vehicleTypeStr, String spotStrategyName) {
        VehicleType vehicleType = parseVehicleType(vehicleTypeStr);
        SpotAssignmentStrategy strategy = spotStrategyFactory.getStrategy(spotStrategyName);

        ParkingSpot spot;
        String ticketNumber;
        Ticket ticket;
        simSpotLock.lock();
        try {
            List<ParkingSpot> available = simSpots.values().stream().filter(s -> !s.isOccupied()).collect(Collectors.toList());
            spot = strategy.findSpot(available, vehicleType);
            if (spot == null) {
                logEvent("ENTRY_REJECTED", vehicleNumber, "No available " + vehicleType + " spot for " + vehicleNumber, null);
                throw new SpotNotAvailableException(vehicleType);
            }
            spot.setOccupied(true);
        } finally {
            simSpotLock.unlock();
        }

        simTicketLock.lock();
        try {
            simTicketCounter++;
            ticketNumber = "SIM-TKT-" + String.format("%05d", simTicketCounter);
        } finally {
            simTicketLock.unlock();
        }

        ticket = new Ticket(ticketNumber, vehicleNumber, vehicleType, spot.getId(), LocalDateTime.now());
        simTickets.put(ticketNumber, ticket);

        Map<String, Object> details = new HashMap<>();
        details.put("ticketNumber", ticketNumber);
        details.put("spotId", spot.getId());
        details.put("vehicleType", vehicleType);
        logEvent("VEHICLE_ENTERED", vehicleNumber, vehicleNumber + " entered at " + ENTRY_GATE_ID + ", assigned spot " + spot.getId() + ", ticket " + ticketNumber, details);

        return getState();
    }

    public Map<String, Object> scan(String ticketNumber, String pricingStrategyName) {
        Ticket ticket = simTickets.get(ticketNumber);
        if (ticket == null) throw new TicketNotFoundException(ticketNumber);
        if (ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID || ticket.getExitTime() != null) {
            throw new TicketAlreadyExitedException(ticketNumber);
        }

        Ticket preview = new Ticket(ticket.getTicketNumber(), ticket.getVehicleNumber(), ticket.getVehicleType(), ticket.getSpotId(), ticket.getEntryTime());
        preview.setExitTime(LocalDateTime.now());
        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName);
        double amount = pricingStrategy.calculatePrice(preview);

        Map<String, Object> details = new HashMap<>();
        details.put("ticketNumber", ticketNumber);
        details.put("amount", amount);
        logEvent("TICKET_SCANNED", ticket.getVehicleNumber(), "Ticket " + ticketNumber + " scanned at " + EXIT_GATE_ID + " — preview ₹" + amount, details);

        Map<String, Object> result = getState();
        result.put("previewAmount", amount);
        result.put("previewTicketNumber", ticketNumber);
        return result;
    }

    public Map<String, Object> pay(String ticketNumber, String pricingStrategyName, String paymentMethod) {
        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(pricingStrategyName);

        Ticket ticket;
        simTicketLock.lock();
        try {
            ticket = simTickets.get(ticketNumber);
            if (ticket == null) throw new TicketNotFoundException(ticketNumber);
            if (ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID || ticket.getExitTime() != null) {
                throw new TicketAlreadyExitedException(ticketNumber);
            }
            ticket.setExitTime(LocalDateTime.now());
            double amount = pricingStrategy.calculatePrice(ticket);
            ticket.setAmount(amount);
            ticket.setPaymentStatus(Ticket.PaymentStatus.PAID);
            ticket.setPaymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod : "CASH");
        } finally {
            simTicketLock.unlock();
        }

        simSpotLock.lock();
        try {
            ParkingSpot spot = simSpots.get(ticket.getSpotId());
            if (spot != null) spot.setOccupied(false);
        } finally {
            simSpotLock.unlock();
        }

        Map<String, Object> details = new HashMap<>();
        details.put("ticketNumber", ticketNumber);
        details.put("amount", ticket.getAmount());
        details.put("paymentMethod", ticket.getPaymentMethod());
        logEvent("VEHICLE_EXITED", ticket.getVehicleNumber(), ticket.getVehicleNumber() + " paid ₹" + ticket.getAmount() + " via " + ticket.getPaymentMethod() + " and exited " + EXIT_GATE_ID + ", spot " + ticket.getSpotId() + " released", details);

        return getState();
    }

    public Map<String, Object> getState() {
        Map<String, Object> state = new HashMap<>();
        state.put("entryGateId", ENTRY_GATE_ID);
        state.put("exitGateId", EXIT_GATE_ID);
        state.put("spots", new ArrayList<>(simSpots.values()));
        state.put("activeTickets", simTickets.values().stream()
                .filter(t -> t.getExitTime() == null)
                .sorted(Comparator.comparing(Ticket::getEntryTime).reversed())
                .collect(Collectors.toList()));
        state.put("events", simEventLog);
        return state;
    }

    public List<SimEvent> getEvents() {
        return simEventLog;
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

    private void logEvent(String type, String actor, String description, Map<String, Object> data) {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        simEventLog.add(SimEvent.builder()
                .id(simEventIdGen.getAndIncrement())
                .timestamp(ts)
                .eventType(type)
                .actorName(actor)
                .description(description)
                .data(data)
                .build());
    }
}
