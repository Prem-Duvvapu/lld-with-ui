package com.lld.jobscheduler;

import com.lld.jobscheduler.clock.ManualClock;
import com.lld.jobscheduler.exception.InvalidScheduleException;
import com.lld.jobscheduler.schedule.CronSchedule;
import com.lld.jobscheduler.schedule.FixedRateSchedule;
import com.lld.jobscheduler.schedule.OneTimeSchedule;
import com.lld.jobscheduler.schedule.Schedule;
import com.lld.jobscheduler.schedule.ScheduleFactory;
import com.lld.jobscheduler.schedule.ScheduleType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleFactoryTest {

    private ScheduleFactory factory;
    private ManualClock clock;

    @BeforeEach
    void setUp() {
        factory = new ScheduleFactory();
        clock = new ManualClock(Instant.parse("2024-01-01T00:00:00Z"));
    }

    @Test
    void oneTime_fromDelaySeconds_resolvesToOneTimeSchedule() {
        Schedule schedule = factory.create(ScheduleType.ONE_TIME, Map.of("delaySeconds", 60), clock);
        assertInstanceOf(OneTimeSchedule.class, schedule);
        assertEquals(Instant.parse("2024-01-01T00:01:00Z"), ((OneTimeSchedule) schedule).getAt());
    }

    @Test
    void oneTime_fromAbsoluteInstant_resolvesToOneTimeSchedule() {
        Schedule schedule = factory.create(ScheduleType.ONE_TIME, Map.of("at", "2024-06-01T00:00:00Z"), clock);
        assertEquals(Instant.parse("2024-06-01T00:00:00Z"), ((OneTimeSchedule) schedule).getAt());
    }

    @Test
    void oneTime_rejectsNonFutureInstant() {
        assertThrows(InvalidScheduleException.class,
                () -> factory.create(ScheduleType.ONE_TIME, Map.of("at", "2023-01-01T00:00:00Z"), clock));
        assertThrows(InvalidScheduleException.class,
                () -> factory.create(ScheduleType.ONE_TIME, Map.of("delaySeconds", 0), clock));
    }

    @Test
    void oneTime_rejectsMissingParams() {
        assertThrows(InvalidScheduleException.class,
                () -> factory.create(ScheduleType.ONE_TIME, Map.of(), clock));
    }

    @Test
    void fixedRate_resolvesToFixedRateSchedule() {
        Schedule schedule = factory.create(ScheduleType.FIXED_RATE, Map.of("intervalSeconds", 300), clock);
        assertInstanceOf(FixedRateSchedule.class, schedule);
        assertEquals(Duration.ofSeconds(300), ((FixedRateSchedule) schedule).getInterval());
    }

    @Test
    void fixedRate_rejectsNonPositiveInterval() {
        assertThrows(InvalidScheduleException.class,
                () -> factory.create(ScheduleType.FIXED_RATE, Map.of("intervalSeconds", 0), clock));
        assertThrows(InvalidScheduleException.class,
                () -> factory.create(ScheduleType.FIXED_RATE, Map.of("intervalSeconds", -5), clock));
    }

    @Test
    void cron_resolvesToCronSchedule() {
        Schedule schedule = factory.create(ScheduleType.CRON, Map.of("cronExpression", "0 9 * * *"), clock);
        assertInstanceOf(CronSchedule.class, schedule);
    }

    @Test
    void cron_rejectsMissingExpression() {
        assertThrows(InvalidScheduleException.class, () -> factory.create(ScheduleType.CRON, Map.of(), clock));
    }

    @Test
    void rejectsNullScheduleType() {
        assertThrows(InvalidScheduleException.class, () -> factory.create(null, Map.of(), clock));
    }
}
