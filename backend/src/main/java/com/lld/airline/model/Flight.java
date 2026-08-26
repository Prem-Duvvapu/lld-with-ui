package com.lld.airline.model;

import com.lld.airline.strategy.PricingStrategy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Flight {
    private String flightId;
    private String flightNumber;
    private String source;
    private String destination;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private Aircraft aircraft;
    @Builder.Default
    private Map<String, Seat> seats = new ConcurrentHashMap<>();

    /**
     * Builds a flight and materializes one independent {@link Seat} per {@link SeatTemplate} on its
     * aircraft, priced through the given {@link PricingStrategy} — the strategy that actually decides
     * fares, not a hardcoded per-class switch duplicated on this class.
     */
    public static Flight create(String flightId, String flightNumber, String source, String destination,
                                 LocalDateTime departureTime, LocalDateTime arrivalTime, Aircraft aircraft,
                                 PricingStrategy pricingStrategy) {
        Flight flight = Flight.builder()
                .flightId(flightId)
                .flightNumber(flightNumber)
                .source(source != null ? source.toUpperCase() : "DEL")
                .destination(destination != null ? destination.toUpperCase() : "BOM")
                .departureTime(departureTime)
                .arrivalTime(arrivalTime)
                .aircraft(aircraft)
                .build();

        if (aircraft != null && aircraft.getSeatTemplates() != null) {
            for (SeatTemplate template : aircraft.getSeatTemplates()) {
                double basePrice = pricingStrategy.calculateSeatPrice(template, flight);
                Seat seat = Seat.builder()
                        .seatNumber(template.getSeatNumber())
                        .seatClass(template.getSeatClass())
                        .basePrice(basePrice)
                        .build();
                flight.seats.put(seat.getSeatNumber(), seat);
            }
        }
        return flight;
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
