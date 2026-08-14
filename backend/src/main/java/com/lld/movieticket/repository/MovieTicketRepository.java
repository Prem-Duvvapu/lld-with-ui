package com.lld.movieticket.repository;

import com.lld.movieticket.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class MovieTicketRepository {
    private final Map<Long, Movie> movies = new ConcurrentHashMap<>();
    private final Map<Long, Theater> theaters = new ConcurrentHashMap<>();
    private final Map<Long, Screen> screens = new ConcurrentHashMap<>();
    private final Map<Long, Show> shows = new ConcurrentHashMap<>();
    // Indexed per show: showId -> (seatId -> Seat)
    private final Map<Long, Map<Long, Seat>> showSeats = new ConcurrentHashMap<>();
    private final Map<Long, Booking> bookings = new ConcurrentHashMap<>();
    private final Map<String, User> users = new ConcurrentHashMap<>();

    private final AtomicLong movieIdGen = new AtomicLong(1);
    private final AtomicLong theaterIdGen = new AtomicLong(1);
    private final AtomicLong screenIdGen = new AtomicLong(1);
    private final AtomicLong showIdGen = new AtomicLong(1);
    private final AtomicLong seatIdGen = new AtomicLong(1);
    private final AtomicLong bookingIdGen = new AtomicLong(1);

    public MovieTicketRepository() {
        seedInitialData();
    }

    public void clear() {
        movies.clear();
        theaters.clear();
        screens.clear();
        shows.clear();
        showSeats.clear();
        bookings.clear();
        users.clear();
        movieIdGen.set(1);
        theaterIdGen.set(1);
        screenIdGen.set(1);
        showIdGen.set(1);
        seatIdGen.set(1);
        bookingIdGen.set(1);
    }

    public void seedInitialData() {
        clear();

        // Seed Users
        User u1 = new User("user1", "Alice", "alice@example.com");
        User u2 = new User("user2", "Bob", "bob@example.com");
        User u3 = new User("user3", "Charlie", "charlie@example.com");
        User u4 = new User("user4", "Diana", "diana@example.com");
        users.put(u1.getId(), u1);
        users.put(u2.getId(), u2);
        users.put(u3.getId(), u3);
        users.put(u4.getId(), u4);

        // Seed Movies
        Movie m1 = new Movie(movieIdGen.getAndIncrement(), "Inception", "Sci-Fi", 148, 8.8, "English", "🌀");
        Movie m2 = new Movie(movieIdGen.getAndIncrement(), "The Dark Knight", "Action", 152, 9.0, "English", "🦇");
        Movie m3 = new Movie(movieIdGen.getAndIncrement(), "Interstellar", "Sci-Fi", 169, 8.7, "English", "🚀");
        movies.put(m1.getId(), m1);
        movies.put(m2.getId(), m2);
        movies.put(m3.getId(), m3);

        // Seed Theaters & Screens
        long t1Id = theaterIdGen.getAndIncrement();
        long sc1Id = screenIdGen.getAndIncrement();
        long sc2Id = screenIdGen.getAndIncrement();
        Screen sc1 = new Screen(sc1Id, t1Id, "Screen 1 (IMAX)", 4, 6);
        Screen sc2 = new Screen(sc2Id, t1Id, "Screen 2 (4K Dolby)", 4, 6);
        screens.put(sc1Id, sc1);
        screens.put(sc2Id, sc2);

        Theater t1 = new Theater(t1Id, "PVR Superplex", "Downtown Mall", List.of(sc1Id, sc2Id));
        theaters.put(t1Id, t1);

        long t2Id = theaterIdGen.getAndIncrement();
        long sc3Id = screenIdGen.getAndIncrement();
        Screen sc3 = new Screen(sc3Id, t2Id, "Screen A", 4, 6);
        screens.put(sc3Id, sc3);

        Theater t2 = new Theater(t2Id, "Cinepolis", "Grand City Center", List.of(sc3Id));
        theaters.put(t2Id, t2);

        // Seed Shows
        createShowWithSeats(m1.getId(), t1Id, sc1Id, "Screen 1 (IMAX)", "10:00 AM", "Today");
        createShowWithSeats(m1.getId(), t1Id, sc1Id, "Screen 1 (IMAX)", "02:00 PM", "Today");
        createShowWithSeats(m2.getId(), t1Id, sc2Id, "Screen 2 (4K Dolby)", "11:00 AM", "Today");
        createShowWithSeats(m2.getId(), t1Id, sc2Id, "Screen 2 (4K Dolby)", "04:00 PM", "Today");
        createShowWithSeats(m3.getId(), t2Id, sc3Id, "Screen A", "01:00 PM", "Today");
        createShowWithSeats(m3.getId(), t2Id, sc3Id, "Screen A", "07:00 PM", "Today");
    }

    public long createShowWithSeats(long movieId, long theaterId, long screenId, String screenName, String showTime, String date) {
        long showId = showIdGen.getAndIncrement();
        Map<Long, Seat> seatMap = new ConcurrentHashMap<>();
        int totalSeats = 24;

        for (int r = 1; r <= 4; r++) {
            for (int c = 1; c <= 6; c++) {
                long seatId = seatIdGen.getAndIncrement();
                SeatType type = (r <= 2) ? SeatType.GOLD : SeatType.SILVER;
                double price = (r <= 2) ? 350.0 : 200.0;
                Seat seat = new Seat(seatId, showId, r, c, type, price, SeatStatus.AVAILABLE);
                seatMap.put(seatId, seat);
            }
        }
        showSeats.put(showId, seatMap);
        Show show = new Show(showId, movieId, theaterId, screenId, screenName, showTime, date, totalSeats, totalSeats);
        shows.put(showId, show);
        return showId;
    }

    // Movies
    public List<Movie> getMovies() { return new ArrayList<>(movies.values()); }
    public Movie findMovieById(long id) { return movies.get(id); }

    // Theaters & Screens
    public List<Theater> getTheaters() { return new ArrayList<>(theaters.values()); }
    public Theater findTheaterById(long id) { return theaters.get(id); }
    public Screen findScreenById(long id) { return screens.get(id); }

    // Shows
    public List<Show> getShowsByMovie(long movieId) {
        List<Show> result = new ArrayList<>();
        for (Show s : shows.values()) {
            if (s.getMovieId() == movieId) {
                result.add(s);
            }
        }
        return result;
    }
    public Show findShowById(long id) { return shows.get(id); }
    public void updateShow(Show show) { shows.put(show.getId(), show); }

    // Seats — CRITICAL FIX: Seats are indexed per show!
    public List<Seat> getSeatsByShow(long showId) {
        Map<Long, Seat> map = showSeats.get(showId);
        if (map == null) return Collections.emptyList();
        return new ArrayList<>(map.values());
    }

    public Seat findSeatById(long showId, long seatId) {
        Map<Long, Seat> map = showSeats.get(showId);
        return map != null ? map.get(seatId) : null;
    }

    public Seat findSeatByIdGlobal(long seatId) {
        for (Map<Long, Seat> map : showSeats.values()) {
            if (map.containsKey(seatId)) {
                return map.get(seatId);
            }
        }
        return null;
    }

    public void updateSeat(Seat seat) {
        Map<Long, Seat> map = showSeats.get(seat.getShowId());
        if (map != null) {
            map.put(seat.getId(), seat);
        }
    }

    // Bookings
    public Booking saveBooking(Booking booking) {
        bookings.put(booking.getId(), booking);
        return booking;
    }
    public Booking findBookingById(long id) { return bookings.get(id); }
    public List<Booking> getBookingsByUserId(String userId) {
        List<Booking> list = new ArrayList<>();
        for (Booking b : bookings.values()) {
            if (userId != null && userId.equalsIgnoreCase(b.getUserId())) {
                list.add(b);
            }
        }
        return list;
    }
    public long nextBookingId() { return bookingIdGen.getAndIncrement(); }

    // Users
    public List<User> getUsers() { return new ArrayList<>(users.values()); }
    public User findUserById(String id) { return users.get(id); }
    public User saveUser(User user) {
        users.put(user.getId(), user);
        return user;
    }
}
