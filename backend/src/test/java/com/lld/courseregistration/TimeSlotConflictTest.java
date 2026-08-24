package com.lld.courseregistration;

import com.lld.courseregistration.model.TimeSlot;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for {@link TimeSlot#conflictsWith(TimeSlot)} — the pure schedule-conflict-detection
 * primitive the whole "no overlapping enrollments" requirement is built on. No repository, no
 * service, no locking: just the interval/day-set arithmetic.
 */
@DisplayName("TimeSlot — Schedule Conflict Detection")
class TimeSlotConflictTest {

    private TimeSlot slot(LocalTime start, LocalTime end, DayOfWeek... days) {
        return TimeSlot.builder().days(EnumSet.copyOf(java.util.List.of(days)))
                .startTime(start).endTime(end).room("R1").build();
    }

    @Test
    @DisplayName("Identical day and identical time range conflicts")
    void identicalSlotsConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        TimeSlot b = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        assertTrue(a.conflictsWith(b));
        assertTrue(b.conflictsWith(a), "conflict must be symmetric");
    }

    @Test
    @DisplayName("Same day, partially overlapping times conflicts")
    void partialOverlapConflicts() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        TimeSlot b = slot(LocalTime.of(9, 30), LocalTime.of(10, 30), DayOfWeek.MONDAY);
        assertTrue(a.conflictsWith(b));
    }

    @Test
    @DisplayName("Same day, back-to-back times (end == start) do NOT conflict — half-open interval")
    void backToBackDoesNotConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        TimeSlot b = slot(LocalTime.of(10, 0), LocalTime.of(11, 0), DayOfWeek.MONDAY);
        assertFalse(a.conflictsWith(b));
    }

    @Test
    @DisplayName("Same day, disjoint times do NOT conflict")
    void disjointTimesDoNotConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        TimeSlot b = slot(LocalTime.of(14, 0), LocalTime.of(15, 0), DayOfWeek.MONDAY);
        assertFalse(a.conflictsWith(b));
    }

    @Test
    @DisplayName("Overlapping times on entirely different days do NOT conflict")
    void differentDaysDoNotConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        TimeSlot b = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.TUESDAY);
        assertFalse(a.conflictsWith(b));
    }

    @Test
    @DisplayName("Multi-day slots conflict if ANY shared day has overlapping times")
    void multiDaySlotConflictsIfAnySharedDayOverlaps() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY);
        TimeSlot b = slot(LocalTime.of(9, 30), LocalTime.of(10, 30), DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        assertTrue(a.conflictsWith(b), "shares Wednesday with overlapping times");
    }

    @Test
    @DisplayName("Multi-day slots with overlapping times but no shared day do NOT conflict")
    void multiDayNoSharedDayDoesNotConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY);
        TimeSlot b = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.TUESDAY, DayOfWeek.THURSDAY);
        assertFalse(a.conflictsWith(b));
    }

    @Test
    @DisplayName("One slot fully containing another's time range on a shared day conflicts")
    void containedIntervalConflicts() {
        TimeSlot outer = slot(LocalTime.of(8, 0), LocalTime.of(12, 0), DayOfWeek.MONDAY);
        TimeSlot inner = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        assertTrue(outer.conflictsWith(inner));
        assertTrue(inner.conflictsWith(outer));
    }

    @Test
    @DisplayName("conflictsWith(null) is false, not an NPE")
    void nullOtherIsNotAConflict() {
        TimeSlot a = slot(LocalTime.of(9, 0), LocalTime.of(10, 0), DayOfWeek.MONDAY);
        assertFalse(a.conflictsWith(null));
    }
}
