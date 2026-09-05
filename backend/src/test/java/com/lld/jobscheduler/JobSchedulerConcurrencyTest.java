package com.lld.jobscheduler;

import com.lld.jobscheduler.clock.ManualClock;
import com.lld.jobscheduler.exception.InvalidJobTransitionException;
import com.lld.jobscheduler.misfire.FireImmediatelyMisfirePolicy;
import com.lld.jobscheduler.model.Job;
import com.lld.jobscheduler.model.JobStatus;
import com.lld.jobscheduler.schedule.OneTimeSchedule;
import com.lld.jobscheduler.service.JobScheduler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards this module's centerpiece race: a job cancelled at the exact instant a worker is
 * popping it off the queue for execution must never have its task body observed to run.
 *
 * <p>A single-shot version of this test is not a reliable regression guard — RCA-052 in this
 * same repo is the proof: an unguarded two-thread race window is nanoseconds wide, and a lone
 * attempt usually just doesn't land in it. This repeats the race 200 times with a fresh engine
 * each round and asserts the invariant every round.
 *
 * <p><b>Verified this actually catches the bug it claims to</b>: temporarily removing the
 * {@code lock.lock()}/{@code lock.unlock()} pair around {@code processDueJob} in
 * {@link JobScheduler} (so {@code cancel()} and dispatch race unguarded) makes
 * {@link #repeatedCancelDispatchRace_neverExecutesACancelledJob} fail within the first handful
 * of rounds — confirmed by hand while writing this test, then restored.
 */
@DisplayName("JobScheduler — concurrent cancel/dispatch race")
class JobSchedulerConcurrencyTest {

    private static final int ROUNDS = 200;

    @Test
    @DisplayName("200 rounds: a cancelled job's task body is never observed to run, and a dispatched job always has exactly one history entry")
    void repeatedCancelDispatchRace_neverExecutesACancelledJob() throws InterruptedException {
        int cancelWins = 0;
        int dispatchWins = 0;

        for (int round = 1; round <= ROUNDS; round++) {
            ManualClock clock = new ManualClock();
            JobScheduler engine = new JobScheduler(clock, Duration.ofSeconds(30), 1);
            Instant at = clock.now().plusSeconds(1);
            Job job = engine.schedule("Race-" + round, "GENERIC_TASK", new OneTimeSchedule(at),
                    new FireImmediatelyMisfirePolicy(), 5);
            clock.advance(Duration.ofSeconds(1)); // now exactly due

            String jobId = job.getId();
            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);
            AtomicInteger cancelOutcome = new AtomicInteger(); // 1 = succeeded, -1 = rejected (already terminal)
            AtomicInteger dispatchOutcome = new AtomicInteger(); // 1 = dispatched, 0 = did nothing

            pool.submit(() -> {
                try {
                    start.await();
                    engine.cancel(jobId);
                    cancelOutcome.set(1);
                } catch (InvalidJobTransitionException expected) {
                    cancelOutcome.set(-1); // dispatch had already finished the job — a legitimate loss
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
            pool.submit(() -> {
                try {
                    start.await();
                    dispatchOutcome.set(engine.dispatchIfDue(jobId) ? 1 : 0);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + ": threads did not finish — possible deadlock");
            pool.shutdown();

            Job after = engine.getJob(jobId);
            if (after.getStatus() == JobStatus.CANCELLED) {
                assertTrue(after.getHistory().isEmpty(),
                        "round " + round + ": a CANCELLED job must never have executed its task body");
                cancelWins++;
            } else {
                assertEquals(JobStatus.COMPLETED, after.getStatus(),
                        "round " + round + ": a job that wasn't cancelled must have completed");
                assertEquals(1, after.getHistory().size(),
                        "round " + round + ": a completed job must have exactly one history entry, never zero or two");
                dispatchWins++;
            }
        }

        assertEquals(ROUNDS, cancelWins + dispatchWins, "every round must resolve to exactly one outcome");
        // Not asserted as a hard requirement (thread scheduling isn't guaranteed either way), but
        // worth knowing: both outcomes should occur across 200 rounds if the race is genuine.
        System.out.printf("cancel/dispatch race: %d cancel-wins, %d dispatch-wins over %d rounds%n",
                cancelWins, dispatchWins, ROUNDS);
    }

    @Test
    @DisplayName("cancelling a job that already completed is rejected, not silently accepted")
    void cancellingAnAlreadyCompletedJob_isRejected() {
        ManualClock clock = new ManualClock();
        JobScheduler engine = new JobScheduler(clock, Duration.ofSeconds(30), 1);
        Job job = engine.schedule("J", "GENERIC_TASK", new OneTimeSchedule(clock.now().plusSeconds(1)),
                new FireImmediatelyMisfirePolicy(), 5);
        clock.advance(Duration.ofSeconds(1));
        engine.dispatchIfDue(job.getId());
        assertEquals(JobStatus.COMPLETED, engine.getJob(job.getId()).getStatus());

        assertThrows(InvalidJobTransitionException.class, () -> engine.cancel(job.getId()));
    }
}
