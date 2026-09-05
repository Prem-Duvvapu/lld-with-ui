package com.lld.jobscheduler.model;

/**
 * The outcome recorded for a single firing in a {@link Job}'s history. Deliberately separate
 * from {@link JobStatus} — a status is where the *job* sits right now; an outcome is what one
 * particular occurrence did, and a job accumulates many of these over its lifetime.
 */
public enum JobExecutionOutcome {
    COMPLETED,
    FAILED,
    /** A misfired occurrence that {@code SkipToNextOccurrenceMisfirePolicy} dropped entirely. */
    SKIPPED_MISFIRE
}
