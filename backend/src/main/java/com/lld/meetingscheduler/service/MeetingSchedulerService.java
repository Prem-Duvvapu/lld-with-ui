package com.lld.meetingscheduler.service;

import com.lld.meetingscheduler.exception.InvalidMeetingTimeException;
import com.lld.meetingscheduler.exception.MeetingNotFoundException;
import com.lld.meetingscheduler.exception.RoomNotFoundException;
import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Facade over the whole module. The controller delegates every call here wholesale.
 *
 * <p>Carries a second, isolated {@link MeetingSchedulerRepository} + {@link ConflictDetectionService}
 * pair ({@code simRepository} / {@code simConflictService}) for the interactive {@code /sim/*}
 * demo, so driving the simulation can never corrupt the real rooms/meetings — same shape as
 * {@code CarRentalService}'s {@code simRepository}/{@code simLockService}.
 */
@Service
public class MeetingSchedulerService {

    private final MeetingSchedulerRepository repository;
    private final MeetingSchedulerRepository simRepository;
    private final ConflictDetectionService conflictService;
    private final ConflictDetectionService simConflictService;

    public MeetingSchedulerService(MeetingSchedulerRepository repository, ConflictDetectionService conflictService) {
        this.repository = repository;
        this.conflictService = conflictService;
        this.simRepository = new MeetingSchedulerRepository();
        this.simConflictService = new ConflictDetectionService(simRepository);
    }

    // ================= Rooms =================

    public List<MeetingRoom> getAllRooms() {
        return repository.getAllRooms();
    }

    public MeetingRoom getRoom(String id) {
        MeetingRoom room = repository.getRoom(id);
        if (room == null) throw new RoomNotFoundException("Room not found: " + id);
        return room;
    }

    /** Every non-cancelled meeting booked into this room on the given date, earliest first. */
    public List<Meeting> getAvailability(String roomId, LocalDate date) {
        getRoom(roomId); // 404s if the room doesn't exist
        return repository.getMeetingsForRoom(roomId).stream()
                .filter(m -> m.getStatus().blocksCalendar())
                .filter(m -> m.getStart().toLocalDate().equals(date))
                .sorted((a, b) -> a.getStart().compareTo(b.getStart()))
                .collect(Collectors.toList());
    }

    // ================= Meetings =================

    private void validateTimes(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new InvalidMeetingTimeException("Start and end time are required");
        }
        if (!end.isAfter(start)) {
            throw new InvalidMeetingTimeException("End time must be after start time");
        }
    }

    /**
     * Books a meeting into {@code roomId} for [start,end). The one contended step — checking the
     * room's and every participant's calendar for a conflict and inserting the new meeting — is
     * delegated to {@link ConflictDetectionService}, which does both atomically under one lock.
     */
    public Meeting bookMeeting(String roomId, String organizerId, List<String> attendeeIds, String title,
                                LocalDateTime start, LocalDateTime end) {
        validateTimes(start, end);
        return conflictService.book(roomId, organizerId, attendeeIds, title, start, end);
    }

    public Meeting cancelMeeting(String meetingId) {
        return conflictService.cancel(meetingId);
    }

    public Meeting getMeeting(String id) {
        Meeting meeting = repository.getMeeting(id);
        if (meeting == null) throw new MeetingNotFoundException("Meeting not found: " + id);
        return meeting;
    }

    public List<Meeting> getAllMeetings() {
        return repository.getAllMeetings();
    }

    public List<Meeting> getMeetingsForPerson(String personId) {
        return repository.getMeetingsForAttendee(personId);
    }

    // ================= ISOLATED SIMULATION ENGINE =================
    // Mirrors the real workflow one-for-one against simRepository/simConflictService so the demo
    // tab can be reset and replayed without ever touching live room or meeting data.

    public void simReset() {
        simRepository.clear();
    }

    public MeetingRoom simSeedRoom(MeetingRoom room) {
        if (room.getId() == null || room.getId().isEmpty()) {
            room.setId(simRepository.generateRoomId());
        }
        return simRepository.saveRoom(room);
    }

    public List<MeetingRoom> simGetRooms() {
        return simRepository.getAllRooms();
    }

    public List<Meeting> simGetMeetings() {
        return simRepository.getAllMeetings();
    }

    public Meeting simBookMeeting(String roomId, String organizerId, List<String> attendeeIds, String title,
                                   LocalDateTime start, LocalDateTime end) {
        validateTimes(start, end);
        return simConflictService.book(roomId, organizerId, attendeeIds, title, start, end);
    }

    public Meeting simCancelMeeting(String meetingId) {
        return simConflictService.cancel(meetingId);
    }
}
