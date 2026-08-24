package com.lld.concertticket;

import com.lld.concertticket.config.ConcertTicketSeedData;
import com.lld.concertticket.enums.BookingStatus;
import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.model.*;
import com.lld.concertticket.repository.ConcertTicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ConcertTicketRepositoryTest {
    private ConcertTicketRepository repository;

    @BeforeEach
    void setUp() {
        repository = new ConcertTicketRepository();
    }

    @Test
    void seedData_populatesVenuesEventsSeatsAndUsers() {
        ConcertTicketSeedData.seed(repository);

        assertEquals(2, repository.getVenues().size());
        assertEquals(3, repository.getEvents().size());
        assertEquals(4, repository.getUsers().size());

        for (Event event : repository.getEvents()) {
            List<Seat> seats = repository.getSeatsByEvent(event.getId());
            assertFalse(seats.isEmpty(), "event " + event.getId() + " must have seats");
            assertTrue(seats.stream().allMatch(s -> s.getStatus() == SeatStatus.AVAILABLE));
        }
    }

    @Test
    void seatsAreIndexedPerEvent_notSharedAcrossEvents() {
        ConcertTicketSeedData.seed(repository);
        List<Event> events = repository.getEvents();
        long e1 = events.get(0).getId();
        long e2 = events.get(1).getId();
        // Every seeded venue has an identical VIP section (2 rows x 6 seats), so
        // "VIP-A-1" is guaranteed to exist under any two events regardless of which
        // venue each landed at or what order the map iterates events in.
        String seatId = "VIP-A-1";

        Seat s1 = repository.findSeatById(e1, seatId);
        assertNotNull(s1);
        s1.setStatus(SeatStatus.BOOKED);
        repository.updateSeat(s1);

        Seat s2AtSameId = repository.findSeatById(e2, seatId);
        assertNotNull(s2AtSameId, "second event should have its own copy of the same seat id");
        assertEquals(SeatStatus.AVAILABLE, s2AtSameId.getStatus(), "mutating event 1's seat must not affect event 2's seat");
    }

    @Test
    void clear_resetsAllStateAndIdGenerators() {
        ConcertTicketSeedData.seed(repository);
        assertFalse(repository.getVenues().isEmpty());

        repository.clear();

        assertTrue(repository.getVenues().isEmpty());
        assertTrue(repository.getEvents().isEmpty());
        assertTrue(repository.getUsers().isEmpty());
        assertEquals(1L, repository.nextVenueId());
    }

    @Test
    void bookingIdGenerator_isMonotonicAndUnique() {
        long id1 = repository.nextBookingId();
        long id2 = repository.nextBookingId();
        assertNotEquals(id1, id2);
        assertTrue(id2 > id1);
    }

    @Test
    void getBookingsByUser_filtersCaseInsensitively() {
        Booking booking = Booking.builder()
                .id(repository.nextBookingId())
                .userId("Alice")
                .eventId(1L)
                .seatIds(List.of("VIP-A-1"))
                .totalAmount(100.0)
                .status(BookingStatus.PENDING)
                .bookingTime(LocalDateTime.now())
                .build();
        repository.saveBooking(booking);

        assertEquals(1, repository.getBookingsByUser("alice").size());
        assertTrue(repository.getBookingsByUser("bob").isEmpty());
    }

    @Test
    void findSeatById_unknownEvent_returnsNull() {
        assertNull(repository.findSeatById(999L, "VIP-A-1"));
    }

    @Test
    void findVenueAndEvent_unknownId_returnNull() {
        assertNull(repository.findVenueById(999L));
        assertNull(repository.findEventById(999L));
    }
}
