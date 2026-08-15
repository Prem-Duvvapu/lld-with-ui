package com.lld.movieticket.service;

import com.lld.movieticket.exception.BookingFailedException;
import com.lld.movieticket.exception.HoldExpiredException;
import com.lld.movieticket.exception.SeatNotAvailableException;
import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.SeatStatus;
import com.lld.movieticket.observer.SeatMapNotifier;
import com.lld.movieticket.repository.MovieTicketRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Component("movieTicketSeatLockManager")
public class SeatLockManager {
    private final Map<String, ReentrantLock> seatLocks = new ConcurrentHashMap<>();

    private ReentrantLock getLockForSeat(long showId, long seatId) {
        String key = showId + ":" + seatId;
        return seatLocks.computeIfAbsent(key, k -> new ReentrantLock(true)); // fair lock
    }

    private List<ReentrantLock> lockSeatsInOrder(long showId, List<Long> seatIds) {
        List<Long> sortedIds = seatIds.stream().distinct().sorted().toList();
        List<ReentrantLock> acquiredLocks = new ArrayList<>();
        try {
            for (Long seatId : sortedIds) {
                ReentrantLock lock = getLockForSeat(showId, seatId);
                lock.lock();
                acquiredLocks.add(lock);
            }
            return acquiredLocks;
        } catch (Exception e) {
            unlockSeats(acquiredLocks);
            throw e;
        }
    }

    private void unlockSeats(List<ReentrantLock> locks) {
        for (int i = locks.size() - 1; i >= 0; i--) {
            try {
                locks.get(i).unlock();
            } catch (Exception ignored) {}
        }
    }

    public void holdSeats(long showId, List<Long> seatIds, String userId, long holdDurationMs, MovieTicketRepository repository, SeatMapNotifier notifier) {
        List<ReentrantLock> locks = lockSeatsInOrder(showId, seatIds);
        long now = System.currentTimeMillis();
        try {
            // Step 1: Validate all seats are available (or hold has expired)
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                if (seat == null) {
                    throw new SeatNotAvailableException("Seat " + seatId + " not found for show " + showId, seatId);
                }
                boolean isExpiredHold = (seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() <= now);
                boolean isAvailable = seat.getStatus() == SeatStatus.AVAILABLE || isExpiredHold;
                if (!isAvailable) {
                    String holder = seat.getHeldByUserId() != null ? seat.getHeldByUserId() : "another user";
                    throw new SeatNotAvailableException("Seat " + seatId + " is currently held by " + holder, seatId);
                }
            }

            // Step 2: All seats are available -> transition all to HELD
            long expiresAt = now + holdDurationMs;
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                SeatStatus oldStatus = seat.getStatus();
                seat.setStatus(SeatStatus.HELD);
                seat.setHeldByUserId(userId);
                seat.setHoldExpiresAt(expiresAt);
                seat.setVersion(seat.getVersion() + 1);
                repository.updateSeat(seat);
                if (notifier != null) {
                    notifier.notifyStatusChange(showId, seat, oldStatus, SeatStatus.HELD, userId);
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void confirmSeats(long showId, List<Long> seatIds, String userId, MovieTicketRepository repository, SeatMapNotifier notifier) {
        List<ReentrantLock> locks = lockSeatsInOrder(showId, seatIds);
        long now = System.currentTimeMillis();
        try {
            // Step 1: Validate all seats are HELD by this user and NOT expired
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                if (seat == null) {
                    throw new BookingFailedException("Seat " + seatId + " not found");
                }
                if (seat.getStatus() != SeatStatus.HELD || !userId.equalsIgnoreCase(seat.getHeldByUserId())) {
                    throw new BookingFailedException("Seat " + seatId + " is not held by user " + userId);
                }
                if (seat.getHoldExpiresAt() <= now) {
                    // Stale hold expired
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    repository.updateSeat(seat);
                    throw new HoldExpiredException("Your seat hold for seat " + seatId + " has expired. Please re-select seats.");
                }
            }

            // Step 2: All valid -> transition to BOOKED
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                SeatStatus oldStatus = seat.getStatus();
                seat.setStatus(SeatStatus.BOOKED);
                seat.setHeldByUserId(null);
                seat.setHoldExpiresAt(0L);
                seat.setVersion(seat.getVersion() + 1);
                repository.updateSeat(seat);
                if (notifier != null) {
                    notifier.notifyStatusChange(showId, seat, oldStatus, SeatStatus.BOOKED, userId);
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void releaseSeats(long showId, List<Long> seatIds, String userId, MovieTicketRepository repository, SeatMapNotifier notifier) {
        List<ReentrantLock> locks = lockSeatsInOrder(showId, seatIds);
        try {
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                if (seat != null) {
                    SeatStatus oldStatus = seat.getStatus();
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    seat.setVersion(seat.getVersion() + 1);
                    repository.updateSeat(seat);
                    if (notifier != null) {
                        notifier.notifyStatusChange(showId, seat, oldStatus, SeatStatus.AVAILABLE, userId);
                    }
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void cancelBookedSeats(long showId, List<Long> seatIds, MovieTicketRepository repository, SeatMapNotifier notifier) {
        List<ReentrantLock> locks = lockSeatsInOrder(showId, seatIds);
        try {
            for (Long seatId : seatIds) {
                Seat seat = repository.findSeatById(showId, seatId);
                if (seat != null) {
                    SeatStatus oldStatus = seat.getStatus();
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    seat.setVersion(seat.getVersion() + 1);
                    repository.updateSeat(seat);
                    if (notifier != null) {
                        notifier.notifyStatusChange(showId, seat, oldStatus, SeatStatus.AVAILABLE, "SYSTEM");
                    }
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void expireStaleHolds(long showId, MovieTicketRepository repository, SeatMapNotifier notifier) {
        List<Seat> seats = repository.getSeatsByShow(showId);
        long now = System.currentTimeMillis();
        for (Seat seat : seats) {
            if (seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() > 0 && seat.getHoldExpiresAt() <= now) {
                ReentrantLock lock = getLockForSeat(showId, seat.getId());
                lock.lock();
                try {
                    if (seat.getStatus() == SeatStatus.HELD && seat.getHoldExpiresAt() <= now) {
                        SeatStatus oldStatus = seat.getStatus();
                        String holder = seat.getHeldByUserId();
                        seat.setStatus(SeatStatus.AVAILABLE);
                        seat.setHeldByUserId(null);
                        seat.setHoldExpiresAt(0L);
                        seat.setVersion(seat.getVersion() + 1);
                        repository.updateSeat(seat);
                        if (notifier != null) {
                            notifier.notifyStatusChange(showId, seat, oldStatus, SeatStatus.AVAILABLE, holder != null ? holder : "SYSTEM_CLEANUP");
                        }
                    }
                } finally {
                    lock.unlock();
                }
            }
        }
    }
}
