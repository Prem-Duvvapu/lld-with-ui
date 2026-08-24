package com.lld.hotel.repository;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.RoomType;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * In-memory store. {@code hotels} and {@code rooms} only ever change at seed time (or via a
 * handful of admin-ish operations), so they hold a plain map; {@code bookings} is written
 * continuously from concurrent requests and stays a {@link ConcurrentHashMap}.
 *
 * <p>{@link #seed()} is public and idempotent so both the live singleton and the isolated
 * simulation sandbox ({@code new HotelRepository()}) start from the same known state, and so
 * {@code /sim/reset} can restore it without restarting the process.
 */
@Repository
public class HotelRepository {

    private final Map<String, Hotel> hotels = new LinkedHashMap<>();
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final AtomicInteger bookingCounter = new AtomicInteger(0);

    public HotelRepository() {
        seed();
    }

    public void seed() {
        hotels.clear();
        rooms.clear();
        bookings.clear();
        bookingCounter.set(0);

        hotels.put("H1", Hotel.builder().id("H1").name("Grand Palace").location("Mumbai")
                .rating(4.5).amenities(List.of("Pool", "Gym", "Spa", "Restaurant", "WiFi")).build());
        hotels.put("H2", Hotel.builder().id("H2").name("Lake View Resort").location("Udaipur")
                .rating(4.7).amenities(List.of("Pool", "Lake View", "Restaurant", "WiFi", "Bar")).build());

        addRoom(Room.builder().id("R1").hotelId("H1").roomNumber("101").type(RoomType.SINGLE).price(3000).build());
        addRoom(Room.builder().id("R2").hotelId("H1").roomNumber("102").type(RoomType.SINGLE).price(3000).build());
        addRoom(Room.builder().id("R3").hotelId("H1").roomNumber("201").type(RoomType.DOUBLE).price(5000).build());
        addRoom(Room.builder().id("R4").hotelId("H1").roomNumber("301").type(RoomType.SUITE).price(12000).build());
        addRoom(Room.builder().id("R5").hotelId("H1").roomNumber("302").type(RoomType.DELUXE).price(8000).build());

        addRoom(Room.builder().id("R6").hotelId("H2").roomNumber("101").type(RoomType.SINGLE).price(2500).build());
        addRoom(Room.builder().id("R7").hotelId("H2").roomNumber("102").type(RoomType.SINGLE).price(2500).build());
        addRoom(Room.builder().id("R8").hotelId("H2").roomNumber("201").type(RoomType.DOUBLE).price(4500).build());
        addRoom(Room.builder().id("R9").hotelId("H2").roomNumber("202").type(RoomType.DOUBLE).price(4500).build());
        addRoom(Room.builder().id("R10").hotelId("H2").roomNumber("301").type(RoomType.SUITE).price(10000).build());
    }

    public void addRoom(Room room) {
        rooms.put(room.getId(), room);
    }

    public List<Hotel> getAllHotels() {
        return new ArrayList<>(hotels.values());
    }

    public Hotel getHotel(String id) {
        return hotels.get(id);
    }

    public List<Room> getRoomsByHotel(String hotelId) {
        return rooms.values().stream()
                .filter(r -> r.getHotelId().equals(hotelId))
                .sorted(Comparator.comparing(Room::getId))
                .collect(Collectors.toList());
    }

    public List<Room> getAllRooms() {
        return new ArrayList<>(rooms.values());
    }

    public Room getRoom(String id) {
        return rooms.get(id);
    }

    public void updateRoom(Room room) {
        rooms.put(room.getId(), room);
    }

    public String generateBookingId() {
        return "HBK-" + String.format("%05d", bookingCounter.incrementAndGet());
    }

    public void saveBooking(Booking booking) {
        bookings.put(booking.getId(), booking);
    }

    public Booking getBooking(String id) {
        return bookings.get(id);
    }

    public void updateBooking(Booking booking) {
        bookings.put(booking.getId(), booking);
    }

    /**
     * Every booking for {@code roomId} whose status still {@link Booking#getStatus()}
     * {@code .holdsRoom()} — the set a new booking attempt must check for date overlap.
     * Read fresh on every call; callers doing the overlap check must call this AFTER
     * acquiring the room's lock, not before, or the read is stale by the time it is acted on.
     */
    public List<Booking> findActiveBookingsForRoom(String roomId) {
        return bookings.values().stream()
                .filter(b -> b.getRoomId().equals(roomId))
                .filter(b -> b.getStatus().holdsRoom())
                .collect(Collectors.toList());
    }

    public List<Booking> getActiveBookings() {
        return bookings.values().stream()
                .filter(b -> b.getStatus().holdsRoom())
                .sorted(Comparator.comparing(Booking::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Booking> getAllBookings() {
        return new ArrayList<>(bookings.values());
    }
}
