package com.lld.courseregistration;

import com.lld.courseregistration.model.Course;
import com.lld.courseregistration.model.Registration;
import com.lld.courseregistration.model.RegistrationStatus;
import com.lld.courseregistration.model.Section;
import com.lld.courseregistration.model.Student;
import com.lld.courseregistration.model.TimeSlot;
import com.lld.courseregistration.repository.CourseRegistrationRepository;
import com.lld.courseregistration.service.CourseRegistrationService;
import com.lld.courseregistration.service.SectionCapacityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the last-open-seat race in {@link SectionCapacityManager}: N students registering for a
 * section at the same instant must never leave {@code enrolledCount > capacity}, and exactly one
 * must win the seat — the rest are WAITLISTED, not rejected outright (this module's stated
 * behaviour: a full section queues the request rather than failing it).
 *
 * <p>This was verified the hard way, not just written and trusted: with the lock in
 * {@link SectionCapacityManager#register} temporarily removed, {@code twentyStudentsRacingForOneSeat_exactlyOneEnrolls}
 * and {@code repeatedRaceNeverProducesTwoWinners} both failed — over-enrollment (more than 1
 * ENROLLED for a capacity-1 section) reproduced within the first few of 300 rounds. Restoring the
 * lock made every test in this class pass again. See RCA.md for the captured failure output.
 */
@DisplayName("Course Registration Concurrency — Capacity Races & Waitlist Promotion")
class CourseRegistrationConcurrencyTest {

    private CourseRegistrationRepository repository;
    private CourseRegistrationService service;

    @BeforeEach
    void setUp() {
        repository = new CourseRegistrationRepository();
        SectionCapacityManager capacityManager = new SectionCapacityManager(repository);
        service = new CourseRegistrationService(repository, capacityManager);
    }

    private void givenCourse(String id) {
        repository.saveCourse(Course.builder().id(id).code(id).title(id).description("d")
                .credits(3).department("CS").prerequisiteCourseCodes(List.of()).build());
    }

    private void givenSection(String id, String courseId, int capacity, DayOfWeek day) {
        repository.saveSection(Section.builder().id(id).courseId(courseId).sectionCode("A")
                .professorName("Dr. Test").capacity(capacity).enrolledCount(0)
                .timeSlot(TimeSlot.builder().days(EnumSet.of(day))
                        .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).room("R1").build())
                .semester("TERM").build());
    }

    private void givenStudent(String id) {
        repository.saveStudent(Student.builder().id(id).name(id).email(id + "@test.com")
                .department("CS").completedCourseCodes(new HashSet<>()).build());
    }

    @Test
    @DisplayName("Twenty students racing for the last open seat: exactly one ENROLLED, nineteen WAITLISTED (not rejected)")
    void twentyStudentsRacingForOneSeat_exactlyOneEnrolls() throws InterruptedException {
        givenCourse("C1");
        givenSection("SEC-1", "C1", 1, DayOfWeek.MONDAY);
        int students = 20;
        for (int i = 0; i < students; i++) givenStudent("S" + i);

        ExecutorService pool = Executors.newFixedThreadPool(students);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(students);
        AtomicInteger enrolled = new AtomicInteger();
        AtomicInteger waitlisted = new AtomicInteger();
        AtomicInteger otherOutcome = new AtomicInteger();

        for (int i = 0; i < students; i++) {
            String studentId = "S" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    Registration reg = service.register(studentId, "SEC-1");
                    if (reg.getStatus() == RegistrationStatus.ENROLLED) enrolled.incrementAndGet();
                    else if (reg.getStatus() == RegistrationStatus.WAITLISTED) waitlisted.incrementAndGet();
                    else otherOutcome.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    otherOutcome.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "registration did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(0, otherOutcome.get(), "every registration must land ENROLLED or WAITLISTED — none rejected outright");
        assertEquals(1, enrolled.get(), "exactly one student may claim the single seat");
        assertEquals(students - 1, waitlisted.get(), "everyone else must be queued on the waitlist");
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount(), "capacity must never be exceeded");
        assertEquals(students - 1, repository.getSection("SEC-1").getWaitlist().size());
    }

    @Test
    @DisplayName("The last-seat race repeated 300 times: never two winners, not even once")
    void repeatedRaceNeverProducesTwoWinners() throws InterruptedException {
        int rounds = 300;
        ExecutorService pool = Executors.newFixedThreadPool(2);

        try {
            for (int round = 0; round < rounds; round++) {
                CourseRegistrationRepository repo = new CourseRegistrationRepository();
                SectionCapacityManager mgr = new SectionCapacityManager(repo);
                CourseRegistrationService svc = new CourseRegistrationService(repo, mgr);

                repo.saveCourse(Course.builder().id("C1").code("C1").title("C1").description("d")
                        .credits(3).department("CS").prerequisiteCourseCodes(List.of()).build());
                repo.saveSection(Section.builder().id("SEC-1").courseId("C1").sectionCode("A")
                        .professorName("Dr. Test").capacity(1).enrolledCount(0)
                        .timeSlot(TimeSlot.builder().days(EnumSet.of(DayOfWeek.MONDAY))
                                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0)).room("R1").build())
                        .semester("TERM").build());
                repo.saveStudent(Student.builder().id("alice").name("alice").email("a@test.com")
                        .department("CS").completedCourseCodes(new HashSet<>()).build());
                repo.saveStudent(Student.builder().id("bob").name("bob").email("b@test.com")
                        .department("CS").completedCourseCodes(new HashSet<>()).build());

                CountDownLatch startLatch = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger enrolled = new AtomicInteger();

                for (String studentId : List.of("alice", "bob")) {
                    pool.submit(() -> {
                        try {
                            startLatch.await();
                            if (svc.register(studentId, "SEC-1").getStatus() == RegistrationStatus.ENROLLED) {
                                enrolled.incrementAndGet();
                            }
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        } finally {
                            done.countDown();
                        }
                    });
                }

                startLatch.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish");
                assertEquals(1, enrolled.get(), "round " + round + " enrolled more than one student in a capacity-1 section");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Concurrent drop + new registrations for the freed seat: the already-waitlisted student is promoted, never a new racer")
    void concurrentDropAndNewRegistrations_promotesOnlyTheQueuedStudent() throws InterruptedException {
        givenCourse("C1");
        givenSection("SEC-1", "C1", 1, DayOfWeek.MONDAY);
        givenStudent("S1");
        givenStudent("S2");
        for (int i = 0; i < 10; i++) givenStudent("newcomer" + i);

        Registration first = service.register("S1", "SEC-1");   // ENROLLED — fills the only seat
        Registration queued = service.register("S2", "SEC-1");  // WAITLISTED — first (and only) in line
        assertEquals(RegistrationStatus.ENROLLED, first.getStatus());
        assertEquals(RegistrationStatus.WAITLISTED, queued.getStatus());

        int newcomers = 10;
        ExecutorService pool = Executors.newFixedThreadPool(newcomers + 1);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(newcomers + 1);
        AtomicInteger newcomerEnrolled = new AtomicInteger();

        // One thread drops S1's confirmed seat...
        pool.submit(() -> {
            try {
                startLatch.await();
                service.drop(first.getId());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });
        // ...while ten brand-new students simultaneously try to grab a seat in the same section.
        for (int i = 0; i < newcomers; i++) {
            String studentId = "newcomer" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    if (service.register(studentId, "SEC-1").getStatus() == RegistrationStatus.ENROLLED) {
                        newcomerEnrolled.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception ignored) {
                    // AlreadyRegistered etc. are not the point of this test
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "drop/register race did not finish");
        pool.shutdown();

        assertEquals(0, newcomerEnrolled.get(), "a new racer must never win the seat ahead of an already-queued student");
        Registration reloadedQueued = repository.getRegistration(queued.getId());
        assertEquals(RegistrationStatus.ENROLLED, reloadedQueued.getStatus(), "the FIFO-head waitlisted student must be the one promoted");
        assertEquals(1, repository.getSection("SEC-1").getEnrolledCount(), "capacity must never be exceeded even mid-race");
    }

    @Test
    @DisplayName("Disjoint sections do not contend — ten sections, twenty students, ten wins")
    void disjointSectionsDoNotContend() throws InterruptedException {
        int pairs = 10;
        for (int i = 0; i < pairs; i++) {
            givenCourse("C" + i);
            givenSection("SEC-" + i, "C" + i, 1, DayOfWeek.MONDAY);
        }

        ExecutorService pool = Executors.newFixedThreadPool(pairs * 2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(pairs * 2);
        AtomicInteger enrolled = new AtomicInteger();

        for (int i = 0; i < pairs; i++) {
            String sectionId = "SEC-" + i;
            for (String suffix : List.of("a", "b")) {
                String studentId = sectionId + "-" + suffix;
                givenStudent(studentId);
                pool.submit(() -> {
                    try {
                        startLatch.await();
                        if (service.register(studentId, sectionId).getStatus() == RegistrationStatus.ENROLLED) {
                            enrolled.incrementAndGet();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "per-section locks should not have serialised unrelated sections");
        pool.shutdown();

        assertEquals(pairs, enrolled.get(), "each of the ten independent capacity-1 sections must seat exactly one student");
    }

    @Test
    @DisplayName("Concurrent registrations across many sections all persist with unique registration ids")
    void concurrentRegistrationsAllPersistWithUniqueIds() throws InterruptedException {
        int count = 50;
        givenCourse("C1");
        for (int i = 0; i < count; i++) {
            givenSection("SEC-" + i, "C1", 5, DayOfWeek.MONDAY);
            givenStudent("S" + i);
        }

        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < count; i++) {
            String sectionId = "SEC-" + i;
            String studentId = "S" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    ids.add(service.register(studentId, sectionId).getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "registration did not finish");
        pool.shutdown();

        assertEquals(count, ids.size(), "duplicate registration ids were handed out");
    }
}
