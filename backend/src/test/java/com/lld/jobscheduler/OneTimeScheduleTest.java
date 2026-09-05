package com.lld.jobscheduler;

import com.lld.jobscheduler.schedule.OneTimeSchedule;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class OneTimeScheduleTest {

    @Test
    void firesOnceAtTheGivenInstant() {
        Instant at = Instant.parse("2024-06-01T00:00:00Z");
        OneTimeSchedule schedule = new OneTimeSchedule(at);
        Instant creationTime = Instant.parse("2024-01-01T00:00:00Z");
        assertEquals(at, schedule.nextExecutionTime(creationTime).orElseThrow());
    }

    @Test
    void neverFiresAgainOnceItsOwnInstantIsPassedBackAsFrom() {
        Instant at = Instant.parse("2024-06-01T00:00:00Z");
        OneTimeSchedule schedule = new OneTimeSchedule(at);
        // JobScheduler passes exactly the fired instant back in as "from" after execution.
        assertTrue(schedule.nextExecutionTime(at).isEmpty());
    }

    @Test
    void neverFiresWhenFromIsAfterAt() {
        Instant at = Instant.parse("2024-06-01T00:00:00Z");
        OneTimeSchedule schedule = new OneTimeSchedule(at);
        assertTrue(schedule.nextExecutionTime(at.plusSeconds(1)).isEmpty());
    }

    @Test
    void rejectsNullInstant() {
        assertThrows(NullPointerException.class, () -> new OneTimeSchedule(null));
    }
}
