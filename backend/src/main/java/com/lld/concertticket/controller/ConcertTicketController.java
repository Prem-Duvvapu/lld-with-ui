package com.lld.concertticket.controller;

import com.lld.concertticket.enums.PaymentMethod;
import com.lld.concertticket.model.*;
import com.lld.concertticket.service.ConcertTicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link ConcertTicketService}. */
@RestController
@RequestMapping("/api/concert-ticket")
@CrossOrigin(origins = "*")
public class ConcertTicketController {
    private final ConcertTicketService service;

    public ConcertTicketController(ConcertTicketService service) {
        this.service = service;
    }

    // =========================================================================
    // VENUES / EVENTS / SEATS
    // =========================================================================

    @GetMapping("/venues")
    public ResponseEntity<List<Venue>> getVenues() {
        return ResponseEntity.ok(service.getVenues());
    }

    @GetMapping("/venues/{venueId}")
    public ResponseEntity<Venue> getVenue(@PathVariable long venueId) {
        return ResponseEntity.ok(service.getVenue(venueId));
    }

    @GetMapping("/events")
    public ResponseEntity<List<Event>> getEvents() {
        return ResponseEntity.ok(service.getEvents());
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<Event> getEvent(@PathVariable long eventId) {
        return ResponseEntity.ok(service.getEvent(eventId));
    }

    @GetMapping("/events/{eventId}/seats")
    public ResponseEntity<List<Seat>> getSeats(@PathVariable long eventId) {
        return ResponseEntity.ok(service.getSeats(eventId));
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(service.getUsers());
    }

    // =========================================================================
    // HOLD / CONFIRM / CANCEL WORKFLOW
    // =========================================================================

    @PostMapping("/events/{eventId}/select")
    public ResponseEntity<Booking> selectSeats(@PathVariable long eventId, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> seatIds = (List<String>) body.get("seatIds");
        String userId = (String) body.getOrDefault("userId", "user1");
        return ResponseEntity.ok(service.selectSeats(eventId, seatIds, userId));
    }

    @PostMapping("/bookings/{bookingId}/confirm")
    public ResponseEntity<Booking> confirmBooking(
            @PathVariable long bookingId,
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyHeader,
            @RequestBody(required = false) Map<String, Object> body) {
        String paymentMethodStr = body != null ? (String) body.getOrDefault("paymentMethod", "UPI") : "UPI";
        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
        } catch (Exception e) {
            paymentMethod = PaymentMethod.UPI;
        }
        String idempotencyKey = idempotencyHeader != null ? idempotencyHeader
                : (body != null ? (String) body.get("idempotencyKey") : null);
        return ResponseEntity.ok(service.confirmBooking(bookingId, paymentMethod, idempotencyKey));
    }

    @PostMapping("/bookings/{bookingId}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable long bookingId) {
        return ResponseEntity.ok(service.cancelBooking(bookingId));
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<Booking> getBooking(@PathVariable long bookingId) {
        return ResponseEntity.ok(service.getBooking(bookingId));
    }

    @GetMapping("/users/{userId}/bookings")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable String userId) {
        return ResponseEntity.ok(service.getUserBookings(userId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/concert-ticket/sim/*)
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        service.simReset();
        return ResponseEntity.ok(Map.of("message", "Simulation state reset successfully"));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<Event>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/events/{eventId}/seats")
    public ResponseEntity<List<Seat>> simGetSeats(@PathVariable long eventId) {
        return ResponseEntity.ok(service.simGetSeats(eventId));
    }

    @GetMapping("/sim/log")
    public ResponseEntity<List<SimEvent>> simGetEventLog() {
        return ResponseEntity.ok(service.simGetEventLog());
    }

    @PostMapping("/sim/select")
    public ResponseEntity<Map<String, Object>> simSelectSeats(@RequestBody Map<String, Object> body) {
        long eventId = Long.parseLong(body.get("eventId").toString());
        @SuppressWarnings("unchecked")
        List<String> seatIds = (List<String>) body.get("seatIds");
        String userId = (String) body.get("userId");
        String actorName = (String) body.getOrDefault("actorName", userId);
        return ResponseEntity.ok(service.simSelectSeats(eventId, seatIds, userId, actorName));
    }

    @PostMapping("/sim/confirm")
    public ResponseEntity<Booking> simConfirmBooking(@RequestBody Map<String, Object> body) {
        long bookingId = Long.parseLong(body.get("bookingId").toString());
        String actorName = (String) body.getOrDefault("actorName", "System");
        return ResponseEntity.ok(service.simConfirmBooking(bookingId, actorName));
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<Booking> simCancelBooking(@RequestBody Map<String, Object> body) {
        long bookingId = Long.parseLong(body.get("bookingId").toString());
        String actorName = (String) body.getOrDefault("actorName", "System");
        return ResponseEntity.ok(service.simCancelBooking(bookingId, actorName));
    }

    @PostMapping("/sim/expire")
    public ResponseEntity<Map<String, String>> simExpireHold(@RequestBody Map<String, Object> body) {
        long eventId = Long.parseLong(body.get("eventId").toString());
        @SuppressWarnings("unchecked")
        List<String> seatIds = (List<String>) body.get("seatIds");
        String actorName = (String) body.getOrDefault("actorName", "System");
        service.simExpireHold(eventId, seatIds, actorName);
        return ResponseEntity.ok(Map.of("message", "Hold expired for seats " + seatIds));
    }
}
