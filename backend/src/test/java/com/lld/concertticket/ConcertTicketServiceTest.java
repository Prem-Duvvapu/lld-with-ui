package com.lld.concertticket;

import com.lld.concertticket.config.ConcertTicketSeedData;
import com.lld.concertticket.enums.BookingStatus;
import com.lld.concertticket.enums.PaymentMethod;
import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.exception.*;
import com.lld.concertticket.model.*;
import com.lld.concertticket.repository.ConcertTicketRepository;
import com.lld.concertticket.service.ConcertTicketService;
import com.lld.concertticket.service.PaymentProcessor;
import com.lld.concertticket.service.SeatLockManager;
import com.lld.concertticket.strategy.CancellationPolicyFactory;
import com.lld.concertticket.strategy.FullRefundPolicy;
import com.lld.concertticket.strategy.NoRefundPolicy;
import com.lld.concertticket.strategy.PartialRefundPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ConcertTicketServiceTest {
    private ConcertTicketRepository repository;
    private SeatLockManager seatLockManager;
    private PaymentProcessor paymentProcessor;
    private ConcertTicketService service;
    private long eventId; // "The Weeknd" — 30 days out, full-refund window
    private long soonEventId; // "Arijit Singh" — 5 days out, partial-refund window

    @BeforeEach
    void setUp() {
        repository = new ConcertTicketRepository();
        ConcertTicketSeedData.seed(repository);
        seatLockManager = new SeatLockManager();
        paymentProcessor = new PaymentProcessor();
        CancellationPolicyFactory factory = new CancellationPolicyFactory(
                new FullRefundPolicy(), new PartialRefundPolicy(), new NoRefundPolicy());
        service = new ConcertTicketService(repository, seatLockManager, paymentProcessor, factory);

        eventId = repository.getEvents().stream()
                .filter(e -> e.getArtist().equals("The Weeknd")).findFirst().orElseThrow().getId();
        soonEventId = repository.getEvents().stream()
                .filter(e -> e.getArtist().equals("Arijit Singh")).findFirst().orElseThrow().getId();
    }

    // ---------------------------------------------------------------- selectSeats

    @Test
    void selectSeats_createsPendingBookingAndHoldsSeats() {
        Booking booking = service.selectSeats(eventId, List.of("VIP-A-1", "VIP-A-2"), "user1");

        assertEquals(BookingStatus.PENDING, booking.getStatus());
        assertEquals("user1", booking.getUserId());
        assertEquals(2, booking.getSeatIds().size());
        assertTrue(booking.getTotalAmount() > 0);
        assertTrue(booking.getHoldExpiresAt() > System.currentTimeMillis());

        Seat seat = service.getSeats(eventId).stream().filter(s -> s.getId().equals("VIP-A-1")).findFirst().orElseThrow();
        assertEquals(SeatStatus.HELD, seat.getStatus());
        assertEquals("user1", seat.getHeldByUserId());
    }

    @Test
    void selectSeats_rejectsAlreadyHeldSeat() {
        service.selectSeats(eventId, List.of("VIP-A-1"), "user1");
        assertThrows(SeatNotAvailableException.class,
                () -> service.selectSeats(eventId, List.of("VIP-A-1"), "user2"));
    }

    @Test
    void selectSeats_unknownEvent_throwsEventNotFound() {
        assertThrows(EventNotFoundException.class,
                () -> service.selectSeats(999L, List.of("VIP-A-1"), "user1"));
    }

    @Test
    void selectSeats_emptySeatList_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> service.selectSeats(eventId, List.of(), "user1"));
    }

    // ---------------------------------------------------------------- confirmBooking

    @Test
    void confirmBooking_success_marksSeatsBookedAndBookingConfirmed() {
        Booking booking = service.selectSeats(eventId, List.of("GOLD-A-1"), "user1");
        Booking confirmed = service.confirmBooking(booking.getId(), PaymentMethod.UPI, null);

        assertEquals(BookingStatus.CONFIRMED, confirmed.getStatus());
        assertNotNull(confirmed.getPaymentRef());

        Seat seat = service.getSeats(eventId).stream().filter(s -> s.getId().equals("GOLD-A-1")).findFirst().orElseThrow();
        assertEquals(SeatStatus.BOOKED, seat.getStatus());
        assertNull(seat.getHeldByUserId());
    }

    @Test
    void confirmBooking_idempotencyKey_returnsCachedResultOnRetry() {
        Booking booking = service.selectSeats(eventId, List.of("GOLD-A-2"), "user1");
        Booking first = service.confirmBooking(booking.getId(), PaymentMethod.UPI, "IDEMP-1");
        Booking second = service.confirmBooking(booking.getId(), PaymentMethod.UPI, "IDEMP-1");
        assertSame(first, second);
    }

    @Test
    void confirmBooking_paymentFailure_releasesSeatsAndCancelsBooking() {
        Booking booking = service.selectSeats(eventId, List.of("GOLD-A-3"), "user1");
        paymentProcessor.setShouldFail(true);
        try {
            assertThrows(BookingFailedException.class,
                    () -> service.confirmBooking(booking.getId(), PaymentMethod.UPI, null));
        } finally {
            paymentProcessor.setShouldFail(false);
        }

        Booking reloaded = service.getBooking(booking.getId());
        assertEquals(BookingStatus.CANCELLED, reloaded.getStatus());

        Seat seat = service.getSeats(eventId).stream().filter(s -> s.getId().equals("GOLD-A-3")).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, seat.getStatus());
    }

    @Test
    void confirmBooking_alreadyConfirmed_throwsBookingFailed() {
        Booking booking = service.selectSeats(eventId, List.of("GOLD-A-4"), "user1");
        service.confirmBooking(booking.getId(), PaymentMethod.UPI, null);
        assertThrows(BookingFailedException.class,
                () -> service.confirmBooking(booking.getId(), PaymentMethod.UPI, null));
    }

    @Test
    void confirmBooking_afterHoldExpired_throwsHoldExpiredAndCancelsBooking() {
        Booking booking = service.selectSeats(eventId, List.of("GOLD-A-5"), "user1");
        Seat seat = repository.findSeatById(eventId, "GOLD-A-5");
        seat.setHoldExpiresAt(1L); // force expiry
        repository.updateSeat(seat);
        booking.setHoldExpiresAt(1L);
        repository.saveBooking(booking);

        assertThrows(HoldExpiredException.class,
                () -> service.confirmBooking(booking.getId(), PaymentMethod.UPI, null));
        assertEquals(BookingStatus.CANCELLED, service.getBooking(booking.getId()).getStatus());
    }

    // ---------------------------------------------------------------- cancelBooking

    @Test
    void cancelBooking_pending_releasesSeatsForFree() {
        Booking booking = service.selectSeats(eventId, List.of("SILVER-A-1"), "user1");
        Booking cancelled = service.cancelBooking(booking.getId());

        assertEquals(BookingStatus.CANCELLED, cancelled.getStatus());
        assertEquals(0.0, cancelled.getRefundAmount());

        Seat seat = service.getSeats(eventId).stream().filter(s -> s.getId().equals("SILVER-A-1")).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, seat.getStatus());
    }

    @Test
    void cancelBooking_confirmedFarOut_getsFullRefund() {
        // eventId ("The Weeknd") is seeded 30 days out -> full-refund window
        Booking booking = service.selectSeats(eventId, List.of("SILVER-A-2"), "user1");
        service.confirmBooking(booking.getId(), PaymentMethod.UPI, null);

        Booking cancelled = service.cancelBooking(booking.getId());
        assertEquals(BookingStatus.REFUNDED, cancelled.getStatus());
        assertEquals(cancelled.getTotalAmount(), cancelled.getRefundAmount(), 0.001);
    }

    @Test
    void cancelBooking_confirmedCloseToEvent_getsPartialRefund() {
        // soonEventId ("Arijit Singh") is seeded 5 days out -> partial-refund window
        Booking booking = service.selectSeats(soonEventId, List.of("VIP-A-1"), "user1");
        service.confirmBooking(booking.getId(), PaymentMethod.UPI, null);

        Booking cancelled = service.cancelBooking(booking.getId());
        assertEquals(BookingStatus.REFUNDED, cancelled.getStatus());
        assertEquals(cancelled.getTotalAmount() * 0.5, cancelled.getRefundAmount(), 0.001);
    }

    @Test
    void cancelBooking_alreadyCancelled_throwsInvalidCancellation() {
        Booking booking = service.selectSeats(eventId, List.of("SILVER-A-3"), "user1");
        service.cancelBooking(booking.getId());
        assertThrows(InvalidCancellationException.class, () -> service.cancelBooking(booking.getId()));
    }

    @Test
    void cancelBooking_unknownBooking_throwsBookingNotFound() {
        assertThrows(BookingNotFoundException.class, () -> service.cancelBooking(999L));
    }

    // ---------------------------------------------------------------- releaseExpiredHolds

    @Test
    void releaseExpiredHolds_cancelsExpiredPendingBookingsAndFreesSeats() {
        Booking booking = service.selectSeats(eventId, List.of("SILVER-A-4"), "user1");
        Seat seat = repository.findSeatById(eventId, "SILVER-A-4");
        seat.setHoldExpiresAt(1L);
        repository.updateSeat(seat);
        booking.setHoldExpiresAt(1L);
        repository.saveBooking(booking);

        service.releaseExpiredHolds();

        assertEquals(BookingStatus.CANCELLED, service.getBooking(booking.getId()).getStatus());
        Seat reloaded = service.getSeats(eventId).stream().filter(s -> s.getId().equals("SILVER-A-4")).findFirst().orElseThrow();
        assertEquals(SeatStatus.AVAILABLE, reloaded.getStatus());
    }

    @Test
    void releaseExpiredHolds_leavesLiveHoldsUntouched() {
        Booking booking = service.selectSeats(eventId, List.of("SILVER-A-5"), "user1");
        service.releaseExpiredHolds();
        assertEquals(BookingStatus.PENDING, service.getBooking(booking.getId()).getStatus());

        Seat seat = service.getSeats(eventId).stream().filter(s -> s.getId().equals("SILVER-A-5")).findFirst().orElseThrow();
        assertEquals(SeatStatus.HELD, seat.getStatus());
    }

    // ---------------------------------------------------------------- reads

    @Test
    void getEvent_unknown_throwsEventNotFound() {
        assertThrows(EventNotFoundException.class, () -> service.getEvent(999L));
    }

    @Test
    void getVenue_unknown_throwsVenueNotFound() {
        assertThrows(VenueNotFoundException.class, () -> service.getVenue(999L));
    }

    @Test
    void getUserBookings_returnsOnlyThatUsersBookings() {
        service.selectSeats(eventId, List.of("SILVER-B-1"), "user1");
        service.selectSeats(eventId, List.of("SILVER-B-2"), "user2");

        List<Booking> user1Bookings = service.getUserBookings("user1");
        assertTrue(user1Bookings.stream().allMatch(b -> b.getUserId().equals("user1")));
        assertFalse(user1Bookings.isEmpty());
    }
}
