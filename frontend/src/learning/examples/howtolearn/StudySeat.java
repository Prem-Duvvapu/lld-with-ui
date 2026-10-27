package com.lld.learning.examples.howtolearn;

/** A single seat used by one caller at a time, with no persistence or authentication. */
public class StudySeat {
    private final String seatId;
    private String reservedBy; // null means there is no reservation.

    public StudySeat(String seatId) {
        this.seatId = requireText(seatId, "Seat ID");
    }

    public String getSeatId() {
        return seatId;
    }

    public String getReservedBy() {
        return reservedBy;
    }

    public boolean isReserved() {
        return reservedBy != null;
    }

    public void reserve(String learnerId) {
        String requester = requireText(learnerId, "Learner ID");
        if (isReserved()) {
            throw new IllegalStateException("Seat is already reserved");
        }
        reservedBy = requester;
    }

    public void cancel(String learnerId) {
        String requester = requireText(learnerId, "Learner ID");
        if (!isReserved()) {
            throw new IllegalStateException("Seat is not reserved");
        }
        if (!reservedBy.equals(requester)) {
            throw new IllegalStateException("Only the reserving learner may cancel");
        }
        reservedBy = null;
    }

    private static String requireText(String value, String label) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(label + " is required");
        }
        return value.trim();
    }
}
