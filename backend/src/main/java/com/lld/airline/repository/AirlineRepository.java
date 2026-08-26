package com.lld.airline.repository;

import com.lld.airline.model.Aircraft;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory store for live airline state — {@code ConcurrentHashMap} throughout, exactly like
 * {@code ConcertTicketRepository} / {@code MovieTicketRepository}. {@code AirlineService} owns a
 * second, independently constructed instance of the isolated sim maps for its {@code /sim/*}
 * sandbox (kept inline in the service, not through this class, since the sim engine seeds a single
 * fixed demo flight rather than an open aircraft/flight catalog).
 *
 * <p>Bare CRUD only — no business logic lives here; {@code AirlineService} still owns hold/booking
 * workflow rules. Seats are mutated in place on the {@link Flight} objects this repository hands
 * back (matching {@code SeatLockManager}'s direct-reference style), so no separate seat table is
 * needed.
 */
@Repository
public class AirlineRepository {

    private final Map<String, Aircraft> aircrafts = new ConcurrentHashMap<>();
    private final Map<String, Flight> flights = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final Map<String, List<String>> bookingsByUser = new ConcurrentHashMap<>();
    private final AtomicLong bookingIdGen = new AtomicLong(1001);

    public Aircraft saveAircraft(Aircraft aircraft) {
        aircrafts.put(aircraft.getTailNumber(), aircraft);
        return aircraft;
    }

    public Aircraft findAircraftByTailNumber(String tailNumber) {
        return aircrafts.get(tailNumber);
    }

    public List<Aircraft> getAllAircrafts() {
        return new ArrayList<>(aircrafts.values());
    }

    public Flight saveFlight(Flight flight) {
        flights.put(flight.getFlightId(), flight);
        return flight;
    }

    public Flight findFlightById(String flightId) {
        return flights.get(flightId);
    }

    public List<Flight> getAllFlights() {
        return new ArrayList<>(flights.values());
    }

    public String nextBookingId() {
        return "BK-" + bookingIdGen.getAndIncrement();
    }

    public Booking saveBooking(Booking booking) {
        bookings.put(booking.getBookingId(), booking);
        bookingsByUser.computeIfAbsent(booking.getUserId(), k -> new CopyOnWriteArrayList<>())
                .add(booking.getBookingId());
        return booking;
    }

    public Booking findBookingById(String bookingId) {
        return bookings.get(bookingId);
    }

    public List<Booking> getBookingsByUser(String userId) {
        List<String> ids = bookingsByUser.getOrDefault(userId, Collections.emptyList());
        List<Booking> result = new ArrayList<>();
        for (String id : ids) {
            Booking b = bookings.get(id);
            if (b != null) {
                result.add(b);
            }
        }
        return result;
    }

    public void clear() {
        aircrafts.clear();
        flights.clear();
        bookings.clear();
        bookingsByUser.clear();
        bookingIdGen.set(1001);
    }
}
