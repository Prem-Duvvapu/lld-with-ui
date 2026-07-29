package com.lld.hotel.service;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Booking.BookingStatus;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.Room.RoomStatus;
import com.lld.hotel.repository.HotelRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class HotelService {
    private final HotelRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public HotelService(HotelRepository repository) {
        this.repository = repository;
    }

    public List<Hotel> getAllHotels() {
        return repository.getAllHotels();
    }

    public Hotel getHotel(String id) {
        Hotel hotel = repository.getHotel(id);
        if (hotel == null) throw new IllegalArgumentException("Hotel not found: " + id);
        return hotel;
    }

    public List<Room> getAvailableRooms(String hotelId, LocalDate checkIn, LocalDate checkOut) {
        Hotel hotel = getHotel(hotelId);
        return repository.getAvailableRooms(hotelId);
    }

    public List<Room> getRoomsByHotel(String hotelId) {
        getHotel(hotelId);
        return repository.getRoomsByHotel(hotelId);
    }

    public Booking bookRoom(String roomId, String userId, String guestName, LocalDate checkIn, LocalDate checkOut) {
        lock.lock();
        try {
            Room room = repository.getRoom(roomId);
            if (room == null) throw new IllegalArgumentException("Room not found: " + roomId);
            if (room.getStatus() != RoomStatus.AVAILABLE) throw new IllegalArgumentException("Room is not available");

            long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
            if (nights <= 0) throw new IllegalArgumentException("Check-out must be after check-in");

            double totalAmount = room.getPrice() * nights;

            room.setStatus(RoomStatus.BOOKED);
            repository.updateRoom(room);

            String bookingId = repository.generateBookingId();
            Booking booking = new Booking(bookingId, room.getHotelId(), roomId, userId,
                    guestName, checkIn, checkOut, BookingStatus.CONFIRMED, totalAmount);
            repository.saveBooking(booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    public Booking checkIn(String bookingId) {
        lock.lock();
        try {
            Booking booking = repository.getBooking(bookingId);
            if (booking == null) throw new IllegalArgumentException("Booking not found: " + bookingId);
            if (booking.getStatus() != BookingStatus.CONFIRMED)
                throw new IllegalArgumentException("Booking must be CONFIRMED to check in");

            booking.setStatus(BookingStatus.CHECKED_IN);
            Room room = repository.getRoom(booking.getRoomId());
            if (room != null) {
                room.setStatus(RoomStatus.OCCUPIED);
                repository.updateRoom(room);
            }
            repository.updateBooking(booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    public Booking checkOut(String bookingId) {
        lock.lock();
        try {
            Booking booking = repository.getBooking(bookingId);
            if (booking == null) throw new IllegalArgumentException("Booking not found: " + bookingId);
            if (booking.getStatus() != BookingStatus.CHECKED_IN)
                throw new IllegalArgumentException("Booking must be CHECKED_IN to check out");

            booking.setStatus(BookingStatus.CHECKED_OUT);
            Room room = repository.getRoom(booking.getRoomId());
            if (room != null) {
                room.setStatus(RoomStatus.AVAILABLE);
                repository.updateRoom(room);
            }
            repository.updateBooking(booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    public Booking cancelBooking(String bookingId) {
        lock.lock();
        try {
            Booking booking = repository.getBooking(bookingId);
            if (booking == null) throw new IllegalArgumentException("Booking not found: " + bookingId);
            if (booking.getStatus() == BookingStatus.CHECKED_OUT)
                throw new IllegalArgumentException("Cannot cancel checked-out booking");
            if (booking.getStatus() == BookingStatus.CANCELLED)
                throw new IllegalArgumentException("Booking already cancelled");

            booking.setStatus(BookingStatus.CANCELLED);
            Room room = repository.getRoom(booking.getRoomId());
            if (room != null) {
                room.setStatus(RoomStatus.AVAILABLE);
                repository.updateRoom(room);
            }
            repository.updateBooking(booking);
            return booking;
        } finally {
            lock.unlock();
        }
    }

    public List<Booking> getActiveBookings() {
        return repository.getActiveBookings();
    }

    public Booking getBooking(String id) {
        Booking booking = repository.getBooking(id);
        if (booking == null) throw new IllegalArgumentException("Booking not found: " + id);
        return booking;
    }
}
