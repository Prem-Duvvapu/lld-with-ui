package com.lld.meetingscheduler.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A bookable physical room. Deliberately carries no lock of its own — unlike
 * {@code carrental.model.Vehicle}, conflict-checking here spans rooms (an attendee can be double
 * booked across two different rooms), so a single room-scoped lock cannot make booking safe by
 * itself. See {@link com.lld.meetingscheduler.service.ConflictDetectionService} for the actual
 * (single, module-wide) lock this module uses instead.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingRoom {
    private String id;
    private String name;
    private int capacity;
    private String location;
}
