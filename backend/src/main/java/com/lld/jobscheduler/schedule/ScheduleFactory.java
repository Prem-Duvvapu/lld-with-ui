package com.lld.jobscheduler.schedule;

import com.lld.jobscheduler.clock.Clock;
import com.lld.jobscheduler.exception.InvalidScheduleException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Resolves a {@link ScheduleType} + a loosely-typed params map (straight off the JSON request
 * body) to the right {@link Schedule} implementation — the factory half of this module's
 * Strategy pattern, so the controller/service never {@code if/else}s on schedule type.
 *
 * <p>{@code clock} is passed per-call, not injected, because the live engine and the sandbox
 * {@code /sim/*} engine resolve schedules against two different clocks (system vs manual) using
 * the same factory bean.
 *
 * <p>Params, by {@link ScheduleType}:
 * <ul>
 *   <li>{@code ONE_TIME}: {@code delaySeconds} (relative to {@code clock.now()}) or {@code at}
 *       (an ISO-8601 instant string) — exactly one of the two.</li>
 *   <li>{@code FIXED_RATE}: {@code intervalSeconds}.</li>
 *   <li>{@code CRON}: {@code cronExpression}, the 5-field string {@link CronSchedule} parses.</li>
 * </ul>
 */
@Component
public class ScheduleFactory {

    public Schedule create(ScheduleType type, Map<String, Object> params, Clock clock) {
        if (type == null) {
            throw new InvalidScheduleException("scheduleType must not be null");
        }
        Map<String, Object> safeParams = params == null ? Map.of() : params;
        switch (type) {
            case ONE_TIME:
                return createOneTime(safeParams, clock);
            case FIXED_RATE:
                return createFixedRate(safeParams);
            case CRON:
                return createCron(safeParams);
            default:
                throw new InvalidScheduleException("unsupported schedule type: " + type);
        }
    }

    private Schedule createOneTime(Map<String, Object> params, Clock clock) {
        Instant at;
        if (params.get("delaySeconds") != null) {
            at = clock.now().plusSeconds(toLong(params.get("delaySeconds"), "delaySeconds"));
        } else if (params.get("at") != null) {
            try {
                at = Instant.parse(String.valueOf(params.get("at")));
            } catch (Exception e) {
                throw new InvalidScheduleException("'at' must be an ISO-8601 instant: " + params.get("at"));
            }
        } else {
            throw new InvalidScheduleException("ONE_TIME requires 'delaySeconds' or 'at'");
        }
        if (!at.isAfter(clock.now())) {
            throw new InvalidScheduleException("one-time schedule must be strictly in the future, got " + at + " (now=" + clock.now() + ")");
        }
        return new OneTimeSchedule(at);
    }

    private Schedule createFixedRate(Map<String, Object> params) {
        if (params.get("intervalSeconds") == null) {
            throw new InvalidScheduleException("FIXED_RATE requires 'intervalSeconds'");
        }
        long intervalSeconds = toLong(params.get("intervalSeconds"), "intervalSeconds");
        if (intervalSeconds <= 0) {
            throw new InvalidScheduleException("intervalSeconds must be positive, got " + intervalSeconds);
        }
        return new FixedRateSchedule(Duration.ofSeconds(intervalSeconds));
    }

    private Schedule createCron(Map<String, Object> params) {
        Object expr = params.get("cronExpression");
        if (expr == null || String.valueOf(expr).isBlank()) {
            throw new InvalidScheduleException("CRON requires 'cronExpression'");
        }
        return new CronSchedule(String.valueOf(expr));
    }

    private long toLong(Object value, String fieldName) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            throw new InvalidScheduleException(fieldName + " must be a number, got: " + value);
        }
    }
}
