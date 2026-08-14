package com.lld.hotel;

import com.lld.hotel.model.Booking;
import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.repository.HotelRepository;
import com.lld.hotel.service.HotelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class HotelServiceTest {

    private HotelRepository repository;
    private HotelService service;

    @BeforeEach
    public void setUp() {
        repository = new HotelRepository();
        service = new HotelService(repository);
    }

    @Test
    public void testGetAllHotels() {
        List<Hotel> hotels = service.getAllHotels();
        assertNotNull(hotels);
        assertEquals(2, hotels.size());
    }

    @Test
    public void testGetHotel() {
        Hotel h1 = service.getHotel("H1");
        assertNotNull(h1);
        assertEquals("Grand Palace", h1.getName());
    }

    @Test
    public void testGetRoomsByHotel() {
        List<Room> rooms = service.getRoomsByHotel("H1");
        assertNotNull(rooms);
        assertEquals(5, rooms.size());
    }

    @Test
    public void testGetAvailableRooms() {
        List<Room> avail = service.getAvailableRooms("H1", LocalDate.now(), LocalDate.now().plusDays(2));
        assertNotNull(avail);
        assertEquals(5, avail.size());
    }

    @Test
    public void testBookingLifecycle() {
        LocalDate ci = LocalDate.now().plusDays(1);
        LocalDate co = LocalDate.now().plusDays(3);
        Booking booking = service.bookRoom("R1", "user100", "John Doe", ci, co);
        assertNotNull(booking);
        assertEquals(Booking.BookingStatus.CONFIRMED, booking.getStatus());
        assertEquals(6000.0, booking.getTotalAmount());

        Booking checkedIn = service.checkIn(booking.getId());
        assertEquals(Booking.BookingStatus.CHECKED_IN, checkedIn.getStatus());

        Booking checkedOut = service.checkOut(booking.getId());
        assertEquals(Booking.BookingStatus.CHECKED_OUT, checkedOut.getStatus());
    }

    @Test
    public void testCancelBooking() {
        LocalDate ci = LocalDate.now().plusDays(1);
        LocalDate co = LocalDate.now().plusDays(2);
        Booking booking = service.bookRoom("R2", "user200", "Jane Doe", ci, co);
        Booking cancelled = service.cancelBooking(booking.getId());
        assertEquals(Booking.BookingStatus.CANCELLED, cancelled.getStatus());
    }
}
