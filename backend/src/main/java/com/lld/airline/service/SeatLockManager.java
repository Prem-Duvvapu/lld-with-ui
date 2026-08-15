package com.lld.airline.service;

import com.lld.airline.enums.SeatStatus;
import com.lld.airline.exception.HoldExpiredException;
import com.lld.airline.exception.SeatNotAvailableException;
import com.lld.airline.model.Flight;
import com.lld.airline.model.Seat;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Component("airlineSeatLockManager")
public class SeatLockManager {

    private final Map<String, ReentrantLock> seatLocks = new ConcurrentHashMap<>();

    private ReentrantLock getLockForSeat(String flightId, String seatNumber) {
        return seatLocks.computeIfAbsent(flightId + ":" + seatNumber, k -> new ReentrantLock(true));
    }

    public List<ReentrantLock> lockSeatsInOrder(String flightId, List<String> seatNumbers) {
        if (seatNumbers == null || seatNumbers.isEmpty()) return Collections.emptyList();

        List<String> sortedSeats = seatNumbers.stream().distinct().sorted().toList();
        List<ReentrantLock> acquiredLocks = new ArrayList<>();

        try {
            for (String seatNumber : sortedSeats) {
                ReentrantLock lock = getLockForSeat(flightId, seatNumber);
                lock.lock();
                acquiredLocks.add(lock);
            }
            return acquiredLocks;
        } catch (Exception e) {
            unlockSeats(acquiredLocks);
            throw e;
        }
    }

    public void unlockSeats(List<ReentrantLock> locks) {
        if (locks == null) return;
        for (int i = locks.size() - 1; i >= 0; i--) {
            try {
                locks.get(i).unlock();
            } catch (Exception ignored) {
            }
        }
    }

    public void holdSeats(String flightId, List<String> seatNumbers, String userId, long holdDurationMs, Flight flight) {
        List<ReentrantLock> locks = lockSeatsInOrder(flightId, seatNumbers);
        long now = System.currentTimeMillis();
        List<Seat> successfullyHeld = new ArrayList<>();

        try {
            for (String seatNum : seatNumbers) {
                Seat seat = flight.getSeat(seatNum);
                if (seat == null) {
                    throw new SeatNotAvailableException("Seat " + seatNum + " does not exist on flight " + flightId);
                }

                if (!seat.isAvailable(now)) {
                    throw new SeatNotAvailableException("Seat " + seatNum + " is already occupied or held by another passenger.");
                }
            }

            // All seats available -> apply holds atomically
            long expiresAt = now + holdDurationMs;
            for (String seatNum : seatNumbers) {
                Seat seat = flight.getSeat(seatNum);
                seat.setStatus(SeatStatus.HELD);
                seat.setHeldByUserId(userId);
                seat.setHoldExpiresAt(expiresAt);
                seat.setVersion(seat.getVersion() + 1);
                successfullyHeld.add(seat);
            }
        } catch (Exception e) {
            // Roll back any previously held seats in this batch
            for (Seat seat : successfullyHeld) {
                seat.setStatus(SeatStatus.AVAILABLE);
                seat.setHeldByUserId(null);
                seat.setHoldExpiresAt(0L);
            }
            throw e;
        } finally {
            unlockSeats(locks);
        }
    }

    public void confirmSeats(String flightId, List<String> seatNumbers, String userId, Flight flight) {
        List<ReentrantLock> locks = lockSeatsInOrder(flightId, seatNumbers);
        long now = System.currentTimeMillis();

        try {
            for (String seatNum : seatNumbers) {
                Seat seat = flight.getSeat(seatNum);
                if (seat == null) {
                    throw new SeatNotAvailableException("Seat " + seatNum + " not found.");
                }

                // Re-validate hold ownership and non-expired TTL
                if (seat.getStatus() != SeatStatus.HELD || !userId.equals(seat.getHeldByUserId()) || now > seat.getHoldExpiresAt()) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    throw new HoldExpiredException("Seat hold for " + seatNum + " has expired. Please reselect your seats.");
                }
            }

            // Confirm booking
            for (String seatNum : seatNumbers) {
                Seat seat = flight.getSeat(seatNum);
                seat.setStatus(SeatStatus.BOOKED);
                seat.setHeldByUserId(userId);
                seat.setHoldExpiresAt(0L);
                seat.setVersion(seat.getVersion() + 1);
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void releaseSeats(String flightId, List<String> seatNumbers, Flight flight) {
        List<ReentrantLock> locks = lockSeatsInOrder(flightId, seatNumbers);
        try {
            for (String seatNum : seatNumbers) {
                Seat seat = flight.getSeat(seatNum);
                if (seat != null) {
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seat.setHeldByUserId(null);
                    seat.setHoldExpiresAt(0L);
                    seat.setVersion(seat.getVersion() + 1);
                }
            }
        } finally {
            unlockSeats(locks);
        }
    }

    public void expireStaleHolds(Flight flight) {
        if (flight == null) return;
        long now = System.currentTimeMillis();

        for (Seat seat : flight.getAllSeats()) {
            if (seat.getStatus() == SeatStatus.HELD && now > seat.getHoldExpiresAt()) {
                ReentrantLock lock = getLockForSeat(flight.getFlightId(), seat.getSeatNumber());
                if (lock.tryLock()) {
                    try {
                        if (seat.getStatus() == SeatStatus.HELD && now > seat.getHoldExpiresAt()) {
                            seat.setStatus(SeatStatus.AVAILABLE);
                            seat.setHeldByUserId(null);
                            seat.setHoldExpiresAt(0L);
                        }
                    } finally {
                        lock.unlock();
                    }
                }
            }
        }
    }
}
