package com.lld.jobscheduler;

import com.lld.jobscheduler.exception.InvalidJobTransitionException;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobStatus;
import org.junit.jupiter.api.Test;

import static com.lld.jobscheduler.model.JobStatus.*;
import static org.junit.jupiter.api.Assertions.*;

class JobStatusTest {

    @Test
    void scheduledMayMoveToRunningCancelledOrMisfired() {
        assertTrue(SCHEDULED.canTransitionTo(RUNNING));
        assertTrue(SCHEDULED.canTransitionTo(CANCELLED));
        assertTrue(SCHEDULED.canTransitionTo(MISFIRED));
        assertFalse(SCHEDULED.canTransitionTo(COMPLETED));
        assertFalse(SCHEDULED.canTransitionTo(FAILED));
    }

    @Test
    void runningMayOnlyMoveToCompletedOrFailed() {
        assertTrue(RUNNING.canTransitionTo(COMPLETED));
        assertTrue(RUNNING.canTransitionTo(FAILED));
        assertFalse(RUNNING.canTransitionTo(SCHEDULED));
        assertFalse(RUNNING.canTransitionTo(CANCELLED));
    }

    @Test
    void completedAndFailedMayReturnToScheduledForRecurringJobs() {
        assertTrue(COMPLETED.canTransitionTo(SCHEDULED));
        assertTrue(FAILED.canTransitionTo(SCHEDULED));
    }

    @Test
    void misfiredMayResolveToScheduledOrCompleted() {
        assertTrue(MISFIRED.canTransitionTo(SCHEDULED));
        assertTrue(MISFIRED.canTransitionTo(COMPLETED));
        assertFalse(MISFIRED.canTransitionTo(RUNNING));
        assertFalse(MISFIRED.canTransitionTo(CANCELLED));
    }

    @Test
    void onlyCancelledIsStructurallyTerminal() {
        assertTrue(CANCELLED.isTerminal());
        assertFalse(COMPLETED.isTerminal());
        assertFalse(FAILED.isTerminal());
        assertFalse(SCHEDULED.isTerminal());
        assertFalse(RUNNING.isTerminal());
        assertFalse(MISFIRED.isTerminal());
    }

    @Test
    void cancelledAcceptsNoFurtherTransitions() {
        for (JobStatus s : JobStatus.values()) {
            assertFalse(CANCELLED.canTransitionTo(s), "CANCELLED must not transition to " + s);
        }
    }

    @Test
    void canTransitionToRejectsNull() {
        assertFalse(SCHEDULED.canTransitionTo(null));
    }

    @Test
    void jobTransition_gateThrowsOnIllegalMove() {
        Job job = Job.builder().id("J-1").status(SCHEDULED).build();
        assertThrows(InvalidJobTransitionException.class, () -> job.transition(COMPLETED));
        assertEquals(SCHEDULED, job.getStatus());
    }

    @Test
    void jobTransition_gateAppliesLegalMove() {
        Job job = Job.builder().id("J-1").status(SCHEDULED).build();
        job.transition(RUNNING);
        assertEquals(RUNNING, job.getStatus());
    }
}
