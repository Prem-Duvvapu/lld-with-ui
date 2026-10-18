package com.lld.parkinglot;

import com.lld.parkinglot.model.Ticket;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class ParkingTicketElapsedTest {
    @Test
    void completedTicketsUseTheirRecordedIntervalNotTheCurrentClock() {
        var ticket = Ticket.builder().entryTime(LocalDateTime.of(2026, 10, 18, 10, 0))
                .exitTime(LocalDateTime.of(2026, 10, 18, 11, 31)).build();
        assertEquals(91L, ticket.getElapsedMinutes());
    }

    @Test
    void liveTicketsUseTheServerClockAndClampFutureEntries() {
        var ticket = Ticket.builder().entryTime(LocalDateTime.now().minusMinutes(5)).build();
        assertTrue(ticket.getElapsedMinutes() >= 5 && ticket.getElapsedMinutes() <= 6);
        ticket.setEntryTime(LocalDateTime.now().plusHours(1));
        assertEquals(0L, ticket.getElapsedMinutes());
    }

    @Test
    void missingEntryTimeIsUnknownRatherThanInvented() {
        assertNull(new Ticket().getElapsedMinutes());
    }
}
