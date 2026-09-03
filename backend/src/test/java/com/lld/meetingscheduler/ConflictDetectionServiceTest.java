package com.lld.meetingscheduler;

import com.lld.meetingscheduler.exception.AttendeeConflictException;
import com.lld.meetingscheduler.exception.MeetingNotFoundException;
import com.lld.meetingscheduler.exception.RoomConflictException;
import com.lld.meetingscheduler.exception.RoomNotFoundException;
import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.model.MeetingStatus;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import com.lld.meetingscheduler.service.ConflictDetectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Single-threaded correctness of the overlap-detection algorithm itself — the "unit"/"strategy"
 * flavour for this module, since there is no Strategy interface here (the interesting logic is
 * the interval-overlap check and the two-dimensional conflict rule, not a swappable policy).
 * {@link com.lld.meetingscheduler.MeetingSchedulerConcurrencyTest} covers this same service under
 * real thread contention.
 */
@DisplayName("ConflictDetectionService — room- and attendee-level overlap detection")
class ConflictDetectionServiceTest {

    private MeetingSchedulerRepository repository;
    private ConflictDetectionService service;
    private static final LocalDateTime NOON = LocalDateTime.now().withHour(12).withMinute(0).withSecond(0).withNano(0);

    @BeforeEach
    void setUp() {
        repository = new MeetingSchedulerRepository();
        service = new ConflictDetectionService(repository);
        repository.saveRoom(MeetingRoom.builder().id("MR-1").name("Falcon").capacity(8).build());
        repository.saveRoom(MeetingRoom.builder().id("MR-2").name("Griffin").capacity(4).build());
    }

    @Test
    @DisplayName("Booking into an unknown room throws RoomNotFoundException")
    void unknownRoomThrows() {
        assertThrows(RoomNotFoundException.class,
                () -> service.book("GHOST", "alice", List.of(), "t", NOON, NOON.plusHours(1)));
    }

    @Test
    @DisplayName("Two non-overlapping meetings in the same room both succeed")
    void nonOverlappingMeetingsInSameRoomSucceed() {
        service.book("MR-1", "alice", List.of(), "Standup", NOON, NOON.plusMinutes(30));
        Meeting second = service.book("MR-1", "bob", List.of(), "Retro", NOON.plusMinutes(30), NOON.plusHours(1));
        assertEquals(MeetingStatus.SCHEDULED, second.getStatus());
        assertEquals(2, repository.getMeetingsForRoom("MR-1").size());
    }

    @Test
    @DisplayName("An overlapping booking in the same room is rejected with RoomConflictException")
    void overlappingBookingInSameRoomRejected() {
        service.book("MR-1", "alice", List.of(), "Standup", NOON, NOON.plusHours(1));
        RoomConflictException ex = assertThrows(RoomConflictException.class,
                () -> service.book("MR-1", "carol", List.of(), "Overlap", NOON.plusMinutes(30), NOON.plusHours(2)));
        assertTrue(ex.getMessage().contains("MR-1"));
    }

    @Test
    @DisplayName("Back-to-back meetings (one ends exactly when the other starts) do not conflict")
    void backToBackMeetingsDoNotOverlap() {
        service.book("MR-1", "alice", List.of(), "First", NOON, NOON.plusHours(1));
        Meeting second = service.book("MR-1", "bob", List.of(), "Second", NOON.plusHours(1), NOON.plusHours(2));
        assertEquals(MeetingStatus.SCHEDULED, second.getStatus());
    }

    @Test
    @DisplayName("Booking an attendee into a DIFFERENT room at an overlapping time is rejected with AttendeeConflictException")
    void overlappingAttendeeAcrossDifferentRoomsRejected() {
        service.book("MR-1", "alice", List.of("bob"), "Planning", NOON, NOON.plusHours(1));
        AttendeeConflictException ex = assertThrows(AttendeeConflictException.class,
                () -> service.book("MR-2", "carol", List.of("bob"), "Conflicting", NOON.plusMinutes(30), NOON.plusHours(2)));
        assertTrue(ex.getMessage().contains("bob"));
        assertTrue(repository.getMeetingsForRoom("MR-2").isEmpty(), "the rejected meeting must not be persisted");
    }

    @Test
    @DisplayName("The organizer counts as a participant for attendee-conflict checking too")
    void organizerIsCheckedForConflictsLikeAnyAttendee() {
        service.book("MR-1", "alice", List.of(), "First", NOON, NOON.plusHours(1));
        assertThrows(AttendeeConflictException.class,
                () -> service.book("MR-2", "alice", List.of(), "Second, same organizer", NOON.plusMinutes(15), NOON.plusHours(2)));
    }

    @Test
    @DisplayName("A cancelled meeting no longer blocks the room or its participants' calendars")
    void cancelledMeetingFreesRoomAndAttendees() {
        Meeting first = service.book("MR-1", "alice", List.of("bob"), "First", NOON, NOON.plusHours(1));
        service.cancel(first.getId());

        Meeting rebooked = service.book("MR-1", "carol", List.of("bob"), "Rebooked", NOON, NOON.plusHours(1));
        assertEquals(MeetingStatus.SCHEDULED, rebooked.getStatus());
    }

    @Test
    @DisplayName("Cancelling an unknown meeting throws MeetingNotFoundException")
    void cancelUnknownMeetingThrows() {
        assertThrows(MeetingNotFoundException.class, () -> service.cancel("GHOST"));
    }
}
