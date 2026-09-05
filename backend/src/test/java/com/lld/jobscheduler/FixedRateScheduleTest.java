package com.lld.jobscheduler;

import com.lld.jobscheduler.schedule.FixedRateSchedule;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class FixedRateScheduleTest {

    @Test
    void repeatsAtTheFixedInterval() {
        FixedRateSchedule schedule = new FixedRateSchedule(Duration.ofMinutes(5));
        Instant from = Instant.parse("2024-01-01T00:00:00Z");
        assertEquals(Instant.parse("2024-01-01T00:05:00Z"), schedule.nextExecutionTime(from).orElseThrow());
    }

    @Test
    void neverReturnsEmpty() {
        FixedRateSchedule schedule = new FixedRateSchedule(Duration.ofSeconds(1));
        assertTrue(schedule.nextExecutionTime(Instant.EPOCH).isPresent());
        assertTrue(schedule.nextExecutionTime(Instant.MAX.minusSeconds(2)).isPresent());
    }

    @Test
    void rejectsZeroOrNegativeInterval() {
        assertThrows(IllegalArgumentException.class, () -> new FixedRateSchedule(Duration.ZERO));
        assertThrows(IllegalArgumentException.class, () -> new FixedRateSchedule(Duration.ofSeconds(-1)));
    }
}
