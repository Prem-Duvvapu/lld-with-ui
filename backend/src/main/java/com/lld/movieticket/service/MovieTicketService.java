package com.lld.movieticket.service;

import com.lld.movieticket.model.Booking;
import com.lld.movieticket.model.Movie;
import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.Show;
import com.lld.movieticket.repository.MovieTicketRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class MovieTicketService {
    private final MovieTicketRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public MovieTicketService(MovieTicketRepository repository) {
        this.repository = repository;
    }

    public List<Movie> getMovies() {
        return repository.getMovies();
    }

    public List<Show> getShows(long movieId) {
        Movie movie = repository.findMovieById(movieId);
        if (movie == null) throw new IllegalArgumentException("Movie not found");
        return repository.getShowsByMovie(movieId);
    }

    public List<Seat> getSeats(long showId) {
        Show show = repository.findShowById(showId);
        if (show == null) throw new IllegalArgumentException("Show not found");
        return repository.getSeatsByShow(showId);
    }

    public Booking bookSeats(long showId, List<Long> seatIds, String userId) {
        lock.lock();
        try {
            Show show = repository.findShowById(showId);
            if (show == null) throw new IllegalArgumentException("Show not found");

            List<Long> bookedIds = new ArrayList<>();
            double totalAmount = 0.0;

            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(seatId);
                if (seat == null) throw new IllegalArgumentException("Seat " + seatId + " not found");
                if (!seat.isAvailable()) throw new IllegalArgumentException("Seat " + seatId + " is already booked");
                seat.setAvailable(false);
                repository.updateSeat(seat);
                bookedIds.add(seatId);
                totalAmount += seat.getPrice();
            }

            show.setAvailableSeats(show.getAvailableSeats() - seatIds.size());
            repository.updateShow(show);

            Booking booking = new Booking(
                repository.nextBookingId(), showId, bookedIds, userId,
                "BOOKED", totalAmount, LocalDateTime.now()
            );
            return repository.saveBooking(booking);
        } finally {
            lock.unlock();
        }
    }

    public Booking cancelBooking(long bookingId) {
        lock.lock();
        try {
            Booking booking = repository.findBookingById(bookingId);
            if (booking == null) throw new IllegalArgumentException("Booking not found");
            if (!"BOOKED".equals(booking.getStatus())) throw new IllegalArgumentException("Booking cannot be cancelled");

            booking.setStatus("CANCELLED");
            repository.saveBooking(booking);

            Show show = repository.findShowById(booking.getShowId());
            if (show != null) {
                show.setAvailableSeats(show.getAvailableSeats() + booking.getSeatIds().size());
                repository.updateShow(show);
            }

            for (Long seatId : booking.getSeatIds()) {
                Seat seat = repository.findSeatById(seatId);
                if (seat != null) {
                    seat.setAvailable(true);
                    repository.updateSeat(seat);
                }
            }

            return booking;
        } finally {
            lock.unlock();
        }
    }

    public Booking getBooking(long bookingId) {
        Booking booking = repository.findBookingById(bookingId);
        if (booking == null) throw new IllegalArgumentException("Booking not found");
        return booking;
    }
}
