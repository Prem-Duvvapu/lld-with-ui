package com.lld.learning.examples.statemachine;

/** One sequential domain lifecycle, with caller-supplied logical minutes. */
public final class Reservation {
    public static final long HOLD_MINUTES = 10;
    private ReservationState state = ReservationState.DRAFT;
    private Long expiresAtMinute;
    private long lastMinute;
    private int heldEntries;
    private int heldExits;
    private int inspections;

    public Reservation() { }

    public void hold(long now) {
        requireLiveTime(now);
        requireState(ReservationState.DRAFT);
        long deadline = Math.addExact(now, HOLD_MINUTES); // Validate before mutation.
        expiresAtMinute = deadline;
        lastMinute = now;
        state = ReservationState.HELD;
        enterHeld();
    }

    /** External self-transition: exit HELD, renew the deadline, re-enter HELD. */
    public void renew(long now) {
        requireUnexpiredHeld(now);
        long deadline = Math.addExact(now, HOLD_MINUTES);
        exitHeld();
        expiresAtMinute = deadline;
        lastMinute = now;
        enterHeld();
    }

    /** Internal transition: an effect without leaving or re-entering HELD. */
    public void inspect(long now) {
        requireUnexpiredHeld(now);
        inspections++;
        lastMinute = now;
    }

    public void confirm(long now) {
        requireUnexpiredHeld(now);
        exitHeld();
        lastMinute = now;
        state = ReservationState.CONFIRMED;
    }

    /** An explicit command, NOT an automatically scheduled UML time event. */
    public void expire(long now) {
        requireLiveTime(now);
        requireState(ReservationState.HELD);
        if (now < expiresAtMinute) throw new IllegalStateException("Hold not expired");
        exitHeld();
        lastMinute = now;
        state = ReservationState.CANCELLED;
    }

    public void cancel(long now) {
        requireLiveTime(now);
        if (state == ReservationState.HELD) exitHeld();
        lastMinute = now;
        state = ReservationState.CANCELLED;
    }

    private void requireLiveTime(long now) {
        if (isTerminated()) throw new IllegalStateException("Lifecycle terminated");
        if (now < 0 || now < lastMinute) {
            throw new IllegalArgumentException("Logical minutes must be nonnegative and nondecreasing");
        }
    }

    private void requireState(ReservationState expected) {
        if (state != expected) throw new IllegalStateException("Expected " + expected + ", was " + state);
    }

    private void requireUnexpiredHeld(long now) {
        requireLiveTime(now);
        requireState(ReservationState.HELD);
        if (now >= expiresAtMinute) throw new IllegalStateException("Hold expired");
    }

    private void enterHeld() { heldEntries++; }
    private void exitHeld() { heldExits++; }

    public ReservationState state() { return state; }
    public Long expiresAtMinute() { return expiresAtMinute; }
    public long lastMinute() { return lastMinute; }
    public int heldEntries() { return heldEntries; }
    public int heldExits() { return heldExits; }
    public int inspections() { return inspections; }
    public boolean isTerminated() { return state.isTerminal(); }
}
