package com.lld.jobscheduler.clock;

import java.time.Instant;

/**
 * Abstraction over "the current time", the same idiom {@code com.lld.circuitbreaker.clock.Clock}
 * uses (that one returns {@code long millis()}; this one returns {@link Instant} since every
 * schedule computation here — cron field matching in particular — is much more naturally
 * expressed against {@code Instant}/{@code ZonedDateTime} than raw epoch millis).
 *
 * <p>Real cron/interval scheduling is far too slow to demonstrate live: a "every day at 9am"
 * cron job cannot be watched firing in a browser tab. Production wiring uses {@link SystemClock};
 * the isolated {@code /sim/*} sandbox and every deterministic unit test use {@link ManualClock}
 * so a demo step can jump straight to the next due time instead of the caller sleeping for a
 * real day.
 */
public interface Clock {
    Instant now();
}
