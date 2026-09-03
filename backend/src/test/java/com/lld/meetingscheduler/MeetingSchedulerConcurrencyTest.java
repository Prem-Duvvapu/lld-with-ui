package com.lld.meetingscheduler;

import com.lld.meetingscheduler.exception.AttendeeConflictException;
import com.lld.meetingscheduler.exception.RoomConflictException;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import com.lld.meetingscheduler.service.ConflictDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the two conflict dimensions {@link ConflictDetectionService} has to get right under real
 * thread contention: the room itself, and every participant's calendar <em>across</em> rooms.
 *
 * <p>The second dimension is the interesting one and the reason this module uses a single global
 * lock rather than {@code carrental}'s per-resource lock (see {@link ConflictDetectionService}'s
 * class javadoc for the full argument) — {@link #sameAttendeeDifferentRooms_onlyOneWins()} is the
 * test that would fail if this module were naively built with a per-room lock instead: two
 * threads booking different rooms would each acquire a different lock, both read the shared
 * attendee's calendar clean, and both succeed.
 */
@DisplayName("MeetingScheduler Concurrency — room and cross-room attendee conflict races")
class MeetingSchedulerConcurrencyTest {

    private MeetingSchedulerRepository repository;
    private ConflictDetectionService service;
    private static final LocalDateTime NOON = LocalDateTime.now().plusDays(1)
            .withHour(12).withMinute(0).withSecond(0).withNano(0);

    @BeforeEach
    void setUp() {
        repository = new MeetingSchedulerRepository();
        service = new ConflictDetectionService(repository);
        repository.saveRoom(MeetingRoom.builder().id("MR-1").name("Falcon").capacity(8).build());
        repository.saveRoom(MeetingRoom.builder().id("MR-2").name("Griffin").capacity(4).build());
    }

    @Test
    @DisplayName("Two threads racing to book the SAME room for overlapping times: exactly one wins")
    void sameRoomOverlappingTimes_onlyOneWins() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        for (String organizer : List.of("alice", "bob")) {
            pool.submit(() -> {
                try {
                    startLatch.await();
                    service.book("MR-1", organizer, List.of(), "Meeting by " + organizer, NOON, NOON.plusHours(1));
                    wins.incrementAndGet();
                } catch (RoomConflictException expected) {
                    rejections.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "booking did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "exactly one organizer may claim this room for this time");
        assertEquals(1, rejections.get());
        assertEquals(1, repository.getMeetingsForRoom("MR-1").stream()
                .filter(m -> m.getStatus().blocksCalendar()).count());
    }

    @Test
    @DisplayName("Two threads racing to book the SAME attendee into DIFFERENT rooms at overlapping times: exactly one wins")
    void sameAttendeeDifferentRooms_onlyOneWins() throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        AtomicInteger wins = new AtomicInteger();
        AtomicInteger rejections = new AtomicInteger();

        // Both threads try to put "bob" into a meeting at the same time — one in MR-1, one in
        // MR-2. A per-room lock would let both succeed; the single global lock must not.
        Runnable bookInRoom1 = () -> {
            try {
                startLatch.await();
                service.book("MR-1", "alice", List.of("bob"), "Planning", NOON, NOON.plusHours(1));
                wins.incrementAndGet();
            } catch (AttendeeConflictException expected) {
                rejections.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        };
        Runnable bookInRoom2 = () -> {
            try {
                startLatch.await();
                service.book("MR-2", "carol", List.of("bob"), "Review", NOON.plusMinutes(30), NOON.plusHours(2));
                wins.incrementAndGet();
            } catch (AttendeeConflictException expected) {
                rejections.incrementAndGet();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        };

        pool.submit(bookInRoom1);
        pool.submit(bookInRoom2);
        startLatch.countDown();
        assertTrue(done.await(5, TimeUnit.SECONDS), "booking did not finish — possible deadlock");
        pool.shutdown();

        assertEquals(1, wins.get(), "bob ended up double-booked across two different rooms");
        assertEquals(1, rejections.get());
        assertEquals(1, repository.getMeetingsForAttendee("bob").stream()
                .filter(m -> m.getStatus().blocksCalendar()).count());
    }

    @Test
    @DisplayName("The cross-room attendee race repeated 200 times: never two winners, not even once")
    void repeatedCrossRoomRaceNeverProducesTwoWinners() throws InterruptedException {
        int rounds = 200;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < rounds; round++) {
                MeetingSchedulerRepository repo = new MeetingSchedulerRepository();
                ConflictDetectionService local = new ConflictDetectionService(repo);
                repo.saveRoom(MeetingRoom.builder().id("MR-1").name("A").capacity(4).build());
                repo.saveRoom(MeetingRoom.builder().id("MR-2").name("B").capacity(4).build());

                CountDownLatch startLatch = new CountDownLatch(1);
                CountDownLatch done = new CountDownLatch(2);
                AtomicInteger wins = new AtomicInteger();

                pool.submit(() -> {
                    try {
                        startLatch.await();
                        local.book("MR-1", "alice", List.of("shared"), "t1", NOON, NOON.plusHours(1));
                        wins.incrementAndGet();
                    } catch (AttendeeConflictException expected) {
                        // lost the race
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
                pool.submit(() -> {
                    try {
                        startLatch.await();
                        local.book("MR-2", "bob", List.of("shared"), "t2", NOON, NOON.plusHours(1));
                        wins.incrementAndGet();
                    } catch (AttendeeConflictException expected) {
                        // lost the race
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });

                startLatch.countDown();
                assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " did not finish");
                assertEquals(1, wins.get(), "round " + round + " double-booked the shared attendee");
            }
        } finally {
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "pool did not shut down");
        }
    }

    @Test
    @DisplayName("Many concurrent NON-conflicting bookings (different rooms, different people) all succeed despite the single lock")
    void nonConflictingConcurrentBookingsAllSucceed() throws InterruptedException {
        // The single global lock trades throughput for correctness (see class javadoc) — but it
        // must never REJECT work that has no real conflict. This is the test that would catch an
        // over-eager implementation that locks correctly but scans the wrong data.
        int count = 20;
        for (int i = 0; i < count; i++) {
            repository.saveRoom(MeetingRoom.builder().id("ROOM-" + i).name("Room " + i).capacity(4).build());
        }
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);
        Set<String> ids = ConcurrentHashMap.newKeySet();

        for (int i = 0; i < count; i++) {
            String roomId = "ROOM-" + i;
            String person = "person-" + i;
            pool.submit(() -> {
                try {
                    startLatch.await();
                    var meeting = service.book(roomId, person, List.of(), "t", NOON, NOON.plusHours(1));
                    ids.add(meeting.getId());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "bookings did not finish");
        pool.shutdown();

        assertEquals(count, ids.size(), "distinct non-conflicting bookings must not reject each other");
    }
}
