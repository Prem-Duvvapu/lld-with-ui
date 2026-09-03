package com.lld.meetingscheduler.repository;

import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * In-memory storage. Plain {@link ConcurrentHashMap}s per entity — safe for independent reads/
 * writes of different keys, but NOT sufficient on its own to prevent two overlapping meetings
 * being booked into the same room, or the same person, at once. That invariant is enforced by
 * {@link com.lld.meetingscheduler.service.ConflictDetectionService}'s single lock around a
 * check-then-act sequence spanning {@link #getMeetingsForRoom(String)} and
 * {@link #getMeetingsForAttendee(String)}.
 */
@Repository
public class MeetingSchedulerRepository {

    private final Map<String, MeetingRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, Meeting> meetings = new ConcurrentHashMap<>();

    private final AtomicInteger roomCounter = new AtomicInteger(0);
    private final AtomicInteger meetingCounter = new AtomicInteger(0);

    // --- Rooms ---
    public String generateRoomId() {
        return "MR-" + String.format("%03d", roomCounter.incrementAndGet());
    }

    public MeetingRoom saveRoom(MeetingRoom room) {
        rooms.put(room.getId(), room);
        return room;
    }

    public MeetingRoom getRoom(String id) {
        return rooms.get(id);
    }

    public List<MeetingRoom> getAllRooms() {
        return new ArrayList<>(rooms.values());
    }

    // --- Meetings ---
    public String generateMeetingId() {
        return "MTG-" + String.format("%05d", meetingCounter.incrementAndGet());
    }

    public Meeting saveMeeting(Meeting meeting) {
        meetings.put(meeting.getId(), meeting);
        return meeting;
    }

    public void updateMeeting(Meeting meeting) {
        meetings.put(meeting.getId(), meeting);
    }

    public Meeting getMeeting(String id) {
        return meetings.get(id);
    }

    public List<Meeting> getAllMeetings() {
        return meetings.values().stream()
                .sorted(Comparator.comparing(Meeting::getStart))
                .collect(Collectors.toList());
    }

    /** Every meeting booked into this room, regardless of status — the caller filters by what
     *  still blocks the calendar. */
    public List<Meeting> getMeetingsForRoom(String roomId) {
        return meetings.values().stream()
                .filter(m -> m.getRoomId().equals(roomId))
                .collect(Collectors.toList());
    }

    /** Every meeting where {@code personId} organizes or attends, regardless of status. */
    public List<Meeting> getMeetingsForAttendee(String personId) {
        return meetings.values().stream()
                .filter(m -> m.allParticipants().contains(personId))
                .collect(Collectors.toList());
    }

    /** Wipes all state. Used only by the isolated sim sandbox's reset. */
    public void clear() {
        rooms.clear();
        meetings.clear();
        roomCounter.set(0);
        meetingCounter.set(0);
    }
}
