package com.lld.movieticket.controller;

import com.lld.movieticket.model.Booking;
import com.lld.movieticket.model.Movie;
import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;
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

    @GetMapping("/movies/{movieId}/shows")
    public ResponseEntity<?> getShows(@PathVariable long movieId) {
        try {
            return ResponseEntity.ok(movieTicketService.getShows(movieId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/shows/{showId}/seats")
    public ResponseEntity<?> getSeats(@PathVariable long showId) {
        try {
            return ResponseEntity.ok(movieTicketService.getSeats(showId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/book")
    public ResponseEntity<Map<String, Object>> bookSeats(@RequestBody Map<String, Object> request) {
        try {
            long showId = Long.parseLong(request.get("showId").toString());
            @SuppressWarnings("unchecked")
            List<Long> seatIds = ((List<Integer>) request.get("seatIds")).stream()
                .map(Integer::longValue).toList();
            String userId = (String) request.get("userId");
            Booking booking = movieTicketService.bookSeats(showId, seatIds, userId);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", booking.getId());
            response.put("showId", booking.getShowId());
            response.put("seatIds", booking.getSeatIds());
            response.put("userId", booking.getUserId());
            response.put("status", booking.getStatus());
            response.put("totalAmount", booking.getTotalAmount());
            response.put("bookingTime", booking.getBookingTime().toString());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelBooking(@RequestBody Map<String, Long> request) {
        try {
            Booking booking = movieTicketService.cancelBooking(request.get("bookingId"));
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", booking.getId());
            response.put("status", booking.getStatus());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<?> getBooking(@PathVariable long bookingId) {
        try {
            return ResponseEntity.ok(movieTicketService.getBooking(bookingId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
