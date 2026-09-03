package com.lld.meetingscheduler;

import com.lld.meetingscheduler.exception.InvalidMeetingTimeException;
import com.lld.meetingscheduler.exception.MeetingNotFoundException;
import com.lld.meetingscheduler.exception.RoomNotFoundException;
import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import com.lld.meetingscheduler.service.ConflictDetectionService;
import com.lld.meetingscheduler.service.MeetingSchedulerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("MeetingSchedulerService — facade behaviour and sim/live isolation")
class MeetingSchedulerServiceTest {

    private MeetingSchedulerRepository repository;
    private MeetingSchedulerService service;
    private static final LocalDate TOMORROW = LocalDate.now().plusDays(1);

    @BeforeEach
    void setUp() {
        repository = new MeetingSchedulerRepository();
        ConflictDetectionService conflictService = new ConflictDetectionService(repository);
        service = new MeetingSchedulerService(repository, conflictService);
        repository.saveRoom(MeetingRoom.builder().id("MR-1").name("Falcon").capacity(8).build());
    }

    private LocalDateTime at(int hour) {
        return LocalDateTime.of(TOMORROW, LocalTime.of(hour, 0));
    }

    @Test
    @DisplayName("getRoom on an unknown id throws RoomNotFoundException")
    void unknownRoomThrows() {
        assertThrows(RoomNotFoundException.class, () -> service.getRoom("GHOST"));
    }

    @Test
    @DisplayName("bookMeeting rejects end time not after start time")
    void endNotAfterStartRejected() {
        assertThrows(InvalidMeetingTimeException.class,
                () -> service.bookMeeting("MR-1", "alice", List.of(), "t", at(10), at(10)));
        assertThrows(InvalidMeetingTimeException.class,
                () -> service.bookMeeting("MR-1", "alice", List.of(), "t", at(10), at(9)));
    }

    @Test
    @DisplayName("bookMeeting rejects null start/end")
    void nullTimesRejected() {
        assertThrows(InvalidMeetingTimeException.class,
                () -> service.bookMeeting("MR-1", "alice", List.of(), "t", null, at(10)));
    }

    @Test
    @DisplayName("getAvailability returns only that room's meetings on the given date, earliest first")
    void getAvailabilityFiltersByRoomAndDate() {
        service.bookMeeting("MR-1", "alice", List.of(), "Late", at(14), at(15));
        service.bookMeeting("MR-1", "bob", List.of(), "Early", at(9), at(10));

        List<Meeting> slots = service.getAvailability("MR-1", TOMORROW);
        assertEquals(2, slots.size());
        assertEquals("Early", slots.get(0).getTitle(), "must be sorted by start time");
        assertEquals("Late", slots.get(1).getTitle());
    }

    @Test
    @DisplayName("getMeetingsForPerson finds meetings by organizer or attendee across rooms")
    void getMeetingsForPersonSpansRooms() {
        repository.saveRoom(MeetingRoom.builder().id("MR-2").name("Griffin").capacity(4).build());
        service.bookMeeting("MR-1", "alice", List.of("bob"), "First", at(9), at(10));
        service.bookMeeting("MR-2", "carol", List.of(), "Unrelated", at(9), at(10));

        assertEquals(1, service.getMeetingsForPerson("bob").size());
        assertEquals(0, service.getMeetingsForPerson("dave").size());
    }

    @Test
    @DisplayName("cancelMeeting on an unknown id throws MeetingNotFoundException")
    void cancelUnknownThrows() {
        assertThrows(MeetingNotFoundException.class, () -> service.cancelMeeting("GHOST"));
    }

    @Test
    @DisplayName("Live and sim state are fully isolated: booking in sim never touches live rooms/meetings")
    void simIsIsolatedFromLive() {
        MeetingRoom simRoom = service.simSeedRoom(MeetingRoom.builder().name("Sim Room").capacity(6).build());
        service.simBookMeeting(simRoom.getId(), "sim-alice", List.of(), "Sim Meeting", at(9), at(10));

        assertEquals(1, service.simGetRooms().size());
        assertEquals(1, service.simGetMeetings().size());
        // Live state is exactly what setUp() seeded: one room, zero meetings.
        assertEquals(1, service.getAllRooms().size());
        assertEquals(0, service.getAllMeetings().size());
    }

    @Test
    @DisplayName("simReset wipes only the sim sandbox")
    void simResetWipesOnlySandbox() {
        service.bookMeeting("MR-1", "alice", List.of(), "Live", at(9), at(10));
        MeetingRoom simRoom = service.simSeedRoom(MeetingRoom.builder().name("Sim Room").capacity(6).build());
        service.simBookMeeting(simRoom.getId(), "alice", List.of(), "Sim", at(9), at(10));

        service.simReset();

        assertTrue(service.simGetRooms().isEmpty());
        assertTrue(service.simGetMeetings().isEmpty());
        assertEquals(1, service.getAllMeetings().size(), "live meeting must survive a sim reset");
    }
}
