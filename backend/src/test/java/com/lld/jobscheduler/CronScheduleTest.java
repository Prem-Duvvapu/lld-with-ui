package com.lld.jobscheduler;

import com.lld.jobscheduler.exception.InvalidCronExpressionException;
import com.lld.jobscheduler.schedule.CronSchedule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The interesting part of this module: a real cron field parser plus a next-fire-time walker.
 * Every case here is deliberately asserted against an exact expected {@link Instant}, not just
 * "not null" — a walker with an off-by-one is otherwise invisible.
 */
@DisplayName("CronSchedule — parsing and next-fire-time computation")
class CronScheduleTest {

    @Test
    @DisplayName("every-minute: '* * * * *' fires on the very next minute boundary")
    void everyMinute_firesNextMinuteBoundary() {
        CronSchedule schedule = new CronSchedule("* * * * *");
        Instant from = Instant.parse("2024-01-01T00:00:30Z");
        assertEquals(Instant.parse("2024-01-01T00:01:00Z"), schedule.nextExecutionTime(from).orElseThrow());
    }

    @Test
    @DisplayName("specific hour: '0 9 * * *' fires at 09:00, rolling to the next day once past it")
    void specificHour_rollsToNextDayOncePast() {
        CronSchedule schedule = new CronSchedule("0 9 * * *");
        assertEquals(Instant.parse("2024-01-01T09:00:00Z"),
                schedule.nextExecutionTime(Instant.parse("2024-01-01T08:00:00Z")).orElseThrow());
        assertEquals(Instant.parse("2024-01-02T09:00:00Z"),
                schedule.nextExecutionTime(Instant.parse("2024-01-01T10:00:00Z")).orElseThrow());
    }

    @Test
    @DisplayName("specific day-of-week: '0 0 * * 1' fires only on Mondays")
    void specificDayOfWeek_firesOnlyOnMondays() {
        CronSchedule schedule = new CronSchedule("0 0 * * 1");
        // 2024-01-01 is itself a Monday; from exactly that midnight, the next Monday is 7 days out.
        Instant monday = Instant.parse("2024-01-01T00:00:00Z");
        assertEquals(Instant.parse("2024-01-08T00:00:00Z"), schedule.nextExecutionTime(monday).orElseThrow());
    }

    @Test
    @DisplayName("month boundary: day-of-month 31 quietly skips months that don't have one")
    void dayOfMonth31_skipsShortMonths() {
        CronSchedule schedule = new CronSchedule("0 0 31 * *");
        Instant firstOfJan = Instant.parse("2024-01-01T00:00:00Z");
        Instant jan31 = schedule.nextExecutionTime(firstOfJan).orElseThrow();
        assertEquals(Instant.parse("2024-01-31T00:00:00Z"), jan31);

        // From Jan 31st itself: February (29 days in 2024, a leap year) has no 31st, so the walk
        // must skip clean past it into March, which does.
        Instant next = schedule.nextExecutionTime(jan31).orElseThrow();
        assertEquals(Instant.parse("2024-03-31T00:00:00Z"), next);
    }

    @Test
    @DisplayName("impossible day-of-month/month combination gives up and returns empty rather than looping forever")
    void impossibleCombination_returnsEmpty() {
        // The 31st of February never exists in any year.
        CronSchedule schedule = new CronSchedule("0 0 31 2 *");
        Optional<Instant> next = schedule.nextExecutionTime(Instant.parse("2024-01-01T00:00:00Z"));
        assertTrue(next.isEmpty());
    }

    @Test
    @DisplayName("multi-field combination: month + day-of-month + hour + minute all constrain together")
    void multiFieldCombination_allFieldsApply() {
        CronSchedule schedule = new CronSchedule("30 14 15 6 *"); // June 15th, 14:30
        assertEquals(Instant.parse("2024-06-15T14:30:00Z"),
                schedule.nextExecutionTime(Instant.parse("2024-01-01T00:00:00Z")).orElseThrow());
    }

    @Test
    @DisplayName("comma list and step syntax resolve to the same set of minutes")
    void commaListAndStep_resolveEquivalently() {
        CronSchedule commaList = new CronSchedule("0,15,30,45 * * * *");
        CronSchedule step = new CronSchedule("*/15 * * * *");
        Instant from = Instant.parse("2024-01-01T00:05:00Z");
        assertEquals(commaList.nextExecutionTime(from), step.nextExecutionTime(from));
        assertEquals(Instant.parse("2024-01-01T00:15:00Z"), commaList.nextExecutionTime(from).orElseThrow());
    }

    @Test
    @DisplayName("rejects an expression that doesn't have exactly 5 fields")
    void rejectsWrongFieldCount() {
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("* * * *"));
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("* * * * * *"));
    }

    @Test
    @DisplayName("rejects an out-of-range field value")
    void rejectsOutOfRangeValue() {
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("60 * * * *")); // minute max 59
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("* 24 * * *")); // hour max 23
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("* * 32 * *")); // day-of-month max 31
    }

    @Test
    @DisplayName("rejects a blank expression")
    void rejectsBlankExpression() {
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule(""));
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("   "));
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule(null));
    }

    @Test
    @DisplayName("rejects a non-numeric atom")
    void rejectsNonNumericAtom() {
        assertThrows(InvalidCronExpressionException.class, () -> new CronSchedule("abc * * * *"));
    }

    @Test
    @DisplayName("describe() names the raw expression")
    void describeNamesExpression() {
        assertEquals("Cron: 0 9 * * *", new CronSchedule("0 9 * * *").getDescription());
    }
}
