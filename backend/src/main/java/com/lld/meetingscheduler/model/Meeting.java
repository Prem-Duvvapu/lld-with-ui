package com.lld.meetingscheduler.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {
    private String id;
    private String roomId;
    private String organizerId;
    private List<String> attendeeIds;
    private String title;
    private LocalDateTime start;
    private LocalDateTime end;
    private MeetingStatus status;
    private LocalDateTime createdAt;

    /** Organizer plus every attendee — the full set of people this meeting occupies the
     *  calendar of. Used by {@link com.lld.meetingscheduler.service.ConflictDetectionService}
     *  to check attendee-level conflicts without treating the organizer as a special case. */
    public List<String> allParticipants() {
        List<String> all = new java.util.ArrayList<>();
        all.add(organizerId);
        if (attendeeIds != null) {
            all.addAll(attendeeIds);
        }
        return all;
    }
}
