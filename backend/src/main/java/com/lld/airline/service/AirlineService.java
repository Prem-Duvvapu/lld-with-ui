package com.lld.airline.service;

import com.lld.airline.model.Booking;
import com.lld.airline.model.Booking.BookingStatus;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Seat;
import com.lld.airline.model.Seat.SeatStatus;
import com.lld.airline.repository.AirlineRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class AirlineService {
    private final AirlineRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public AirlineService(AirlineRepository repository) {
        this.repository = repository;
    }

    public List<Flight> getAllFlights() {
        return repository.getAllFlights();
    }

    public Flight getFlight(String id) {
        Flight flight = repository.getFlight(id);
        if (flight == null) throw new IllegalArgumentException("Flight not found: " + id);
        return flight;
    }

    public List<Flight> searchFlights(String source, String destination, String date) {
        return repository.getAllFlights().stream()
                .filter(f -> f.getSource().equalsIgnoreCase(source)
                        && f.getDestination().equalsIgnoreCase(destination))
                .toList();
    }

    public List<Seat> getSeats(String flightId) {
        getFlight(flightId);
        return repository.getSeatsByFlight(flightId);
    }

    public List<Seat> getAvailableSeats(String flightId) {
        getFlight(flightId);
        return repository.getAvailableSeatsByFlight(flightId);
    }

    public Booking bookFlight(String flightId, List<String> seatIds, String userId, String passengerName) {
        lock.lock();
        try {
            Flight flight = getFlight(flightId);

            List<Seat> seatsToBook = new ArrayList<>();
            double totalAmount = 0;
            for (String seatId : seatIds) {
                Seat seat = repository.getSeat(seatId);
                if (seat == null) throw new IllegalArgumentException("Seat not found: " + seatId);
                if (seat.getStatus() != SeatStatus.AVAILABLE)
                    throw new IllegalArgumentException("Seat " + seatId + " is not available");
                seatsToBook.add(seat);
                totalAmount += seat.getPrice();
            }

            for (Seat seat : seatsToBook) {
                seat.setStatus(SeatStatus.BOOKED);
            }
            repository.updateSeats(seatsToBook);

            flight.setAvailableSeats(flight.getAvailableSeats() - seatIds.size());
            repository.updateFlight(flight);

            String bookingId = repository.generateBookingId();
            Booking booking = new Booking(bookingId, flightId, seatIds, userId,
                    passengerName, BookingStatus.CONFIRMED, totalAmount);
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
            if (booking.getStatus() == BookingStatus.CANCELLED)
                throw new IllegalArgumentException("Booking already cancelled");

            BookingStatus oldStatus = booking.getStatus();
            booking.setStatus(BookingStatus.CANCELLED);
            repository.updateBooking(booking);

            Flight flight = repository.getFlight(booking.getFlightId());
            if (flight != null && oldStatus != BookingStatus.CHECKED_IN) {
                flight.setAvailableSeats(flight.getAvailableSeats() + booking.getSeatIds().size());
                repository.updateFlight(flight);
            }

            for (String seatId : booking.getSeatIds()) {
                Seat seat = repository.getSeat(seatId);
                if (seat != null) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    repository.updateSeat(seat);
                }
            }

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
