package com.lld.airline.repository;

import com.lld.airline.enums.BookingStatus;
import com.lld.airline.enums.SeatClass;
import com.lld.airline.model.Aircraft;
import com.lld.airline.model.Booking;
import com.lld.airline.model.Flight;
import com.lld.airline.model.SeatTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class AirlineRepositoryTest {

    private AirlineRepository repository;

    @BeforeEach
    void setUp() {
        repository = new AirlineRepository();
    }

    private Aircraft aircraft(String tail) {
        return Aircraft.of("Boeing 737", tail, List.of(
                SeatTemplate.builder().seatNumber("1A").seatClass(SeatClass.ECONOMY).window(true).aisle(false).build()));
    }

    private Flight flight(String id) {
        LocalDateTime dep = LocalDateTime.now().plusDays(1);
        return Flight.builder()
                .flightId(id)
                .flightNumber(id)
                .source("DEL")
                .destination("BOM")
                .departureTime(dep)
                .arrivalTime(dep.plusHours(2))
                .build();
    }

    @Test
    void savedAircraftIsFindableByTailNumber() {
        Aircraft ac = aircraft("VT-TEST");
        repository.saveAircraft(ac);
        assertSame(ac, repository.findAircraftByTailNumber("VT-TEST"));
        assertNull(repository.findAircraftByTailNumber("VT-MISSING"));
    }

    @Test
    void getAllAircraftsReturnsEverySavedAircraft() {
        repository.saveAircraft(aircraft("VT-A"));
        repository.saveAircraft(aircraft("VT-B"));
        assertEquals(2, repository.getAllAircrafts().size());
    }

    @Test
    void savedFlightIsFindableById() {
        Flight f = flight("FL-1");
        repository.saveFlight(f);
        assertSame(f, repository.findFlightById("FL-1"));
        assertNull(repository.findFlightById("FL-MISSING"));
    }

    @Test
    void nextBookingIdIsMonotonicallyIncreasingAndUnique() {
        String id1 = repository.nextBookingId();
        String id2 = repository.nextBookingId();
        String id3 = repository.nextBookingId();
        assertNotEquals(id1, id2);
        assertNotEquals(id2, id3);
        assertTrue(id1.startsWith("BK-"));
    }

    @Test
    void savedBookingIsIndexedByBothIdAndUser() {
        Booking booking = Booking.builder()
                .bookingId("BK-100")
                .flightId("FL-1")
                .userId("user-1")
                .passengers(List.of())
                .seatNumbers(List.of("1A"))
                .totalAmount(4500.0)
                .status(BookingStatus.CONFIRMED)
                .build();

        repository.saveBooking(booking);

        assertSame(booking, repository.findBookingById("BK-100"));
        List<Booking> userBookings = repository.getBookingsByUser("user-1");
        assertEquals(1, userBookings.size());
        assertEquals("BK-100", userBookings.get(0).getBookingId());
    }

    @Test
    void getBookingsByUserIsEmptyForUnknownUser() {
        assertTrue(repository.getBookingsByUser("nobody").isEmpty());
    }

    @Test
    void multipleBookingsForSameUserAreAllReturned() {
        for (int i = 0; i < 3; i++) {
            repository.saveBooking(Booking.builder()
                    .bookingId("BK-" + i)
                    .flightId("FL-1")
                    .userId("user-multi")
                    .passengers(List.of())
                    .seatNumbers(List.of("1A"))
                    .totalAmount(1000.0)
                    .status(BookingStatus.CONFIRMED)
                    .build());
        }
        assertEquals(3, repository.getBookingsByUser("user-multi").size());
    }

    @Test
    void clearWipesAllStateAndResetsIdGenerator() {
        repository.saveAircraft(aircraft("VT-C"));
        repository.saveFlight(flight("FL-2"));
        repository.saveBooking(Booking.builder().bookingId("BK-999").flightId("FL-2").userId("u")
                .passengers(List.of()).seatNumbers(List.of("1A")).totalAmount(100.0)
                .status(BookingStatus.CONFIRMED).build());

        repository.clear();

        assertTrue(repository.getAllAircrafts().isEmpty());
        assertTrue(repository.getAllFlights().isEmpty());
        assertNull(repository.findBookingById("BK-999"));
        assertEquals("BK-1001", repository.nextBookingId());
    }
}
