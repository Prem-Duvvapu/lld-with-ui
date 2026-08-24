package com.lld.courseregistration.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collections;
import java.util.Set;

/**
 * A recurring weekly meeting time. {@link #conflictsWith(TimeSlot)} is the schedule-conflict
 * primitive the whole module's "no overlapping enrollments" requirement is built on: two slots
 * conflict only if they share at least one day AND their [start, end) time ranges overlap on
 * that day — sharing a day with disjoint times (e.g. 9-10am and 2-3pm) is not a conflict.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSlot {
    private Set<DayOfWeek> days;
    private LocalTime startTime;
    private LocalTime endTime;
    private String room;

    public boolean conflictsWith(TimeSlot other) {
        if (other == null) return false;
        Set<DayOfWeek> mine = days == null ? Collections.emptySet() : days;
        Set<DayOfWeek> theirs = other.days == null ? Collections.emptySet() : other.days;
        boolean sharesDay = mine.stream().anyMatch(theirs::contains);
        if (!sharesDay) return false;
        // Half-open interval overlap: [s1,e1) intersects [s2,e2).
        return startTime.isBefore(other.endTime) && other.startTime.isBefore(endTime);
    }

    @Override
    public String toString() {
        Set<DayOfWeek> d = days == null ? Collections.emptySet() : days;
        return d + " " + startTime + "-" + endTime + " @ " + room;
    }
}
