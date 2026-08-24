package com.lld.concertticket.service;

import com.lld.concertticket.enums.SeatStatus;
import com.lld.concertticket.exception.BookingFailedException;
import com.lld.concertticket.exception.HoldExpiredException;
import com.lld.concertticket.exception.SeatNotAvailableException;
import com.lld.concertticket.model.Seat;
import com.lld.concertticket.repository.ConcertTicketRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Per-seat lock + TTL hold, adapted from {@code movieticket.service.SeatLockManager}
 * (itself the same pattern as {@code airline.service.SeatLockManager}): a
 * {@code ReentrantLock} per {@code "eventId:seatId"}, acquired in ascending seat-id
 * order for a multi-seat request so two overlapping bookings can never deadlock on each
 * other's locks.
 *
 * <p>The race this closes: two customers both call {@code holdSeats} for the last
 * available seat. Without a lock, both could read status == AVAILABLE before either
 * writes HELD, and both would "win". Here, only one thread ever holds the seat's lock at
 * a time, and — critically — availability is <b>re-read from the repository inside the
 * lock</b>, not trusted from a value read before locking. The second thread to acquire
 * the lock sees the first thread's write and is correctly rejected with
 * {@link SeatNotAvailableException}. This is the identical idiom to
 * {@code DriverAssignmentService}/{@code DeliveryAssignmentService}'s
 * check-then-act fix.
 *
 * <p>A HELD seat whose {@code holdExpiresAt} has passed is treated as available for a
 * new hold — expiry is a read-time check, not something a background thread must race
 * to clear first. {@link #expireStaleHolds} is the belt-and-braces sweep that actually
 * flips such seats back to AVAILABLE so listings reflect it without a customer having to
 * attempt a hold first.
 */
@Component
public class SeatLockManager {
    private final Map<String, ReentrantLock> seatLocks = new ConcurrentHashMap<>();

    private ReentrantLock getLockForSeat(long eventId, String seatId) {
        String key = eventId + ":" + seatId;
        return seatLocks.computeIfAbsent(key, k -> new ReentrantLock(true)); // fair lock
    }

    private List<ReentrantLock> lockSeatsInOrder(long eventId, List<String> seatIds) {
        List<String> sortedIds = seatIds.stream().distinct().sorted().toList();
        List<ReentrantLock> acquired = new ArrayList<>();
        try {
            for (String seatId : sortedIds) {
                ReentrantLock lock = getLockForSeat(eventId, seatId);
                lock.lock();
                acquired.add(lock);
            }
            return acquired;
        } catch (Exception e) {
            unlockSeats(acquired);
            throw e;
        }
    }

    private void unlockSeats(List<ReentrantLock> locks) {
        for (int i = locks.size() - 1; i >= 0; i--) {
            try {
                locks.get(i).unlock();
            } catch (Exception ignored) {
            }
        }
    }

    /**
     * Holds every requested seat for {@code holdDurationMs}, or holds none of them.
     * Validation and mutation are two separate passes over the already-locked seats:
     * if any seat in the batch is unavailable, the whole batch is rejected before any
     * seat is written, so a partial multi-seat hold can never happen.
     */
    public void holdSeats(long eventId, List<String> seatIds, String userId, long holdDurationMs,
                           ConcertTicketRepository repository) {
        List<ReentrantLock> locks = lockSeatsInOrder(eventId, seatIds);
        long now = System.currentTimeMillis();
        try {
            for (String seatId : seatIds) {
                Seat seat = repository.findSeatById(eventId, seatId);
                if (seat == null) {
                    throw new SeatNotAvailableException("Seat " + seatId + " does not exist for event " + eventId, seatId);
                }
                boolean expiredHold = seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() <= now;
                boolean available = seat.getStatus() == SeatStatus.AVAILABLE || expiredHold;
                if (!available) {
                    String holder = seat.getHeldByUserId() != null ? seat.getHeldByUserId() : "another customer";
                    throw new SeatNotAvailableException("Seat " + seatId + " is already " +
                            seat.getStatus() + (seat.getStatus() == SeatStatus.HELD ? " by " + holder : "."), seatId);
                }
            }

            long expiresAt = now + holdDurationMs;
            for (String seatId : seatIds) {
                Seat seat = repository.findSeatById(eventId, seatId);
                seat.setStatus(SeatStatus.HELD);
                seat.setHeldByUserId(userId);
                seat.setHoldExpiresAt(expiresAt);
                seat.setVersion(seat.getVersion() + 1);
                repository.updateSeat(seat);
            }
        } finally {
            unlockSeats(locks);
        }
    }

    /** Transitions a held-by-this-user, non-expired batch of seats to BOOKED. */
    public void confirmSeats(long eventId, List<String> seatIds, String userId, ConcertTicketRepository repository) {
        List<ReentrantLock> locks = lockSeatsInOrder(eventId, seatIds);
        long now = System.currentTimeMillis();
        try {
            for (String seatId : seatIds) {
                Seat seat = repository.findSeatById(eventId, seatId);
                if (seat == null) {
                    throw new BookingFailedException("Seat " + seatId + " not found for event " + eventId);
                }
                if (seat.getStatus() != SeatStatus.HELD || !userId.equalsIgnoreCase(seat.getHeldByUserId())) {
                    throw new BookingFailedException("Seat " + seatId + " is not held by " + userId);
                }
                if (seat.getHoldExpiresAt() <= now) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    repository.updateSeat(seat);
                    throw new HoldExpiredException("Hold on seat " + seatId + " expired. Please reselect your seats.");
                }
            }

            for (String seatId : seatIds) {
                Seat seat = repository.findSeatById(eventId, seatId);
                seat.setStatus(SeatStatus.BOOKED);
                seat.setHeldByUserId(null);
                seat.setHoldExpiresAt(0L);
                seat.setVersion(seat.getVersion() + 1);
                repository.updateSeat(seat);
            }
        } finally {
            unlockSeats(locks);
        }
    }

    /** Releases a batch of seats (held or booked) back to AVAILABLE — cancellation or payment failure. */
    public void releaseSeats(long eventId, List<String> seatIds, ConcertTicketRepository repository) {
        List<ReentrantLock> locks = lockSeatsInOrder(eventId, seatIds);
        try {
            for (String seatId : seatIds) {
                Seat seat = repository.findSeatById(eventId, seatId);
                if (seat != null) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    seat.setVersion(seat.getVersion() + 1);
                    repository.updateSeat(seat);
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    /**
     * Reaper: scans every seat of an event and flips any HELD seat whose TTL has passed
     * back to AVAILABLE. Uses {@code tryLock} rather than blocking {@code lock} — a
     * sweep that can't get a seat's lock right now will simply catch it on the next
     * pass, since a lock held elsewhere means that seat is mid-mutation anyway (about to
     * be confirmed or released) and doesn't need reaping.
     */
    public void expireStaleHolds(long eventId, ConcertTicketRepository repository) {
        long now = System.currentTimeMillis();
        for (Seat seat : repository.getSeatsByEvent(eventId)) {
            if (seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() > 0 && seat.getHoldExpiresAt() <= now) {
                ReentrantLock lock = getLockForSeat(eventId, seat.getId());
                if (lock.tryLock()) {
                    try {
                        Seat fresh = repository.findSeatById(eventId, seat.getId());
                        if (fresh != null && fresh.getStatus() == SeatStatus.HELD && fresh.getHoldExpiresAt() <= now) {
                            fresh.setStatus(SeatStatus.AVAILABLE);
                            fresh.setHeldByUserId(null);
                            fresh.setHoldExpiresAt(0L);
                            fresh.setVersion(fresh.getVersion() + 1);
                            repository.updateSeat(fresh);
                        }
                    } finally {
                        lock.unlock();
                    }
                }
            }
        }
    }
}
