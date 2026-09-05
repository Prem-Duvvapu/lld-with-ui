package com.lld.uber.service;

import com.lld.uber.exception.DriverNotFoundException;
import com.lld.uber.exception.DriverUnavailableException;
import com.lld.uber.model.Driver;
import com.lld.uber.model.DriverStatus;
import com.lld.uber.model.Ride;
import com.lld.uber.model.RideStatus;
import com.lld.uber.repository.UberRepository;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises driver assignment so one driver cannot be handed two rides, and one ride cannot
 * be handed two drivers.
 *
 * <p>The original implementation was a textbook check-then-act race guarded by only a
 * per-driver lock:
 *
 * <pre>
 *   if (!driver.isAvailable()) throw ...;   // check
 *   driver.setStatus(ON_TRIP);              // act
 * </pre>
 *
 * <p>Two riders accepting the same driver could both pass the check before either wrote,
 * and both rides ended up ACCEPTED with the same driver — closed by re-checking availability
 * inside a per-driver lock.
 *
 * <p><b>RCA-052:</b> that per-driver lock alone left a second, distinct race open: two
 * <em>different</em> drivers accepting the <em>same</em> ride acquire two different driver
 * locks, so {@code ride.getDriverId() != null} (the "is this ride already taken" check) was
 * never actually guarded for that scenario — only luck (a race window a few nanoseconds wide)
 * kept {@code oneRideManyDrivers_bindsToOneDriver} passing before it was ever repeated across
 * many rounds. A per-ride lock now covers that check-and-set too.
 *
 * <p>Lock ordering: a call may hold both a ride lock and a driver lock at once, so a fixed
 * order is required to rule out deadlock. Always acquire the <b>ride</b> lock first, then the
 * <b>driver</b> lock — never the reverse, and never hold two ride locks or two driver locks
 * at the same time.
 */
@Component
public class DriverAssignmentService {

    private final UberRepository repository;
    private final Map<String, ReentrantLock> driverLocks = new ConcurrentHashMap<>();
    private final Map<String, ReentrantLock> rideLocks = new ConcurrentHashMap<>();

    public DriverAssignmentService(UberRepository repository) {
        this.repository = repository;
    }

    private ReentrantLock lockFor(String driverId) {
        // Fair locks so a driver besieged by requests still serves them in arrival order.
        return driverLocks.computeIfAbsent(driverId, k -> new ReentrantLock(true));
    }

    private ReentrantLock rideLockFor(String rideId) {
        return rideLocks.computeIfAbsent(rideId, k -> new ReentrantLock(true));
    }

    /**
     * Atomically claim {@code driverId} for {@code ride}.
     *
     * @throws DriverNotFoundException    no such driver
     * @throws DriverUnavailableException the driver was taken first, or is offline
     */
    public Driver assign(Ride ride, String driverId) {
        Driver driver = repository.getDriver(driverId);
        if (driver == null) {
            throw new DriverNotFoundException("Driver not found: " + driverId);
        }

        // Ride lock first, then driver lock — see the class javadoc on lock ordering.
        ReentrantLock rideLock = rideLockFor(ride.getId());
        rideLock.lock();
        try {
            ReentrantLock lock = lockFor(driverId);
            lock.lock();
            try {
                // Re-read and re-check INSIDE the lock: this is the line the race was missing.
                Driver current = repository.getDriver(driverId);
                if (current == null) {
                    throw new DriverNotFoundException("Driver not found: " + driverId);
                }
                if (current.getStatus() != DriverStatus.AVAILABLE) {
                    throw new DriverUnavailableException(
                            "Driver " + driverId + " is no longer available (" + current.getStatus() + ")");
                }
                if (ride.getDriverId() != null) {
                    throw new DriverUnavailableException(
                            "Ride " + ride.getId() + " already has driver " + ride.getDriverId());
                }

                current.setStatus(DriverStatus.ON_TRIP);
                ride.setDriverId(current.getId());
                ride.setDriver(current);
                ride.setDriverName(current.getName());
                ride.setVehicleNumber(current.getVehicleNumber());
                ride.setStatus(RideStatus.ACCEPTED);

                repository.updateDriver(current);
                repository.updateRide(ride);
                return current;
            } finally {
                lock.unlock();
            }
        } finally {
            rideLock.unlock();
        }
    }

    /** Return a driver to the pool once their ride ends, under the same lock. */
    public void release(String driverId, com.lld.uber.model.Location droppedAt) {
        if (driverId == null) {
            return;
        }
        ReentrantLock lock = lockFor(driverId);
        lock.lock();
        try {
            Driver driver = repository.getDriver(driverId);
            if (driver == null) {
                return;
            }
            if (droppedAt != null) {
                driver.setCurrentLocation(droppedAt);
            }
            driver.setStatus(DriverStatus.AVAILABLE);
            repository.updateDriver(driver);
        } finally {
            lock.unlock();
        }
    }
}
