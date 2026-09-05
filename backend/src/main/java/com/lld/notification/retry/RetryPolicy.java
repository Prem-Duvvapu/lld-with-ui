package com.lld.notification.retry;

import java.time.Duration;

/** Strategy interface deciding whether a failed delivery attempt should be retried, and how long
 * to wait before the next attempt. */
public interface RetryPolicy {
    boolean shouldRetry(int attemptCount);

    Duration backoffFor(int attemptCount);
}
