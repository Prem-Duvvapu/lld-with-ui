package com.lld.parkinglot.repository;

import com.lld.parkinglot.model.Floor;
import com.lld.parkinglot.model.Gate;
import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.Ticket;
import org.springframework.stereotype.Repository;

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
    private final ReentrantLock spotLock = new ReentrantLock();
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

    public ParkingSpot occupySpot(String vehicleTypeStr) {
        spotLock.lock();
        try {
            ParkingSpot spot = spots.values().stream()
                    .filter(s -> !s.isOccupied() && s.getVehicleType().name().equalsIgnoreCase(vehicleTypeStr))
                    .findFirst()
                    .orElse(null);
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
            if (spot != null) {
                spot.setOccupied(false);
            }
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

    public List<Ticket> getActiveTickets() {
        return tickets.values().stream()
                .filter(t -> t.getExitTime() == null)
                .sorted(Comparator.comparing(Ticket::getEntryTime).reversed())
                .collect(Collectors.toList());
    }
}
