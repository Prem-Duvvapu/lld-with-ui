package com.lld.airline.model;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class Flight {
    private final String flightId;
    private final String flightNumber;
    private final String source;
    private final String destination;
    private final LocalDateTime departureTime;
    private final LocalDateTime arrivalTime;
    private final Aircraft aircraft;
    private final Map<String, Seat> seats = new ConcurrentHashMap<>();

    public Flight(String flightId, String flightNumber, String source, String destination,
                  LocalDateTime departureTime, LocalDateTime arrivalTime, Aircraft aircraft) {
        this.flightId = flightId;
        this.flightNumber = flightNumber;
        this.source = source != null ? source.toUpperCase() : "DEL";
        this.destination = destination != null ? destination.toUpperCase() : "BOM";
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.aircraft = aircraft;

        // Generate independent per-flight Seat instances from Aircraft SeatTemplate
        if (aircraft != null) {
            for (SeatTemplate template : aircraft.getSeatTemplates()) {
                double basePrice = calculateDefaultPrice(template.getSeatClass());
                Seat seat = new Seat(template.getSeatNumber(), template.getSeatClass(), basePrice);
                seats.put(seat.getSeatNumber(), seat);
            }
        }
    }

    private double calculateDefaultPrice(com.lld.airline.enums.SeatClass seatClass) {
        if (seatClass == null) return 4500.0;
        switch (seatClass) {
            case FIRST: return 22500.0;
            case BUSINESS: return 13500.0;
            case PREMIUM_ECONOMY: return 6750.0;
            case ECONOMY:
            default: return 4500.0;
        }
    }

    public String getFlightId() {
        return flightId;
    }

    public String getFlightNumber() {
        return flightNumber;
    }

    public String getSource() {
        return source;
    }

    public String getDestination() {
        return destination;
    }

    public LocalDateTime getDepartureTime() {
        return departureTime;
    }

    public LocalDateTime getArrivalTime() {
        return arrivalTime;
    }

    public Aircraft getAircraft() {
        return aircraft;
    }

    public List<Seat> getAllSeats() {
        return new ArrayList<>(seats.values());
    }

    public Seat getSeat(String seatNumber) {
        return seats.get(seatNumber);
    }

    public int getAvailableSeatsCount() {
        long now = System.currentTimeMillis();
        return (int) seats.values().stream().filter(s -> s.isAvailable(now)).count();
    }
}
