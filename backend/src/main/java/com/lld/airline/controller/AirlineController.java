package com.lld.airline.controller;

import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Seat;
import com.lld.airline.service.AirlineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/airline")
@CrossOrigin(origins = "*")
public class AirlineController {

    private final AirlineService service;

    public AirlineController(AirlineService service) {
        this.service = service;
    }

    @GetMapping("/flights")
    public List<Flight> getFlights() {
        return service.getAllFlights();
    }

    @GetMapping("/flights/search")
    public ResponseEntity<?> searchFlights(
            @RequestParam String source,
            @RequestParam String destination,
            @RequestParam(required = false) String date) {
        try {
            return ResponseEntity.ok(service.searchFlights(source, destination, date));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/flights/{id}")
    public ResponseEntity<?> getFlight(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getFlight(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/flights/{flightId}/seats")
    public ResponseEntity<?> getSeats(@PathVariable String flightId) {
        try {
            List<Seat> seats = service.getSeats(flightId);
            return ResponseEntity.ok(seats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/flights/{flightId}/seats/available")
    public ResponseEntity<?> getAvailableSeats(@PathVariable String flightId) {
        try {
            return ResponseEntity.ok(service.getAvailableSeats(flightId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings")
    public ResponseEntity<?> bookFlight(@RequestBody Map<String, Object> request) {
        try {
            String flightId = (String) request.get("flightId");
            List<String> seatIds = (List<String>) request.get("seatIds");
            String userId = (String) request.get("userId");
            String passengerName = (String) request.get("passengerName");
            Booking booking = service.bookFlight(flightId, seatIds, userId, passengerName);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings/{id}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.checkIn(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.cancelBooking(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/bookings/{id}")
    public ResponseEntity<?> getBooking(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getBooking(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/bookings/active")
    public List<Booking> getActiveBookings() {
        return service.getActiveBookings();
    }
}
