package com.lld.concertticket.repository;

import com.lld.concertticket.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory store, {@code ConcurrentHashMap} throughout. Seats are indexed per event
 * (venueId -&gt; ... -&gt; eventId -&gt; seatId -&gt; Seat) exactly like
 * {@code MovieTicketRepository} indexes per show, not per screen — two events at the
 * same venue must not share seat objects.
 *
 * <p>A second, independently constructed instance of this class backs the isolated
 * {@code /sim/*} sandbox (see {@code ConcertTicketService}), so demo traffic can never
 * corrupt the primary in-memory state.
 */
@Repository
public class ConcertTicketRepository {
    private final Map<Long, Venue> venues = new ConcurrentHashMap<>();
    private final Map<Long, Event> events = new ConcurrentHashMap<>();
    private final Map<Long, Map<String, Seat>> eventSeats = new ConcurrentHashMap<>();
    private final Map<Long, Booking> bookings = new ConcurrentHashMap<>();
    private final Map<String, User> users = new ConcurrentHashMap<>();

    private final AtomicLong venueIdGen = new AtomicLong(1);
    private final AtomicLong eventIdGen = new AtomicLong(1);
    private final AtomicLong bookingIdGen = new AtomicLong(1);

    public void clear() {
        venues.clear();
        events.clear();
        eventSeats.clear();
        bookings.clear();
        users.clear();
        venueIdGen.set(1);
        eventIdGen.set(1);
        bookingIdGen.set(1);
    }

    // Venues
    public long nextVenueId() { return venueIdGen.getAndIncrement(); }
    public Venue saveVenue(Venue venue) { venues.put(venue.getId(), venue); return venue; }
    public Venue findVenueById(long id) { return venues.get(id); }
    public List<Venue> getVenues() { return new ArrayList<>(venues.values()); }

    // Events
    public long nextEventId() { return eventIdGen.getAndIncrement(); }
    public Event saveEvent(Event event) { events.put(event.getId(), event); return event; }
    public Event findEventById(long id) { return events.get(id); }
    public List<Event> getEvents() { return new ArrayList<>(events.values()); }

    // Seats — indexed per event so two events at the same venue never share a Seat object
    public void putSeatsForEvent(long eventId, Map<String, Seat> seats) {
        eventSeats.put(eventId, new ConcurrentHashMap<>(seats));
    }

    public List<Seat> getSeatsByEvent(long eventId) {
        Map<String, Seat> map = eventSeats.get(eventId);
        return map != null ? new ArrayList<>(map.values()) : Collections.emptyList();
    }

    public Seat findSeatById(long eventId, String seatId) {
        Map<String, Seat> map = eventSeats.get(eventId);
        return map != null ? map.get(seatId) : null;
    }

    public void updateSeat(Seat seat) {
        Map<String, Seat> map = eventSeats.get(seat.getEventId());
        if (map != null) {
            map.put(seat.getId(), seat);
        }
    }

    // Bookings
    public long nextBookingId() { return bookingIdGen.getAndIncrement(); }
    public Booking saveBooking(Booking booking) { bookings.put(booking.getId(), booking); return booking; }
    public Booking findBookingById(long id) { return bookings.get(id); }
    public List<Booking> getBookingsByUser(String userId) {
        List<Booking> result = new ArrayList<>();
        for (Booking b : bookings.values()) {
            if (userId != null && userId.equalsIgnoreCase(b.getUserId())) {
                result.add(b);
            }
        }
        return result;
    }
    public List<Booking> getAllBookings() { return new ArrayList<>(bookings.values()); }

    // Users
    public User saveUser(User user) { users.put(user.getId(), user); return user; }
    public User findUserById(String id) { return users.get(id); }
    public List<User> getUsers() { return new ArrayList<>(users.values()); }
}
