package com.lld.hotel.repository;

import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.Room.RoomType;
import com.lld.hotel.model.Room.RoomStatus;
import com.lld.hotel.model.Booking;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class HotelRepository {
    private final Map<String, Hotel> hotels = new LinkedHashMap<>();
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final AtomicInteger bookingCounter = new AtomicInteger(0);

    public HotelRepository() {
        Hotel h1 = new Hotel("H1", "Grand Palace", "Mumbai", 4.5,
                List.of("Pool", "Gym", "Spa", "Restaurant", "WiFi"));
        Hotel h2 = new Hotel("H2", "Lake View Resort", "Udaipur", 4.7,
                List.of("Pool", "Lake View", "Restaurant", "WiFi", "Bar"));

        addRoom(new Room("R1", "H1", "101", RoomType.SINGLE, 3000));
        addRoom(new Room("R2", "H1", "102", RoomType.SINGLE, 3000));
        addRoom(new Room("R3", "H1", "201", RoomType.DOUBLE, 5000));
        addRoom(new Room("R4", "H1", "301", RoomType.SUITE, 12000));
        addRoom(new Room("R5", "H1", "302", RoomType.DELUXE, 8000));

        addRoom(new Room("R6", "H2", "101", RoomType.SINGLE, 2500));
        addRoom(new Room("R7", "H2", "102", RoomType.SINGLE, 2500));
        addRoom(new Room("R8", "H2", "201", RoomType.DOUBLE, 4500));
        addRoom(new Room("R9", "H2", "202", RoomType.DOUBLE, 4500));
        addRoom(new Room("R10", "H2", "301", RoomType.SUITE, 10000));

        hotels.put("H1", h1);
        hotels.put("H2", h2);
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
                .collect(Collectors.toList());
    }

    public List<Room> getAvailableRooms(String hotelId) {
        return rooms.values().stream()
                .filter(r -> r.getHotelId().equals(hotelId) && r.getStatus() == RoomStatus.AVAILABLE)
                .collect(Collectors.toList());
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

    public List<Booking> getActiveBookings() {
        return bookings.values().stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.CONFIRMED
                        || b.getStatus() == Booking.BookingStatus.CHECKED_IN)
                .sorted(Comparator.comparing(Booking::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public ReentrantLock getLock() { return lock; }

    public List<Room> getAllRooms() {
        return new ArrayList<>(rooms.values());
    }
}
