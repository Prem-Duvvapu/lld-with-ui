package com.lld.learning.examples.activity;

/** One room R1, capacity four, one fixed slot. Sequential calls only. */
public final class RoomBookingService {
    private BookingRequest booking;

    public BookingResult request(BookingRequest request) {
        boolean valid = isValid(request);
        BookingResult result;
        if (!valid) {
            result = new BookingResult("REJECTED_INVALID", "Use R1 with 1..4 attendees");
        } else {
            boolean available = available();
            if (available) {
                booking = request;
                result = new BookingResult("CONFIRMED", "Room reserved");
            } else {
                result = new BookingResult("REJECTED_UNAVAILABLE", "Slot already booked");
            }
        }
        // Alternative branches converge here; no waiting for other branches.
        return result;
    }

    private boolean isValid(BookingRequest request) {
        return request != null && "R1".equals(request.roomId())
                && request.attendees() >= 1 && request.attendees() <= 4;
    }

    public boolean available() { return booking == null; }
    public BookingRequest booking() { return booking; }
}
