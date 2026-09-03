package com.lld.meetingscheduler.service;

import com.lld.meetingscheduler.exception.AttendeeConflictException;
import com.lld.meetingscheduler.exception.MeetingNotFoundException;
import com.lld.meetingscheduler.exception.RoomConflictException;
import com.lld.meetingscheduler.exception.RoomNotFoundException;
import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.model.MeetingStatus;
import com.lld.meetingscheduler.repository.MeetingSchedulerRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises meeting creation/cancellation so two overlapping bookings can never both be
 * confirmed against the same room, or the same person's calendar.
 *
 * <h2>Why one global lock, not a per-room lock like {@code carrental.ReservationLockService}</h2>
 * <p>Car rental's per-vehicle lock works because its only conflict dimension is the vehicle
 * itself — one resource, one lock. A meeting has <b>two</b> conflict dimensions that don't share a
 * key: the room, and every attendee, each of whom can appear in meetings across
 * <i>any number of different rooms</i>. A per-room lock cannot make attendee-conflict checking
 * safe: two threads booking Bob into Room A and Room B respectively, at overlapping times, each
 * acquire a <em>different</em> room's lock, each read Bob's calendar and see no conflict, and both
 * succeed — Bob ends up double-booked despite every individual room lock being respected
 * correctly. The race is check-then-act exactly like car rental's, but the "resource" being
 * checked (an attendee's calendar) isn't owned by either lock a per-room scheme would take.
 *
 * <p>The fix is the same one used whenever a critical section's true resource can't be captured
 * by any single fine-grained key: serialise on one lock covering the whole check-and-book
 * operation. This trades throughput (only one booking can be validated at a time, module-wide)
 * for actual correctness across both dimensions — the right tradeoff for a scheduler, where
 * booking volume is nowhere near contended enough for that to matter, and a double-booked
 * conference room is a real, visible failure.
 */
@org.springframework.stereotype.Component
public class ConflictDetectionService {

    private final MeetingSchedulerRepository repository;
    // Fair so concurrent requesters are served in arrival order, matching ReservationLockService.
    private final ReentrantLock lock = new ReentrantLock(true);

    public ConflictDetectionService(MeetingSchedulerRepository repository) {
        this.repository = repository;
    }

    /**
     * Atomically create a meeting in {@code roomId} over [{@code start}, {@code end}) if — and
     * only if — the room exists, has no overlapping non-cancelled meeting, and neither the
     * organizer nor any attendee has an overlapping non-cancelled meeting anywhere else either.
     *
     * @throws RoomNotFoundException     no such room
     * @throws RoomConflictException     the room already has an overlapping meeting
     * @throws AttendeeConflictException the organizer or an attendee already has an overlapping
     *                                    meeting, in any room
     */
    public Meeting book(String roomId, String organizerId, List<String> attendeeIds, String title,
                        LocalDateTime start, LocalDateTime end) {
        lock.lock();
        try {
            // Re-read everything INSIDE the lock: reads taken before acquiring it are stale by
            // the time this method acts on them.
            MeetingRoom room = repository.getRoom(roomId);
            if (room == null) {
                throw new RoomNotFoundException("Room not found: " + roomId);
            }

            for (Meeting existing : repository.getMeetingsForRoom(roomId)) {
                if (existing.getStatus().blocksCalendar() && overlaps(start, end, existing.getStart(), existing.getEnd())) {
                    throw new RoomConflictException(
                            "Room " + roomId + " is already booked from " + existing.getStart()
                                    + " to " + existing.getEnd() + " (\"" + existing.getTitle() + "\")");
                }
            }

            Meeting candidate = Meeting.builder()
                    .organizerId(organizerId).attendeeIds(attendeeIds).start(start).end(end).build();
            for (String personId : candidate.allParticipants()) {
                for (Meeting existing : repository.getMeetingsForAttendee(personId)) {
                    if (existing.getStatus().blocksCalendar() && overlaps(start, end, existing.getStart(), existing.getEnd())) {
                        throw new AttendeeConflictException(
                                personId + " already has a conflicting meeting from " + existing.getStart()
                                        + " to " + existing.getEnd() + " (\"" + existing.getTitle() + "\")");
                    }
                }
            }

            Meeting meeting = Meeting.builder()
                    .id(repository.generateMeetingId())
                    .roomId(roomId)
                    .organizerId(organizerId)
                    .attendeeIds(attendeeIds)
                    .title(title)
                    .start(start)
                    .end(end)
                    .status(MeetingStatus.SCHEDULED)
                    .createdAt(LocalDateTime.now())
                    .build();
            repository.saveMeeting(meeting);
            return meeting;
        } finally {
            lock.unlock();
        }
    }

    /** Cancels a meeting, freeing its room and every participant's calendar for that slot. */
    public Meeting cancel(String meetingId) {
        lock.lock();
        try {
            Meeting meeting = repository.getMeeting(meetingId);
            if (meeting == null) {
                throw new MeetingNotFoundException("Meeting not found: " + meetingId);
            }
            meeting.setStatus(MeetingStatus.CANCELLED);
            repository.updateMeeting(meeting);
            return meeting;
        } finally {
            lock.unlock();
        }
    }

    /** Half-open interval overlap: [s1,e1) intersects [s2,e2). Back-to-back meetings (one ending
     *  exactly when the other starts) do not overlap. */
    private boolean overlaps(LocalDateTime s1, LocalDateTime e1, LocalDateTime s2, LocalDateTime e2) {
        return s1.isBefore(e2) && s2.isBefore(e1);
    }
}
