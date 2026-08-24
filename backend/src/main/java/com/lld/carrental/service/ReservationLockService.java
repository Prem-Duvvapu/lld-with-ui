package com.lld.carrental.service;

import com.lld.carrental.exception.VehicleNotAvailableException;
import com.lld.carrental.exception.VehicleNotFoundException;
import com.lld.carrental.model.Reservation;
import com.lld.carrental.model.Vehicle;
import com.lld.carrental.model.VehicleStatus;
import com.lld.carrental.repository.CarRentalRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises reservation creation per vehicle so two overlapping date ranges can never both be
 * confirmed for the same vehicle.
 *
 * <p>This is a genuinely different lock shape from the simple "one entity, one boolean" pattern
 * used elsewhere in this repo (uber's {@code DriverAssignmentService}, zomato's delivery-agent
 * lock). There the invariant is "is this single flag still free?" — here it is "does the new
 * range overlap <i>any</i> member of a set of existing reservations?", so the critical section
 * has to re-read and re-scan that whole set, not just re-check one field.
 *
 * <p>The race this closes is a textbook check-then-act:
 *
 * <pre>
 *   List&lt;Reservation&gt; existing = repo.getReservationsForVehicle(id);  // check
 *   if (noneOverlap(existing, start, end)) {
 *       repo.saveReservation(newReservation);                          // act
 *   }
 * </pre>
 *
 * <p>Two customers requesting the same (or overlapping) dates can both read {@code existing}
 * before either has written their reservation, both see no overlap, and both get confirmed
 * reservations for the same vehicle on the same days. The read of the reservation set and the
 * write of the new reservation must happen as one atomic unit — that unit is this method, guarded
 * by a per-vehicle lock acquired via {@code computeIfAbsent}, exactly the idiom
 * {@code DriverAssignmentService} uses for drivers.
 *
 * <p>Lock ordering: a single reservation only ever needs one vehicle's lock, so only one lock is
 * ever held at a time here and no ordering rule is required. If a future feature needs to hold two
 * vehicle locks at once (e.g. swapping a customer between two vehicles), acquire them in ascending
 * vehicle-id order to avoid deadlock — do not acquire in caller-supplied order.
 */
@org.springframework.stereotype.Component
public class ReservationLockService {

    private final CarRentalRepository repository;
    private final Map<String, ReentrantLock> vehicleLocks = new ConcurrentHashMap<>();

    public ReservationLockService(CarRentalRepository repository) {
        this.repository = repository;
    }

    private ReentrantLock lockFor(String vehicleId) {
        // Fair locks so a popular vehicle serves concurrent requesters in arrival order.
        return vehicleLocks.computeIfAbsent(vehicleId, k -> new ReentrantLock(true));
    }

    /**
     * Atomically create a reservation for {@code vehicleId} over [{@code start}, {@code end})
     * if — and only if — the vehicle is in the fleet and no existing non-terminal reservation on
     * it overlaps the requested range.
     *
     * @throws VehicleNotFoundException    no such vehicle
     * @throws VehicleNotAvailableException vehicle is MAINTENANCE/RETIRED, or dates overlap
     */
    public Reservation reserve(String vehicleId, String customerId, LocalDate start, LocalDate end,
                                double estimatedCost, String pricingStrategyName) {
        ReentrantLock lock = lockFor(vehicleId);
        lock.lock();
        try {
            // Re-read the vehicle AND its reservation set INSIDE the lock: this is the step a
            // naive implementation misses. Anything read before acquiring the lock is stale by
            // the time we act on it.
            Vehicle vehicle = repository.getVehicle(vehicleId);
            if (vehicle == null) {
                throw new VehicleNotFoundException("Vehicle not found: " + vehicleId);
            }
            if (vehicle.getStatus() == VehicleStatus.MAINTENANCE || vehicle.getStatus() == VehicleStatus.RETIRED) {
                throw new VehicleNotAvailableException(
                        "Vehicle " + vehicleId + " is " + vehicle.getStatus() + " and cannot be reserved");
            }

            List<Reservation> existing = repository.getReservationsForVehicle(vehicleId);
            for (Reservation r : existing) {
                if (!r.getStatus().blocksCalendar()) {
                    continue; // CANCELLED / COMPLETED no longer occupy the calendar
                }
                if (overlaps(start, end, r.getStartDate(), r.getEndDate())) {
                    throw new VehicleNotAvailableException(
                            "Vehicle " + vehicleId + " is already reserved for an overlapping date range ("
                                    + r.getStartDate() + " to " + r.getEndDate() + ")");
                }
            }

            String reservationId = repository.generateReservationId();
            Reservation reservation = Reservation.builder()
                    .id(reservationId)
                    .customerId(customerId)
                    .vehicleId(vehicleId)
                    .branchId(vehicle.getBranchId())
                    .startDate(start)
                    .endDate(end)
                    .status(com.lld.carrental.model.ReservationStatus.PENDING)
                    .estimatedCost(estimatedCost)
                    .pricingStrategyName(pricingStrategyName)
                    .createdAt(java.time.LocalDateTime.now())
                    .build();

            repository.saveReservation(reservation);
            return reservation;
        } finally {
            lock.unlock();
        }
    }

    /** Marks the vehicle physically out under its lock — mirrors reality, does not gate the calendar (see {@link VehicleStatus}). */
    public void markPickedUp(String vehicleId) {
        ReentrantLock lock = lockFor(vehicleId);
        lock.lock();
        try {
            Vehicle vehicle = repository.getVehicle(vehicleId);
            if (vehicle == null) {
                throw new VehicleNotFoundException("Vehicle not found: " + vehicleId);
            }
            vehicle.setStatus(VehicleStatus.RENTED);
            repository.updateVehicle(vehicle);
        } finally {
            lock.unlock();
        }
    }

    /** Marks the vehicle physically back under its lock, updating its odometer. */
    public void markReturned(String vehicleId, int odometerReading) {
        ReentrantLock lock = lockFor(vehicleId);
        lock.lock();
        try {
            Vehicle vehicle = repository.getVehicle(vehicleId);
            if (vehicle == null) {
                throw new VehicleNotFoundException("Vehicle not found: " + vehicleId);
            }
            if (vehicle.getStatus() != VehicleStatus.MAINTENANCE && vehicle.getStatus() != VehicleStatus.RETIRED) {
                vehicle.setStatus(VehicleStatus.AVAILABLE);
            }
            if (odometerReading > vehicle.getOdometer()) {
                vehicle.setOdometer(odometerReading);
            }
            repository.updateVehicle(vehicle);
        } finally {
            lock.unlock();
        }
    }

    /** Half-open interval overlap: [s1,e1) intersects [s2,e2). Same-day return + pickup does not overlap. */
    private boolean overlaps(LocalDate s1, LocalDate e1, LocalDate s2, LocalDate e2) {
        return s1.isBefore(e2) && s2.isBefore(e1);
    }
}
