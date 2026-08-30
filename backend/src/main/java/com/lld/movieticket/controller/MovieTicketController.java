package com.lld.movieticket.controller;

import com.lld.movieticket.model.*;
import com.lld.movieticket.service.MovieTicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movie-ticket")
@CrossOrigin(origins = "*")
public class MovieTicketController {
    private final MovieTicketService movieTicketService;

    public MovieTicketController(MovieTicketService movieTicketService) {
        this.movieTicketService = movieTicketService;
    }

    @GetMapping("/movies")
    public ResponseEntity<List<Movie>> getMovies() {
        return ResponseEntity.ok(movieTicketService.getMovies());
    }

    @GetMapping("/theaters")
    public ResponseEntity<List<Theater>> getTheaters() {
        return ResponseEntity.ok(movieTicketService.getTheaters());
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        return ResponseEntity.ok(movieTicketService.getUsers());
    }

    @GetMapping("/movies/{movieId}/shows")
    public ResponseEntity<List<Show>> getShows(@PathVariable long movieId) {
        return ResponseEntity.ok(movieTicketService.getShows(movieId));
    }

    @GetMapping("/shows/{showId}/seats")
    public ResponseEntity<List<Seat>> getSeats(@PathVariable long showId) {
        return ResponseEntity.ok(movieTicketService.getSeats(showId));
    }

    @PostMapping("/shows/{showId}/hold")
    public ResponseEntity<Map<String, Object>> holdSeats(
            @PathVariable long showId,
            @RequestBody Map<String, Object> request) {
        @SuppressWarnings("unchecked")
        List<Long> seatIds = ((List<Number>) request.get("seatIds")).stream()
                .map(Number::longValue).toList();
        String userId = (String) request.getOrDefault("userId", "user1");
        return ResponseEntity.ok(movieTicketService.holdSeats(showId, seatIds, userId));
    }

    @PostMapping("/book")
    public ResponseEntity<Map<String, Object>> bookSeats(
            @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyHeader,
            @RequestBody Map<String, Object> request) {
        long showId = Long.parseLong(request.get("showId").toString());
        @SuppressWarnings("unchecked")
        List<Long> seatIds = ((List<Number>) request.get("seatIds")).stream()
                .map(Number::longValue).toList();
        String userId = (String) request.getOrDefault("userId", "user1");
        String paymentMethodStr = (String) request.getOrDefault("paymentMethod", "UPI");
        PaymentMethod paymentMethod;
        try {
            paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
        } catch (Exception e) {
            paymentMethod = PaymentMethod.UPI;
        }
        String idempotencyKey = idempotencyHeader != null ? idempotencyHeader : (String) request.get("idempotencyKey");

        Booking booking = movieTicketService.bookSeats(showId, seatIds, userId, paymentMethod, idempotencyKey);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", booking.getId());
        response.put("showId", booking.getShowId());
        response.put("seatIds", booking.getSeatIds());
        response.put("userId", booking.getUserId());
        response.put("status", booking.getStatus());
        response.put("paymentMethod", booking.getPaymentMethod().name());
        response.put("totalAmount", booking.getTotalAmount());
        response.put("bookingTime", booking.getBookingTime().toString());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelBooking(@RequestBody Map<String, Object> request) {
        long bookingId = Long.parseLong(request.get("bookingId").toString());
        Booking booking = movieTicketService.cancelBooking(bookingId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", booking.getId());
        response.put("status", booking.getStatus());
        response.put("message", "Booking cancelled successfully. Seats returned to AVAILABLE.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<Booking> getBooking(@PathVariable long bookingId) {
        return ResponseEntity.ok(movieTicketService.getBooking(bookingId));
    }

    @GetMapping("/bookings/user/{userId}")
    public ResponseEntity<List<Booking>> getUserBookings(@PathVariable String userId) {
        return ResponseEntity.ok(movieTicketService.getUserBookings(userId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/movie-ticket/sim/*)
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        movieTicketService.simReset();
        return ResponseEntity.ok(Map.of("message", "Simulation state reset successfully"));
    }

    @GetMapping("/sim/seats/{showId}")
    public ResponseEntity<List<Seat>> simGetSeats(@PathVariable long showId) {
        return ResponseEntity.ok(movieTicketService.simGetSeats(showId));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(movieTicketService.simGetEvents());
    }

    @PostMapping("/sim/hold")
    public ResponseEntity<Map<String, Object>> simHoldSeats(@RequestBody Map<String, Object> body) {
        long showId = Long.parseLong(body.get("showId").toString());
        @SuppressWarnings("unchecked")
        List<Long> seatIds = ((List<Number>) body.get("seatIds")).stream().map(Number::longValue).toList();
        String userId = (String) body.get("userId");
        String actorName = (String) body.getOrDefault("actorName", userId);
        return ResponseEntity.ok(movieTicketService.simHoldSeats(showId, seatIds, userId, actorName));
    }

    @PostMapping("/sim/book")
    public ResponseEntity<Booking> simBookSeats(@RequestBody Map<String, Object> body) {
        long showId = Long.parseLong(body.get("showId").toString());
        @SuppressWarnings("unchecked")
        List<Long> seatIds = ((List<Number>) body.get("seatIds")).stream().map(Number::longValue).toList();
        String userId = (String) body.get("userId");
        String actorName = (String) body.getOrDefault("actorName", userId);
        return ResponseEntity.ok(movieTicketService.simBookSeats(showId, seatIds, userId, actorName));
    }

    @PostMapping("/sim/expire")
    public ResponseEntity<Map<String, String>> simExpireHold(@RequestBody Map<String, Object> body) {
        long showId = Long.parseLong(body.get("showId").toString());
        @SuppressWarnings("unchecked")
        List<Long> seatIds = ((List<Number>) body.get("seatIds")).stream().map(Number::longValue).toList();
        String actorName = (String) body.getOrDefault("actorName", "System");
        movieTicketService.simExpireHold(showId, seatIds, actorName);
        return ResponseEntity.ok(Map.of("message", "Hold expired for seats " + seatIds));
    }

    @PostMapping("/sim/cancel")
    public ResponseEntity<Booking> simCancelBooking(@RequestBody Map<String, Object> body) {
        long bookingId = Long.parseLong(body.get("bookingId").toString());
        String actorName = (String) body.getOrDefault("actorName", "System");
        return ResponseEntity.ok(movieTicketService.simCancelBooking(bookingId, actorName));
    }

    // Exception handling is deliberately absent here: every failure this controller can throw is
    // either a MovieTicketException subclass (each carries its own @ResponseStatus, so
    // com.lld.config.GlobalExceptionHandler's DomainException handler maps it to the right status
    // in the shared ErrorResponse shape) or an IllegalArgumentException (also handled centrally).
    // This module used to hand-roll five local @ExceptionHandler methods building
    // Map.of("error", e.getErrorCode(), "message", e.getMessage()) bodies — exactly the
    // duplicated, per-module error-shape pattern the shared handler exists to replace.
}
