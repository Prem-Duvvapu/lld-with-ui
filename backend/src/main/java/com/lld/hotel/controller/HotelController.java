package com.lld.hotel.controller;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.service.HotelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hotel")
@CrossOrigin(origins = "*")
public class HotelController {

    private final HotelService service;

    public HotelController(HotelService service) {
        this.service = service;
    }

    @GetMapping("/hotels")
    public List<Hotel> getHotels() {
        return service.getAllHotels();
    }

    @GetMapping("/hotels/{id}")
    public ResponseEntity<?> getHotel(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getHotel(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/hotels/{hotelId}/rooms")
    public ResponseEntity<?> getRooms(@PathVariable String hotelId) {
        try {
            List<Room> rooms = service.getRoomsByHotel(hotelId);
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/hotels/{hotelId}/rooms/available")
    public ResponseEntity<?> getAvailableRooms(
            @PathVariable String hotelId,
            @RequestParam(required = false) String checkIn,
            @RequestParam(required = false) String checkOut) {
        try {
            LocalDate ci = checkIn != null ? LocalDate.parse(checkIn) : LocalDate.now();
            LocalDate co = checkOut != null ? LocalDate.parse(checkOut) : ci.plusDays(1);
            return ResponseEntity.ok(service.getAvailableRooms(hotelId, ci, co));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings")
    public ResponseEntity<?> bookRoom(@RequestBody Map<String, String> request) {
        try {
            Booking booking = service.bookRoom(
                    request.get("roomId"),
                    request.get("userId"),
                    request.get("guestName"),
                    LocalDate.parse(request.get("checkIn")),
                    LocalDate.parse(request.get("checkOut")));
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

    @PostMapping("/bookings/{id}/check-out")
    public ResponseEntity<?> checkOut(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.checkOut(id));
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
