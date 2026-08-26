package com.lld.airline.controller;

import com.lld.airline.enums.FareType;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Passenger;
import com.lld.airline.model.Seat;
import com.lld.airline.model.SimEvent;
import com.lld.airline.service.AirlineService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/airline")
@CrossOrigin(origins = "*")
public class AirlineController {

    private final AirlineService airlineService;

    public AirlineController(AirlineService airlineService) {
        this.airlineService = airlineService;
    }

    // =========================================================================
    // FLIGHTS & SEATS
    // =========================================================================

    @GetMapping("/flights")
    public ResponseEntity<List<Flight>> getAllFlights() {
        return ResponseEntity.ok(airlineService.getAllFlights());
    }

    @GetMapping("/flights/search")
    public ResponseEntity<List<Flight>> searchFlights(
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(airlineService.searchFlights(source, destination, date));
    }

    @GetMapping("/flights/{flightId}")
    public ResponseEntity<Flight> getFlight(@PathVariable String flightId) {
        return ResponseEntity.ok(airlineService.getFlight(flightId));
    }

    @GetMapping("/flights/{flightId}/seats")
    public ResponseEntity<List<Seat>> getFlightSeats(@PathVariable String flightId) {
        Flight flight = airlineService.getFlight(flightId);
        return ResponseEntity.ok(flight.getAllSeats());
    }

    // =========================================================================
    // HOLD & BOOKING WORKFLOWS
    // =========================================================================

    @PostMapping("/flights/{flightId}/hold")
    public ResponseEntity<Map<String, Object>> holdSeats(
            @PathVariable String flightId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> seatNumbers = (List<String>) body.get("seatNumbers");
        String userId = (String) body.getOrDefault("userId", "guest-user");

        airlineService.holdSeats(flightId, seatNumbers, userId);
        return ResponseEntity.ok(Map.of(
                "status", "HELD",
                "flightId", flightId,
                "seatNumbers", seatNumbers,
                "holdDurationSeconds", 300
        ));
    }

    @PostMapping("/bookings")
    public ResponseEntity<Booking> bookFlight(@RequestBody Map<String, Object> body) {
        String flightId = (String) body.get("flightId");
        String userId = (String) body.getOrDefault("userId", "guest-user");
        String paymentMethod = (String) body.getOrDefault("paymentMethod", "CARD");
        String idempotencyKey = (String) body.getOrDefault("idempotencyKey", UUID.randomUUID().toString());
        FareType fareType = parseFareType((String) body.get("fareType"));

        @SuppressWarnings("unchecked")
        List<String> seatNumbers = (List<String>) body.get("seatNumbers");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> passengerMaps = (List<Map<String, String>>) body.get("passengers");

        List<Passenger> passengers;
        if (passengerMaps != null && !passengerMaps.isEmpty()) {
            passengers = passengerMaps.stream()
                    .map(pm -> Passenger.builder()
                            .passengerId(pm.getOrDefault("passengerId", UUID.randomUUID().toString().substring(0, 8)))
                            .name(pm.getOrDefault("name", "Passenger"))
                            .email(pm.getOrDefault("email", "passenger@air.com"))
                            .passportOrId(pm.getOrDefault("passportOrId", "ID-" + UUID.randomUUID().toString().substring(0, 6)))
                            .build())
                    .toList();
        } else {
            // Default generated passenger per seat
            passengers = seatNumbers.stream()
                    .map(s -> Passenger.builder()
                            .passengerId("P-" + s)
                            .name("Passenger " + s)
                            .email("p" + s + "@air.com")
                            .passportOrId("ID-" + s)
                            .build())
                    .toList();
        }

        Booking booking = airlineService.bookFlight(flightId, seatNumbers, passengers, userId, paymentMethod, idempotencyKey, fareType);
        return ResponseEntity.ok(booking);
    }

    @PostMapping("/bookings/{bookingId}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable String bookingId) {
        Booking cancelled = airlineService.cancelBooking(bookingId);
        return ResponseEntity.ok(cancelled);
    }

    @GetMapping("/users/{userId}/bookings")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable String userId) {
        return ResponseEntity.ok(airlineService.getUserBookings(userId));
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<Booking> getBooking(@PathVariable String bookingId) {
        return ResponseEntity.ok(airlineService.getBooking(bookingId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        airlineService.simReset();
        return ResponseEntity.ok(airlineService.getSimSnapshots());
    }

    @PostMapping("/sim/hold")
    public ResponseEntity<Map<String, Object>> simHold(@RequestBody Map<String, Object> body) {
        String flightId = (String) body.getOrDefault("flightId", "SIM-AI-202");
        String userId = (String) body.getOrDefault("userId", "Sim-User-1");
        @SuppressWarnings("unchecked")
        List<String> seats = (List<String>) body.get("seatNumbers");
        return ResponseEntity.ok(airlineService.simHold(flightId, seats, userId));
    }

    @PostMapping("/sim/book")
    public ResponseEntity<Map<String, Object>> simBook(@RequestBody Map<String, Object> body) {
        String flightId = (String) body.getOrDefault("flightId", "SIM-AI-202");
        String userId = (String) body.getOrDefault("userId", "Sim-User-1");
        String passengerName = (String) body.getOrDefault("passengerName", "Sim Passenger");
        FareType fareType = parseFareType((String) body.get("fareType"));
        @SuppressWarnings("unchecked")
        List<String> seats = (List<String>) body.get("seatNumbers");
        return ResponseEntity.ok(airlineService.simBook(flightId, seats, passengerName, userId, fareType));
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<Map<String, Object>> simCancel(@RequestBody Map<String, Object> body) {
        String bookingId = (String) body.get("bookingId");
        int hours = body.get("hoursBeforeDeparture") != null ?
                Integer.parseInt(body.get("hoursBeforeDeparture").toString()) : 25;
        return ResponseEntity.ok(airlineService.simCancel(bookingId, hours));
    }

    @PostMapping("/sim/expire")
    public ResponseEntity<Map<String, Object>> simExpire(@RequestBody(required = false) Map<String, String> body) {
        String flightId = body != null ? body.getOrDefault("flightId", "SIM-AI-202") : "SIM-AI-202";
        return ResponseEntity.ok(airlineService.simExpireHold(flightId));
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(airlineService.getSimSnapshots());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(airlineService.getSimEvents());
    }

    private FareType parseFareType(String raw) {
        if (raw == null || raw.isBlank()) return FareType.FLEXIBLE;
        try {
            return FareType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return FareType.FLEXIBLE;
        }
    }
}
