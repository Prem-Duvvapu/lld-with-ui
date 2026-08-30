package com.lld.movieticket;

import com.lld.movieticket.model.*;
import com.lld.movieticket.repository.MovieTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository-flavour tests for {@link MovieTicketRepository}, isolated from
 * {@code MovieTicketService}'s locking/pricing/exception logic — pure storage behaviour.
 */
public class MovieTicketRepositoryTest {
    private MovieTicketRepository repository;

    @BeforeEach
    public void setUp() {
        repository = new MovieTicketRepository();
    }

    @Test
    public void seedInitialDataPopulatesAllReferenceData() {
        assertEquals(4, repository.getUsers().size());
        assertEquals(3, repository.getMovies().size());
        assertEquals(2, repository.getTheaters().size());
        // 3 movies x 2 shows each, seeded by seedInitialData()
        long totalShows = repository.getMovies().stream()
                .mapToLong(m -> repository.getShowsByMovie(m.getId()).size())
                .sum();
        assertEquals(6, totalShows);
    }

    @Test
    public void everyShowGetsA24SeatGridPricedByFactoryRules() {
        List<Show> shows = repository.getShowsByMovie(repository.getMovies().get(0).getId());
        for (Show show : shows) {
            List<Seat> seats = repository.getSeatsByShow(show.getId());
            assertEquals(24, seats.size());
            assertEquals(24, show.getTotalSeats());
            assertEquals(24, show.getAvailableSeats());

            long goldCount = seats.stream().filter(s -> s.getSeatType() == SeatType.GOLD).count();
            long silverCount = seats.stream().filter(s -> s.getSeatType() == SeatType.SILVER).count();
            assertEquals(12, goldCount, "rows 1-2 (6 seats each) are GOLD");
            assertEquals(12, silverCount, "rows 3-4 (6 seats each) are SILVER");

            // SeatFactory.createSeat's default pricing: GOLD 350.0, SILVER 200.0
            seats.stream().filter(s -> s.getSeatType() == SeatType.GOLD)
                    .forEach(s -> assertEquals(350.0, s.getPrice()));
            seats.stream().filter(s -> s.getSeatType() == SeatType.SILVER)
                    .forEach(s -> assertEquals(200.0, s.getPrice()));
            seats.forEach(s -> assertEquals(SeatStatus.AVAILABLE, s.getStatus()));
        }
    }

    @Test
    public void seatsAreIndexedPerShowNotGlobally() {
        List<Movie> movies = repository.getMovies();
        Show showA = repository.getShowsByMovie(movies.get(0).getId()).get(0);
        Show showB = repository.getShowsByMovie(movies.get(0).getId()).get(1);

        Seat seatFromA = repository.getSeatsByShow(showA.getId()).get(0);
        // A seat id that belongs to show A must not resolve under show B's index.
        assertNull(repository.findSeatById(showB.getId(), seatFromA.getId()));
        assertNotNull(repository.findSeatById(showA.getId(), seatFromA.getId()));
        assertNotNull(repository.findSeatByIdGlobal(seatFromA.getId()));
    }

    @Test
    public void unknownShowReturnsEmptySeatListNotNull() {
        assertTrue(repository.getSeatsByShow(999_999L).isEmpty());
        assertNull(repository.findShowById(999_999L));
        assertNull(repository.findSeatById(999_999L, 1L));
    }

    @Test
    public void updateSeatPersistsWithinItsShow() {
        Show show = repository.getMovies().stream()
                .flatMap(m -> repository.getShowsByMovie(m.getId()).stream())
                .findFirst().orElseThrow();
        Seat seat = repository.getSeatsByShow(show.getId()).get(0);

        seat.setStatus(SeatStatus.HELD);
        seat.setHeldByUserId("user1");
        repository.updateSeat(seat);

        Seat reloaded = repository.findSeatById(show.getId(), seat.getId());
        assertEquals(SeatStatus.HELD, reloaded.getStatus());
        assertEquals("user1", reloaded.getHeldByUserId());
    }

    @Test
    public void updateShowPersistsAvailableSeatCount() {
        Show show = repository.getShowsByMovie(repository.getMovies().get(0).getId()).get(0);
        show.setAvailableSeats(10);
        repository.updateShow(show);
        assertEquals(10, repository.findShowById(show.getId()).getAvailableSeats());
    }

    @Test
    public void bookingIdsAreMonotonicAndBookingsAreRetrievableByUser() {
        long showId = repository.getShowsByMovie(repository.getMovies().get(0).getId()).get(0).getId();
        long id1 = repository.nextBookingId();
        long id2 = repository.nextBookingId();
        assertEquals(id1 + 1, id2);

        Booking booking = new Booking(id2, showId, List.of(1L, 2L), "user1",
                BookingStatus.CONFIRMED, PaymentMethod.UPI, 700.0, LocalDateTime.now());
        repository.saveBooking(booking);

        assertEquals(booking, repository.findBookingById(id2));
        assertEquals(1, repository.getBookingsByUserId("user1").size());
        assertTrue(repository.getBookingsByUserId("USER1").size() == 1, "user lookup is case-insensitive");
        assertTrue(repository.getBookingsByUserId("nobody").isEmpty());
    }

    @Test
    public void clearResetsStorageAndIdGenerators() {
        repository.clear();
        assertTrue(repository.getMovies().isEmpty());
        assertTrue(repository.getTheaters().isEmpty());
        assertTrue(repository.getUsers().isEmpty());
        assertEquals(1L, repository.nextBookingId());
    }

    @Test
    public void createShowWithSeatsUsesSeatFactoryForCustomPricing() {
        Movie movie = repository.getMovies().get(0);
        long newShowId = repository.createShowWithSeats(movie.getId(), 1L, 1L, "Screen X", "09:00 AM", "Tomorrow");
        List<Seat> seats = repository.getSeatsByShow(newShowId);
        assertEquals(24, seats.size());
        assertTrue(seats.stream().allMatch(s -> s.getShowId() == newShowId));
    }
}
