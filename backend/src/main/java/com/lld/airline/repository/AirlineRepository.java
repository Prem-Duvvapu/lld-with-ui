package com.lld.airline.repository;

import com.lld.airline.model.Flight;
import com.lld.airline.model.Seat;
import com.lld.airline.model.Seat.SeatClass;
import com.lld.airline.model.Seat.SeatStatus;
import com.lld.airline.model.Booking;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class AirlineRepository {
    private final Map<String, Flight> flights = new LinkedHashMap<>();
    private final Map<String, Seat> seats = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final AtomicInteger bookingCounter = new AtomicInteger(0);

    public AirlineRepository() {
        Flight f1 = new Flight("F1", "IndiGo", "6E-201", "Mumbai", "Delhi",
                LocalDateTime.now().plusDays(1).withHour(6).withMinute(0),
                LocalDateTime.now().plusDays(1).withHour(8).withMinute(30),
                60, 5000);
        Flight f2 = new Flight("F2", "Air India", "AI-101", "Delhi", "Bangalore",
                LocalDateTime.now().plusDays(1).withHour(10).withMinute(0),
                LocalDateTime.now().plusDays(1).withHour(13).withMinute(0),
                60, 7000);
        Flight f3 = new Flight("F3", "SpiceJet", "SG-301", "Mumbai", "Chennai",
                LocalDateTime.now().plusDays(2).withHour(7).withMinute(30),
                LocalDateTime.now().plusDays(2).withHour(9).withMinute(45),
                60, 4500);
        Flight f4 = new Flight("F4", "Vistara", "UK-501", "Delhi", "Mumbai",
                LocalDateTime.now().plusDays(1).withHour(15).withMinute(0),
                LocalDateTime.now().plusDays(1).withHour(17).withMinute(0),
                60, 6500);

        flights.put("F1", f1);
        flights.put("F2", f2);
        flights.put("F3", f3);
        flights.put("F4", f4);

        for (Flight f : List.of(f1, f2, f3, f4)) {
            String fid = f.getId();
            int seatIdx = 1;
            for (char row = 'A'; row <= 'E'; row++) {
                for (int col = 1; col <= 6; col++) {
                    SeatClass sc;
                    double price = f.getFare();
                    if (row <= 'B') { sc = SeatClass.BUSINESS; price = f.getFare() * 2.5; }
                    else if (row == 'C') { sc = SeatClass.ECONOMY; price = f.getFare(); }
                    else { sc = SeatClass.ECONOMY; price = f.getFare(); }
                    seats.put("S" + seatIdx, new Seat("S" + seatIdx, fid, String.valueOf(row), String.valueOf(col), sc, price));
                    seatIdx++;
                }
            }
        }
    }

    public List<Flight> getAllFlights() {
        return new ArrayList<>(flights.values());
    }

    public Flight getFlight(String id) {
        return flights.get(id);
    }

    public void updateFlight(Flight flight) {
        flights.put(flight.getId(), flight);
    }

    public List<Seat> getSeatsByFlight(String flightId) {
        return seats.values().stream()
                .filter(s -> s.getFlightId().equals(flightId))
                .collect(Collectors.toList());
    }

    public List<Seat> getAvailableSeatsByFlight(String flightId) {
        return seats.values().stream()
                .filter(s -> s.getFlightId().equals(flightId) && s.getStatus() == SeatStatus.AVAILABLE)
                .collect(Collectors.toList());
    }

    public Seat getSeat(String id) {
        return seats.get(id);
    }

    public void updateSeat(Seat seat) {
        seats.put(seat.getId(), seat);
    }

    public void updateSeats(List<Seat> seatList) {
        for (Seat s : seatList) {
            seats.put(s.getId(), s);
        }
    }

    public String generateBookingId() {
        return "ABK-" + String.format("%05d", bookingCounter.incrementAndGet());
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
                .sorted(Comparator.comparing(Booking::getBookingTime).reversed())
                .collect(Collectors.toList());
    }

    public ReentrantLock getLock() { return lock; }
}
