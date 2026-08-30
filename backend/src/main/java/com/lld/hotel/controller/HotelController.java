package com.lld.hotel.controller;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.SimEvent;
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

    // ==========================================
    // Live Hotel Endpoints
    // ==========================================
    // No try/catch here: every domain failure extends HotelException -> DomainException, so
    // GlobalExceptionHandler maps it to the real HTTP status declared on its @ResponseStatus
    // (404/400/409) instead of every failure being coerced to a bare 400 by a local catch-all.

    @GetMapping("/hotels")
    public List<Hotel> getHotels() {
        return service.getAllHotels();
    }

    @GetMapping("/hotels/{id}")
    public Hotel getHotel(@PathVariable String id) {
        return service.getHotel(id);
    }

    @GetMapping("/hotels/{hotelId}/rooms")
    public List<Room> getRooms(@PathVariable String hotelId) {
        return service.getRoomsByHotel(hotelId);
    }

    @GetMapping("/hotels/{hotelId}/rooms/available")
    public List<Room> getAvailableRooms(
            @PathVariable String hotelId,
            @RequestParam(required = false) String checkIn,
            @RequestParam(required = false) String checkOut) {
        LocalDate ci = checkIn != null ? LocalDate.parse(checkIn) : LocalDate.now();
        LocalDate co = checkOut != null ? LocalDate.parse(checkOut) : ci.plusDays(1);
        return service.getAvailableRooms(hotelId, ci, co);
    }

    @PostMapping("/bookings")
    public Booking bookRoom(@RequestBody Map<String, String> request) {
        return service.bookRoom(
                request.get("roomId"),
                request.get("userId"),
                request.get("guestName"),
                LocalDate.parse(request.get("checkIn")),
                LocalDate.parse(request.get("checkOut")));
    }

    @PostMapping("/bookings/{id}/check-in")
    public Booking checkIn(@PathVariable String id) {
        return service.checkIn(id);
    }

    @PostMapping("/bookings/{id}/check-out")
    public Booking checkOut(@PathVariable String id) {
        return service.checkOut(id);
    }

    @PostMapping("/bookings/{id}/cancel")
    public Booking cancelBooking(@PathVariable String id) {
        return service.cancelBooking(id);
    }

    @GetMapping("/bookings/{id}")
    public Booking getBooking(@PathVariable String id) {
        return service.getBooking(id);
    }

    @GetMapping("/bookings/active")
    public List<Booking> getActiveBookings() {
        return service.getActiveBookings();
    }

    // ==========================================
    // Isolated Simulation Endpoints (/api/hotel/sim/*)
    // ==========================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        service.simReset();
        return ResponseEntity.ok(Map.of("message", "Simulation state reset successfully"));
    }

    @GetMapping("/sim/state")
    public Map<String, Object> simState() {
        return service.simState();
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simEvents() {
        return service.simEvents();
    }

    @PostMapping("/sim/book")
    public Booking simBook(@RequestBody Map<String, String> request) {
        return service.simBook(
                request.get("roomId"),
                request.get("userId"),
                request.get("guestName"),
                LocalDate.parse(request.get("checkIn")),
                LocalDate.parse(request.get("checkOut")));
    }

    @PostMapping("/sim/bookings/{id}/check-in")
    public Booking simCheckIn(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String actor = body != null ? body.getOrDefault("actorName", "Guest") : "Guest";
        return service.simCheckIn(id, actor);
    }

    @PostMapping("/sim/bookings/{id}/check-out")
    public Booking simCheckOut(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String actor = body != null ? body.getOrDefault("actorName", "Guest") : "Guest";
        return service.simCheckOut(id, actor);
    }

    @PostMapping("/sim/bookings/{id}/cancel")
    public Booking simCancel(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String actor = body != null ? body.getOrDefault("actorName", "Guest") : "Guest";
        return service.simCancel(id, actor);
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) {
        String roomId = (String) body.get("roomId");
        LocalDate checkIn = LocalDate.parse((String) body.get("checkIn"));
        LocalDate checkOut = LocalDate.parse((String) body.get("checkOut"));
        int guests = body.get("guests") != null ? Integer.parseInt(body.get("guests").toString()) : 3;
        return service.simRace(roomId, checkIn, checkOut, guests);
    }
}
