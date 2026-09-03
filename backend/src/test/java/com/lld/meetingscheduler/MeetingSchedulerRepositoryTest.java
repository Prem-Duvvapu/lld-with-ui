package com.lld.meetingscheduler;

import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.model.MeetingStatus;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("MeetingSchedulerRepository — in-memory storage")
class MeetingSchedulerRepositoryTest {

    private MeetingSchedulerRepository repository;

    @BeforeEach
    void setUp() {
        repository = new MeetingSchedulerRepository();
    }

    @Test
    @DisplayName("Room and meeting ids are generated with the expected prefixes and are unique")
    void idsAreUniqueAndPrefixed() {
        String r1 = repository.generateRoomId();
        String r2 = repository.generateRoomId();
        assertTrue(r1.startsWith("MR-"));
        assertNotEquals(r1, r2);

        String m1 = repository.generateMeetingId();
        String m2 = repository.generateMeetingId();
        assertTrue(m1.startsWith("MTG-"));
        assertNotEquals(m1, m2);
    }

    @Test
    @DisplayName("saveRoom then getRoom round-trips; unknown id returns null")
    void roomRoundTrip() {
        MeetingRoom room = MeetingRoom.builder().id("MR-001").name("Falcon").capacity(8).location("3F").build();
        repository.saveRoom(room);
        assertEquals(room, repository.getRoom("MR-001"));
        assertNull(repository.getRoom("GHOST"));
    }

    @Test
    @DisplayName("getAllRooms returns every saved room")
    void getAllRoomsReturnsEverything() {
        repository.saveRoom(MeetingRoom.builder().id("MR-1").name("A").capacity(4).build());
        repository.saveRoom(MeetingRoom.builder().id("MR-2").name("B").capacity(8).build());
        assertEquals(2, repository.getAllRooms().size());
    }

    private Meeting meeting(String id, String roomId, String organizer, List<String> attendees, int startHour) {
        LocalDateTime start = LocalDateTime.now().withHour(startHour).withMinute(0).withSecond(0).withNano(0);
        return Meeting.builder()
                .id(id).roomId(roomId).organizerId(organizer).attendeeIds(attendees)
                .title("t").start(start).end(start.plusHours(1)).status(MeetingStatus.SCHEDULED)
                .createdAt(LocalDateTime.now()).build();
    }

    @Test
    @DisplayName("getMeetingsForRoom returns only meetings in that room, regardless of status")
    void getMeetingsForRoomFiltersByRoom() {
        repository.saveMeeting(meeting("MTG-1", "MR-1", "alice", List.of(), 9));
        repository.saveMeeting(meeting("MTG-2", "MR-2", "bob", List.of(), 10));
        Meeting cancelled = meeting("MTG-3", "MR-1", "carol", List.of(), 11);
        cancelled.setStatus(MeetingStatus.CANCELLED);
        repository.saveMeeting(cancelled);

        List<Meeting> room1 = repository.getMeetingsForRoom("MR-1");
        assertEquals(2, room1.size(), "cancelled meetings still show up — the caller filters by status");
    }

    @Test
    @DisplayName("getMeetingsForAttendee matches both the organizer and every listed attendee")
    void getMeetingsForAttendeeMatchesOrganizerAndAttendees() {
        repository.saveMeeting(meeting("MTG-1", "MR-1", "alice", List.of("bob", "carol"), 9));
        repository.saveMeeting(meeting("MTG-2", "MR-2", "dave", List.of("alice"), 10));
        repository.saveMeeting(meeting("MTG-3", "MR-3", "eve", List.of(), 11));

        assertEquals(2, repository.getMeetingsForAttendee("alice").size(), "organizer of MTG-1, attendee of MTG-2");
        assertEquals(1, repository.getMeetingsForAttendee("bob").size());
        assertEquals(0, repository.getMeetingsForAttendee("frank").size());
    }

    @Test
    @DisplayName("updateMeeting overwrites the stored meeting by id")
    void updateMeetingOverwrites() {
        Meeting m = meeting("MTG-1", "MR-1", "alice", List.of(), 9);
        repository.saveMeeting(m);
        m.setStatus(MeetingStatus.CANCELLED);
        repository.updateMeeting(m);
        assertEquals(MeetingStatus.CANCELLED, repository.getMeeting("MTG-1").getStatus());
    }

    @Test
    @DisplayName("getAllMeetings sorts by start time ascending")
    void getAllMeetingsSortsByStart() {
        repository.saveMeeting(meeting("MTG-2", "MR-1", "b", List.of(), 14));
        repository.saveMeeting(meeting("MTG-1", "MR-1", "a", List.of(), 9));
        List<Meeting> all = repository.getAllMeetings();
        assertEquals("MTG-1", all.get(0).getId());
        assertEquals("MTG-2", all.get(1).getId());
    }

    @Test
    @DisplayName("clear wipes rooms, meetings, and resets id counters")
    void clearWipesEverything() {
        repository.saveRoom(MeetingRoom.builder().id(repository.generateRoomId()).name("A").capacity(4).build());
        repository.saveMeeting(meeting(repository.generateMeetingId(), "MR-1", "a", List.of(), 9));
        repository.clear();

        assertTrue(repository.getAllRooms().isEmpty());
        assertTrue(repository.getAllMeetings().isEmpty());
        assertEquals("MR-001", repository.generateRoomId(), "counters must reset, not just the maps");
        assertEquals("MTG-00001", repository.generateMeetingId());
    }
}
