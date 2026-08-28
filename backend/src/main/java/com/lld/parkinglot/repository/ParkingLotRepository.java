package com.lld.parkinglot.repository;

import com.lld.parkinglot.exception.SpotNotFoundException;
import com.lld.parkinglot.exception.TicketAlreadyExitedException;
import com.lld.parkinglot.exception.TicketNotFoundException;
import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.Gate;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.model.VehicleType;
import com.lld.parkinglot.strategy.PricingStrategy;
import com.lld.parkinglot.strategy.SpotAssignmentStrategy;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class ParkingLotRepository {

    private final Map<String, Floor> floors = new LinkedHashMap<>();
    private final Map<String, ParkingSpot> spots = new ConcurrentHashMap<>();
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final Map<String, Gate> gates = new LinkedHashMap<>();

    // occupySpot/releaseSpot must be atomic across the *whole* available-spot search, not just a
    // single spot's flag flip — two vehicles racing for the last spot of a type both read
    // "available" before either writes unless the whole search-then-claim happens under one lock.
    // A per-spot lock cannot provide that: the strategy has to scan every spot's occupied flag to
    // pick one, so the thing that needs mutual exclusion is the search itself.
    private final ReentrantLock spotLock = new ReentrantLock();

    // Guards ticket-number generation *and* the exit check-then-act (see completeExit): two
    // concurrent payAndExit calls for the same ticket must not both observe "not yet paid" and
    // both release the spot / charge the vehicle.
    private final ReentrantLock ticketLock = new ReentrantLock();
    private int ticketCounter = 0;

    public void addFloor(Floor floor) {
        floors.put(String.valueOf(floor.getFloorNumber()), floor);
        for (ParkingSpot spot : floor.getSpots()) {
            spots.put(spot.getId(), spot);
        }
    }

    public void addGate(Gate gate) {
        gates.put(gate.getId(), gate);
    }

    public List<Gate> getAllGates() {
        return new ArrayList<>(gates.values());
    }

    public Gate getGate(String id) {
        return gates.get(id);
    }

    public List<Floor> getAllFloors() {
        return new ArrayList<>(floors.values());
    }

    public List<ParkingSpot> getAvailableSpots() {
        return spots.values().stream()
                .filter(s -> !s.isOccupied())
                .collect(Collectors.toList());
    }

    public List<ParkingSpot> getAvailableSpotsByType(String vehicleType) {
        return spots.values().stream()
                .filter(s -> !s.isOccupied() && s.getVehicleType().name().equalsIgnoreCase(vehicleType))
                .collect(Collectors.toList());
    }

    /** Atomically searches and claims a spot. Returns {@code null} when none is free — the
     *  service maps that to {@link com.lld.parkinglot.exception.SpotNotAvailableException}. */
    public ParkingSpot occupySpot(VehicleType vehicleType, SpotAssignmentStrategy strategy) {
        spotLock.lock();
        try {
            List<ParkingSpot> available = getAvailableSpots();
            ParkingSpot spot = strategy.findSpot(available, vehicleType);
            if (spot != null) {
                spot.setOccupied(true);
            }
            return spot;
        } finally {
            spotLock.unlock();
        }
    }

    public void releaseSpot(String spotId) {
        spotLock.lock();
        try {
            ParkingSpot spot = spots.get(spotId);
            if (spot == null) {
                throw new SpotNotFoundException(spotId);
            }
            spot.setOccupied(false);
        } finally {
            spotLock.unlock();
        }
    }

    public ParkingSpot getSpot(String spotId) {
        return spots.get(spotId);
    }

    public String generateTicketNumber() {
        ticketLock.lock();
        try {
            ticketCounter++;
            return "TKT-" + String.format("%05d", ticketCounter);
        } finally {
            ticketLock.unlock();
        }
    }

    public void saveTicket(Ticket ticket) {
        tickets.put(ticket.getTicketNumber(), ticket);
    }

    public Ticket getTicket(String ticketNumber) {
        return tickets.get(ticketNumber);
    }

    public void updateTicket(Ticket ticket) {
        tickets.put(ticket.getTicketNumber(), ticket);
    }

    /**
     * Atomically validates and finalizes an exit: not-found and already-exited are checked and
     * the ticket is mutated to PAID under the same {@link #ticketLock} acquisition, closing the
     * classic double-exit race — two threads calling this for the same ticket concurrently must
     * see exactly one success and one {@link TicketAlreadyExitedException}. Pricing is computed
     * here, inside the lock, rather than by the caller beforehand, precisely so the "is this
     * ticket still payable" check and the "mark it paid" write can never be split by a second
     * thread's interleaving write.
     */
    public Ticket completeExit(String ticketNumber, LocalDateTime exitTime, PricingStrategy pricingStrategy, String paymentMethod) {
        ticketLock.lock();
        try {
            Ticket ticket = tickets.get(ticketNumber);
            if (ticket == null) {
                throw new TicketNotFoundException(ticketNumber);
            }
            if (ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID || ticket.getExitTime() != null) {
                throw new TicketAlreadyExitedException(ticketNumber);
            }

            ticket.setExitTime(exitTime);
            double amount = pricingStrategy.calculatePrice(ticket);
            ticket.setAmount(amount);
            ticket.setPaymentStatus(Ticket.PaymentStatus.PAID);
            ticket.setPaymentMethod(paymentMethod != null && !paymentMethod.isBlank() ? paymentMethod : "CASH");
            return ticket;
        } finally {
            ticketLock.unlock();
        }
    }

    public List<Ticket> getActiveTickets() {
        return tickets.values().stream()
                .filter(t -> t.getExitTime() == null)
                .sorted(Comparator.comparing(Ticket::getEntryTime).reversed())
                .collect(Collectors.toList());
    }
}
