package com.lld.courseregistration.model;

/**
 * Lifecycle of a {@link Registration}. Registration is synchronous — a student either lands in
 * a seat immediately ({@link #ENROLLED}) or joins the FIFO queue for one ({@link #WAITLISTED});
 * there is no admin approval gate, matching the "reuse the airline/movieticket seat-lock shape"
 * brief this module was built against (immediate hold/confirm, not a submit-then-approve
 * workflow).
 */
public enum RegistrationStatus {
    /** Holds a confirmed seat in the section's capacity count. */
    ENROLLED,
    /** Section was full at registration time; queued FIFO for promotion when a seat frees up. */
    WAITLISTED,
    /** Student voluntarily dropped (from ENROLLED or WAITLISTED). Terminal. */
    DROPPED,
    /** Term finished with the student having attended through to completion. Terminal. */
    COMPLETED
}
