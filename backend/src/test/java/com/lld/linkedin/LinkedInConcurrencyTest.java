package com.lld.linkedin;

import com.lld.linkedin.exception.ConnectionException;
import com.lld.linkedin.exception.UserAlreadyExistsException;
import com.lld.linkedin.exception.ValidationException;
import com.lld.linkedin.model.Connection;
import com.lld.linkedin.model.JobPosting;
import com.lld.linkedin.model.User;
import com.lld.linkedin.observer.InAppNotificationObserver;
import com.lld.linkedin.observer.LoggingNotificationObserver;
import com.lld.linkedin.repository.LinkedInRepository;
import com.lld.linkedin.service.LinkedInService;
import com.lld.linkedin.strategy.WeightedJobSearchStrategy;
import com.lld.linkedin.strategy.WeightedUserSearchStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Genuine multi-threaded concurrency tests for the canonical pair-locked connection workflow and
 * the atomic email/job-application claims — {@code LinkedInServiceTest} only ever calls these
 * sequentially, which cannot exercise {@code connectionLocks} at all.
 */
public class LinkedInConcurrencyTest {
    private LinkedInService service;

    @BeforeEach
    public void setUp() {
        service = new LinkedInService(new LinkedInRepository(), new WeightedUserSearchStrategy(),
                new WeightedJobSearchStrategy(), new InAppNotificationObserver(), new LoggingNotificationObserver());
    }

    @Test
    public void concurrentConnectionRequestsBetweenTheSamePairExactlyOneSucceeds() throws Exception {
        User alice = service.registerUser("Alice", "alice-race@example.com", "pass");
        User bob = service.registerUser("Bob", "bob-race@example.com", "pass");

        int threads = 16;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            // Alternate direction — the canonical min(u1,u2)#max(u1,u2) key must serialize both
            // directions against the SAME lock, not two different ones.
            boolean aliceInitiates = i % 2 == 0;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    if (aliceInitiates) {
                        service.sendConnectionRequest(alice.getId(), bob.getId());
                    } else {
                        service.sendConnectionRequest(bob.getId(), alice.getId());
                    }
                    successCount.incrementAndGet();
                } catch (ConnectionException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "exactly one of 16 racing connection requests (from either direction) should create the pending connection");
        assertEquals(threads - 1, rejectedCount.get());
    }

    @Test
    public void concurrentRegistrationsWithTheSameEmailExactlyOneSucceeds() throws Exception {
        int threads = 12;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.registerUser("Racer " + idx, "shared-email@example.com", "pass" + idx);
                    successCount.incrementAndGet();
                } catch (UserAlreadyExistsException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "exactly one of 12 concurrent registrations for the same email should win");
        assertEquals(threads - 1, rejectedCount.get());
    }

    @Test
    public void concurrentApplicationsFromTheSameCandidateToTheSameJobExactlyOneSucceeds() throws Exception {
        User poster = service.registerUser("Poster", "poster-race@example.com", "pass");
        User candidate = service.registerUser("Candidate", "candidate-race@example.com", "pass");
        JobPosting job = service.postJob(poster.getId(), "Engineer", "Acme", "Remote", "desc",
                com.lld.linkedin.enums.EmploymentType.FULL_TIME, null);

        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.applyForJob(candidate.getId(), job.getId());
                    successCount.incrementAndGet();
                } catch (ValidationException e) {
                    rejectedCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "the same candidate racing to apply 10 times must only ever be recorded as having applied once");
        assertEquals(threads - 1, rejectedCount.get());
        assertEquals(1, job.getApplicants().size());
    }

    @Test
    public void distinctCandidatesApplyingConcurrentlyAllSucceed() throws Exception {
        User poster = service.registerUser("Poster2", "poster-race2@example.com", "pass");
        JobPosting job = service.postJob(poster.getId(), "Engineer", "Acme", "Remote", "desc",
                com.lld.linkedin.enums.EmploymentType.FULL_TIME, null);

        int threads = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            User candidate = service.registerUser("Candidate " + idx, "candidate" + idx + "-race2@example.com", "pass");
            executor.submit(() -> {
                try {
                    startLatch.await();
                    service.applyForJob(candidate.getId(), job.getId());
                    successCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(threads, successCount.get(), "distinct candidates never conflict, so every application succeeds");
        assertEquals(threads, job.getApplicants().size());
    }
}
