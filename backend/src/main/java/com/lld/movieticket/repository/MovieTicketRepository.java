package com.lld.movieticket.repository;

import com.lld.movieticket.model.Booking;
import com.lld.movieticket.model.Movie;
import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class MovieTicketRepository {
    private final Map<Long, Movie> movies = new ConcurrentHashMap<>();
    private final Map<Long, Show> shows = new ConcurrentHashMap<>();
    private final Map<Long, Seat> seats = new ConcurrentHashMap<>();
    private final Map<Long, Booking> bookings = new ConcurrentHashMap<>();
    private final AtomicLong movieIdGen = new AtomicLong(1);
    private final AtomicLong showIdGen = new AtomicLong(1);
    private final AtomicLong seatIdGen = new AtomicLong(1);
    private final AtomicLong bookingIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public MovieTicketRepository() {
        Movie m1 = new Movie(movieIdGen.getAndIncrement(), "Inception", "Sci-Fi", 148, 8.8);
        Movie m2 = new Movie(movieIdGen.getAndIncrement(), "The Dark Knight", "Action", 152, 9.0);
        Movie m3 = new Movie(movieIdGen.getAndIncrement(), "Interstellar", "Sci-Fi", 169, 8.7);
        movies.put(m1.getId(), m1);
        movies.put(m2.getId(), m2);
        movies.put(m3.getId(), m3);

        createSeatsAndShows(m1.getId(), "Screen 1", "10:00 AM");
        createSeatsAndShows(m1.getId(), "Screen 1", "2:00 PM");
        createSeatsAndShows(m2.getId(), "Screen 2", "11:00 AM");
        createSeatsAndShows(m2.getId(), "Screen 2", "4:00 PM");
        createSeatsAndShows(m3.getId(), "Screen 3", "1:00 PM");
        createSeatsAndShows(m3.getId(), "Screen 3", "7:00 PM");
    }

    private void createSeatsAndShows(long movieId, String screen, String showTime) {
        long showId = showIdGen.getAndIncrement();
        List<Long> seatIds = new ArrayList<>();
        for (int r = 1; r <= 4; r++) {
            for (int c = 1; c <= 6; c++) {
                long seatId = seatIdGen.getAndIncrement();
                String type = (r <= 2) ? "Gold" : "Silver";
                double price = (r <= 2) ? 350.0 : 200.0;
                seats.put(seatId, new Seat(seatId, r, c, type, price, true));
                seatIds.add(seatId);
            }
        }
        shows.put(showId, new Show(showId, movieId, screen, showTime, 24, 24));
    }

    public List<Movie> getMovies() { return new ArrayList<>(movies.values()); }

    public Movie findMovieById(long id) { return movies.get(id); }

    public List<Show> getShowsByMovie(long movieId) {
        return shows.values().stream()
            .filter(s -> s.getMovieId() == movieId)
            .collect(Collectors.toList());
    }

    public Show findShowById(long id) { return shows.get(id); }

    public List<Seat> getSeatsByShow(long showId) {
        return new ArrayList<>(seats.values());
    }

    public Seat findSeatById(long id) { return seats.get(id); }

    public void updateSeat(Seat seat) {
        lock.lock();
        try { seats.put(seat.getId(), seat); }
        finally { lock.unlock(); }
    }

    public void updateShow(Show show) {
        lock.lock();
        try { shows.put(show.getId(), show); }
        finally { lock.unlock(); }
    }

    public Booking saveBooking(Booking booking) {
        lock.lock();
        try {
            bookings.put(booking.getId(), booking);
            return booking;
        } finally { lock.unlock(); }
    }

    public Booking findBookingById(long id) { return bookings.get(id); }

    public long nextBookingId() { return bookingIdGen.getAndIncrement(); }
}
