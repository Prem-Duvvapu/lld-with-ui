package com.lld.jobscheduler.schedule;

import com.lld.jobscheduler.exception.InvalidCronExpressionException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

/**
 * A real 5-field Unix cron expression parser and next-fire-time walker: {@code minute hour
 * day-of-month month day-of-week}.
 *
 * <p><b>Supported syntax</b>, per field: {@code *} (every value), a single number, a
 * comma-separated list of numbers ({@code "1,15,30"}), and a step ({@code "*&#47;15"}). Range
 * syntax ({@code "1-5"}) is <b>not</b> supported — a deliberate scope cut, called out in this
 * module's design-details trade-offs rather than left silently missing.
 *
 * <p><b>Day-of-month / day-of-week semantics</b>: unlike POSIX cron's OR-when-both-restricted
 * rule, every field here is a simple AND filter — a candidate instant must satisfy all five
 * fields simultaneously. Simpler to reason about and to test; also called out as a trade-off.
 *
 * <p><b>Month-boundary behaviour</b> (e.g. day-of-month 31 in a 30-day month, or day-of-month 31
 * combined with February): the walker simply never finds a match in a month that lacks that day
 * — {@code ZonedDateTime} candidates are only ever real calendar dates, so a nonexistent "day 31
 * of April" is never constructed and never matches. It is not an error; that month is quietly
 * skipped and the walk continues into the next one. If a day-of-month/month combination can
 * <i>never</i> occur (e.g. "31 * 2 *" — the 31st of February), the walk gives up after
 * {@link #MAX_MINUTES_TO_SEARCH} simulated minutes (~4 years) and returns {@link Optional#empty()}
 * rather than looping forever.
 *
 * <p><b>Timezone</b>: fields are evaluated in {@link ZoneOffset#UTC}, not the JVM/server default
 * (which {@code LldApplication} pins to Asia/Kolkata) — a fixed zone keeps "next fire time" fully
 * deterministic in tests and CI regardless of where they run. Per-trigger configurable zones
 * (real Quartz supports this) are out of scope.
 */
public final class CronSchedule implements Schedule {
    private static final long MAX_MINUTES_TO_SEARCH = 4L * 366 * 24 * 60;

    private final String expression;
    private final Set<Integer> minutes;
    private final Set<Integer> hours;
    private final Set<Integer> daysOfMonth;
    private final Set<Integer> months;
    private final Set<Integer> daysOfWeek;

    public CronSchedule(String cronExpression) {
        if (cronExpression == null || cronExpression.trim().isEmpty()) {
            throw new InvalidCronExpressionException("cron expression must not be blank");
        }
        this.expression = cronExpression.trim();
        String[] fields = expression.split("\\s+");
        if (fields.length != 5) {
            throw new InvalidCronExpressionException(
                    "cron expression must have exactly 5 fields (minute hour day-of-month month day-of-week), got: "
                            + expression);
        }
        this.minutes = parseField(fields[0], 0, 59, "minute");
        this.hours = parseField(fields[1], 0, 23, "hour");
        this.daysOfMonth = parseField(fields[2], 1, 31, "day-of-month");
        this.months = parseField(fields[3], 1, 12, "month");
        this.daysOfWeek = parseField(fields[4], 0, 6, "day-of-week");
    }

    private static Set<Integer> parseField(String field, int min, int max, String fieldName) {
        Set<Integer> values = new TreeSet<>();
        for (String atom : field.split(",")) {
            atom = atom.trim();
            if (atom.isEmpty()) {
                throw new InvalidCronExpressionException("empty atom in " + fieldName + " field: '" + field + "'");
            }
            if (atom.equals("*")) {
                for (int v = min; v <= max; v++) {
                    values.add(v);
                }
            } else if (atom.startsWith("*/")) {
                int step = parseInt(atom.substring(2), fieldName);
                if (step <= 0) {
                    throw new InvalidCronExpressionException("step must be positive in " + fieldName + " field: '" + field + "'");
                }
                for (int v = min; v <= max; v += step) {
                    values.add(v);
                }
            } else {
                int v = parseInt(atom, fieldName);
                if (v < min || v > max) {
                    throw new InvalidCronExpressionException(
                            fieldName + " value " + v + " out of range [" + min + "," + max + "]");
                }
                values.add(v);
            }
        }
        if (values.isEmpty()) {
            throw new InvalidCronExpressionException("no values resolved for " + fieldName + " field: '" + field + "'");
        }
        return values;
    }

    private static int parseInt(String s, String fieldName) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            throw new InvalidCronExpressionException("not a number in " + fieldName + " field: '" + s + "'");
        }
    }

    @Override
    public Optional<Instant> nextExecutionTime(Instant from) {
        ZonedDateTime candidate = from.atZone(ZoneOffset.UTC)
                .truncatedTo(ChronoUnit.MINUTES)
                .plusMinutes(1);
        for (long i = 0; i < MAX_MINUTES_TO_SEARCH; i++) {
            if (matches(candidate)) {
                return Optional.of(candidate.toInstant());
            }
            candidate = candidate.plusMinutes(1);
        }
        return Optional.empty();
    }

    private boolean matches(ZonedDateTime t) {
        int cronDayOfWeek = t.getDayOfWeek().getValue() % 7; // DayOfWeek.SUNDAY=7 -> cron 0
        return minutes.contains(t.getMinute())
                && hours.contains(t.getHour())
                && daysOfMonth.contains(t.getDayOfMonth())
                && months.contains(t.getMonthValue())
                && daysOfWeek.contains(cronDayOfWeek);
    }

    public String getExpression() {
        return expression;
    }

    @Override
    public String getDescription() {
        return "Cron: " + expression;
    }

    /** Exposed for tests asserting the parsed field sets directly, without a next-fire walk. */
    static int cronDayOfWeek(DayOfWeek dow) {
        return dow.getValue() % 7;
    }
}
