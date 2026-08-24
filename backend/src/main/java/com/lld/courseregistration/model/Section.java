package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * One offered instance of a {@link Course} — the "seat pool" of this module. {@code enrolledCount}
 * and {@code waitlist} are mutated ONLY inside {@link com.lld.courseregistration.service.SectionCapacityManager}'s
 * per-section lock; nothing else in the codebase should touch them directly, mirroring how
 * {@code airline.SeatLockManager} owns all writes to {@code Seat.status}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Section {
    private String id;
    private String courseId;
    private String sectionCode;
    private String professorName;
    private int capacity;
    /** Guarded by the section's lock in SectionCapacityManager. Never read/write without it. */
    private int enrolledCount;
    private TimeSlot timeSlot;
    private String semester;
    /** FIFO queue of studentIds waiting for a seat. Guarded by the section's lock. */
    @Builder.Default
    private Deque<String> waitlist = new ArrayDeque<>();

    public boolean hasAvailableSeat() {
        return enrolledCount < capacity;
    }
}
