package com.lld.hotel.service;

import com.lld.hotel.exception.HotelNotFoundException;
import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.repository.HotelRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Facade the controller delegates to wholesale. All booking-lifecycle mutation is delegated
 * further to {@link RoomBookingService}, which owns the per-room locking; this class owns
 * lookups and translates repository state into API-shaped results.
 *
 * <p>NOTE: the interactive simulation sandbox (/sim/*), the 8-step frontend walkthrough and the
 * design/diagram content are not yet wired up — this facade currently only covers the
 * operational booking lifecycle. See the commit message / PR description for what remains.
 */
@Service
public class HotelService {

    private final HotelRepository repository;
    private final RoomBookingService bookingService;

    public HotelService(HotelRepository repository, RoomBookingService bookingService) {
        this.repository = repository;
        this.bookingService = bookingService;
    }

    public List<Hotel> getAllHotels() {
        return repository.getAllHotels();
    }

    public Hotel getHotel(String id) {
        Hotel hotel = repository.getHotel(id);
        if (hotel == null) {
            throw new HotelNotFoundException("Hotel not found: " + id);
        }
        return hotel;
    }

    public List<Room> getRoomsByHotel(String hotelId) {
        getHotel(hotelId);
        return repository.getRoomsByHotel(hotelId);
    }

    public List<Room> getAvailableRooms(String hotelId, LocalDate checkIn, LocalDate checkOut) {
        getHotel(hotelId);
        LocalDate ci = checkIn != null ? checkIn : LocalDate.now();
        LocalDate co = checkOut != null ? checkOut : ci.plusDays(1);
        return repository.getRoomsByHotel(hotelId).stream()
                .filter(r -> bookingService.isAvailable(r.getId(), ci, co))
                .collect(Collectors.toList());
    }

    public Booking bookRoom(String roomId, String userId, String guestName, LocalDate checkIn, LocalDate checkOut) {
        return bookingService.book(roomId, userId, guestName, checkIn, checkOut);
    }

    public Booking checkIn(String bookingId) {
        return bookingService.checkIn(bookingId);
    }

    public Booking checkOut(String bookingId) {
        return bookingService.checkOut(bookingId);
    }

    public Booking cancelBooking(String bookingId) {
        return bookingService.cancel(bookingId, LocalDate.now());
    }

    public Booking markNoShow(String bookingId) {
        return bookingService.markNoShow(bookingId);
    }

    public List<Booking> getActiveBookings() {
        return repository.getActiveBookings();
    }

    public Booking getBooking(String id) {
        Booking booking = repository.getBooking(id);
        if (booking == null) {
            throw new com.lld.hotel.exception.BookingNotFoundException("Booking not found: " + id);
        }
        return booking;
    }
}
