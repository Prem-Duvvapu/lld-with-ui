package com.lld.uber.service;

import com.lld.uber.exception.*;
import com.lld.uber.model.*;
import com.lld.uber.payment.Payment;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.strategy.FarePricingStrategy;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class UberService {

    private final UberRepository repository;
    private final PaymentProcessor paymentProcessor;
    private final FarePricingStrategyFactory pricingFactory;
    private final DriverAssignmentService driverAssignment;

    // ---- /sim/* sandbox: a second, fully isolated set of instances so the demo can never
    // touch a live ride or driver. See simReset() for the seed data. ----
    private static final String SIM_RIDER_ID = "SIM-RIDER";
    private static final String SIM_DRIVER_A = "SIM-D1";
    private static final String SIM_DRIVER_B = "SIM-D2";
    private static final String SIM_DRIVER_C = "SIM-D3";
    private static final double SIM_BROADCAST_RADIUS_KM = 5.0;

    private volatile UberRepository simRepository;
    private volatile DriverAssignmentService simDriverAssignment;
    private volatile String simRideId;
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public UberService(UberRepository repository,
                       PaymentProcessor paymentProcessor,
                       FarePricingStrategyFactory pricingFactory,
                       DriverAssignmentService driverAssignment) {
        this.repository = repository;
        this.paymentProcessor = paymentProcessor;
        this.pricingFactory = pricingFactory;
        this.driverAssignment = driverAssignment;
        simReset();
    }

    /**
     * Single gate for every ride status change. Each caller used to carry its own list of
     * acceptable source states, and nothing stopped a move out of a terminal state.
     */
    private void transition(Ride ride, RideStatus next) {
        RideStatus current = ride.getStatus();
        if (!current.canTransitionTo(next)) {
            throw new InvalidRideTransitionException(
                    "Ride " + ride.getId() + " cannot move from " + current + " to " + next
                            + ". Allowed: " + current.allowedNext());
        }
        ride.setStatus(next);
    }

    public Rider registerRider(Rider rider) {
        if (rider.getId() == null || rider.getId().isEmpty()) {
            rider.setId("RIDER-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        }
        repository.registerRider(rider);
        return rider;
    }

    public Driver registerDriver(Driver driver) {
        if (driver.getId() == null || driver.getId().isEmpty()) {
            driver.setId("DRIVER-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        }
        repository.registerDriver(driver);
        return driver;
    }

    public Driver updateDriverStatus(String driverId, DriverStatus status) {
        Driver driver = repository.getDriver(driverId);
        if (driver == null) throw new DriverNotFoundException("Driver not found: " + driverId);
        driver.setStatus(status);
        repository.updateDriver(driver);
        return driver;
    }

    public List<Driver> getAllDrivers() {
        return repository.getAllDrivers();
    }

    public List<Rider> getAllRiders() {
        return repository.getAllRiders();
    }

    public FareEstimate estimate(String pickupLat, String pickupLng, String pickupLabel,
                                 String dropoffLat, String dropoffLng, String dropoffLabel,
                                 String vehicleTypeStr, boolean surgeActive) {
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);

        double distance = pickup.distanceTo(dropoff);
        FarePricingStrategy pricing = pricingFactory.forDemand(surgeActive);
        double fare = pricing.calculateFare(distance, vehicleType);
        int estimatedMinutes = (int) Math.round(distance * 3.0);

        return new FareEstimate(
                Math.round(distance * 10.0) / 10.0,
                fare,
                estimatedMinutes,
                vehicleType,
                pricing.getName()
        );
    }

    public Ride requestRide(String userId, String pickupLat, String pickupLng, String pickupLabel,
                            String dropoffLat, String dropoffLng, String dropoffLabel,
                            String vehicleTypeStr, Double preCalculatedFare, Double preCalculatedDistanceKm) {
        Location pickup = new Location(Double.parseDouble(pickupLat), Double.parseDouble(pickupLng), pickupLabel);
        Location dropoff = new Location(Double.parseDouble(dropoffLat), Double.parseDouble(dropoffLng), dropoffLabel);
        VehicleType vehicleType = VehicleType.valueOf(vehicleTypeStr.toUpperCase());

        // Use pre-calculated fare and distance from estimate if provided by UI
        double distanceKm = (preCalculatedDistanceKm != null && preCalculatedDistanceKm > 0)
                ? preCalculatedDistanceKm : pickup.distanceTo(dropoff);

        double fare = (preCalculatedFare != null && preCalculatedFare > 0)
                ? preCalculatedFare
                : pricingFactory.forDemand(false).calculateFare(distanceKm, vehicleType);

        String rideId = repository.generateRideId();
        Ride ride = new Ride(rideId, userId, pickup, dropoff, distanceKm, fare, vehicleType);

        Rider rider = repository.getRider(userId);
        if (rider != null) {
            ride.setRider(rider);
            rider.setCurrentLocation(pickup);
        }

        repository.saveRide(ride);
        return ride;
    }

    public List<Ride> getAvailableRideRequestsForDriver(String driverId) {
        return repository.getAvailableRideRequestsForDriver(driverId);
    }

    public Ride acceptRide(String rideId, String driverId) {
        return assignDriver(rideId, driverId);
    }

    public Ride declineRide(String rideId, String driverId) {
        Ride ride = getRide(rideId);
        ride.addDeclinedDriver(driverId);
        repository.updateRide(ride);
        return ride;
    }

    /**
     * Accepting a ride is the one genuinely contended operation here: several drivers may be
     * looking at the same request, and one driver may be offered several. Both races are
     * resolved under a per-driver lock inside DriverAssignmentService.
     */
    public Ride assignDriver(String rideId, String driverId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new InvalidRideTransitionException(
                    "Ride " + rideId + " is " + ride.getStatus() + " and can no longer be accepted");
        }
        driverAssignment.assign(ride, driverId);
        return ride;
    }

    public Ride verifyOtpAndStart(String rideId, String otp) {
        Ride ride = getRide(rideId);
        if (!ride.verifyOtp(otp)) {
            throw new OtpVerificationException("Invalid OTP for ride " + rideId + ". Verification failed.");
        }
        return startTrip(rideId);
    }

    public Ride startTrip(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.ONGOING);
        repository.updateRide(ride);
        return ride;
    }

    public Ride arriveAtDestination(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.DESTINATION_REACHED);
        transition(ride, RideStatus.PAYMENT_PENDING);
        repository.updateRide(ride);
        return ride;
    }

    public Ride completeTrip(String rideId, String paymentMethod) {
        Ride ride = getRide(rideId);
        if (ride.getStatus().isTerminal()) {
            throw new InvalidRideTransitionException(
                    "Ride " + rideId + " is already " + ride.getStatus() + " and cannot be completed");
        }
        // Payment is only attempted once the trip has actually finished.
        if (ride.getStatus() == RideStatus.ONGOING) {
            transition(ride, RideStatus.DESTINATION_REACHED);
        }
        if (ride.getStatus() == RideStatus.DESTINATION_REACHED) {
            transition(ride, RideStatus.PAYMENT_PENDING);
        }

        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String method = (paymentMethod != null && !paymentMethod.isEmpty()) ? paymentMethod : "UPI";
        Payment payment = new Payment(paymentId, rideId, ride.getFare(), method);
        payment = paymentProcessor.process(payment);
        repository.savePayment(payment);

        ride.setPayment(payment);

        if (payment.getStatus() == com.lld.uber.payment.PaymentStatus.COMPLETED) {
            transition(ride, RideStatus.COMPLETED);
            driverAssignment.release(ride.getDriverId(), ride.getDropoff());
        } else {
            transition(ride, RideStatus.PAYMENT_FAILED);
        }

        repository.updateRide(ride);
        return ride;
    }

    public Ride cancelTrip(String rideId) {
        Ride ride = getRide(rideId);
        transition(ride, RideStatus.CANCELLED);
        driverAssignment.release(ride.getDriverId(), null);
        repository.updateRide(ride);
        return ride;
    }

    public Ride getRide(String rideId) {
        Ride ride = repository.getRide(rideId);
        if (ride == null) throw new RideNotFoundException("Ride not found: " + rideId);
        return ride;
    }

    public List<Ride> getUserRides(String userId) {
        return repository.getRidesByUser(userId);
    }

    public List<Ride> getAllRides() {
        return repository.getAllRides();
    }

    public record FareEstimate(double distanceKm, double fare, int estimatedMinutes,
                               VehicleType vehicleType, String pricingStrategy) {}

    // =========================================================================
    // ISOLATED /sim/* ENGINE — a separate repository + driver-assignment service from the
    // live module. Nothing here ever touches `repository` or `driverAssignment` above.
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        this.simRepository = new UberRepository();
        this.simDriverAssignment = new DriverAssignmentService(simRepository);
        this.simRideId = null;
        simEvents.clear();
        simEventIdGen.set(1);

        Rider rider = new Rider(SIM_RIDER_ID, "Priya Sharma", "9900011122",
                new Location(12.9716, 77.5946, "MG Road"));
        simRepository.registerRider(rider);

        Driver a = new Driver(SIM_DRIVER_A, "Ramesh (Sim)", "9900000001", VehicleType.UBER_GO,
                "KA-05-SM-0001", new Location(12.9720, 77.5950, "MG Road Junction"));
        Driver b = new Driver(SIM_DRIVER_B, "Kavya (Sim)", "9900000002", VehicleType.UBER_GO,
                "KA-05-SM-0002", new Location(12.9730, 77.5960, "Trinity Circle"));
        Driver c = new Driver(SIM_DRIVER_C, "Manoj (Sim)", "9900000003", VehicleType.UBER_XL,
                "KA-05-SM-0003", new Location(12.9900, 77.6400, "Indiranagar"));
        simRepository.registerDriver(a);
        simRepository.registerDriver(b);
        simRepository.registerDriver(c);

        SimEvent event = newSimEvent(0, "RESET", "Sandbox reset",
                "Seeded 1 rider and 3 drivers (2 UBER_GO nearby, 1 UBER_XL far away) in an "
                        + "isolated sim repository — live rides and drivers are untouched.",
                "SUCCESS")
                .addDetail("rider", rider.getName())
                .addDetail("drivers", List.of(
                        a.getName() + " (UBER_GO)", b.getName() + " (UBER_GO)", c.getName() + " (UBER_XL)"));
        simEvents.add(event);
        return getSimSnapshot();
    }

    public Map<String, Object> simEstimate(int step) {
        FareEstimate est = estimate("12.9716", "77.5946", "MG Road",
                "12.9352", "77.6245", "Koramangala", "UBER_GO", false);

        SimEvent event = newSimEvent(step, "ESTIMATE", "Fare estimated",
                String.format("%.1f km, ETA %d min, fare ₹%.2f via %s pricing.",
                        est.distanceKm(), est.estimatedMinutes(), est.fare(), est.pricingStrategy()),
                "SUCCESS")
                .addDetail("distanceKm", est.distanceKm())
                .addDetail("fare", est.fare())
                .addDetail("etaMinutes", est.estimatedMinutes());
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("estimate", est);
        result.put("event", event);
        return result;
    }

    public synchronized Map<String, Object> simRequest(int step) {
        Location pickup = new Location(12.9716, 77.5946, "MG Road");
        Location dropoff = new Location(12.9352, 77.6245, "Koramangala");
        double distanceKm = pickup.distanceTo(dropoff);
        double fare = pricingFactory.forDemand(false).calculateFare(distanceKm, VehicleType.UBER_GO);

        String rideId = simRepository.generateRideId();
        Ride ride = new Ride(rideId, SIM_RIDER_ID, pickup, dropoff, distanceKm, fare, VehicleType.UBER_GO);
        ride.setRider(simRepository.getRider(SIM_RIDER_ID));
        simRepository.saveRide(ride);
        simRideId = rideId;

        List<Driver> nearby = simRepository.findNearestAvailableDrivers(pickup, VehicleType.UBER_GO, SIM_BROADCAST_RADIUS_KM);
        List<String> broadcastTo = nearby.stream().map(Driver::getName).toList();

        SimEvent event = newSimEvent(step, "REQUEST", "Ride requested & broadcast",
                "Priya requested a ride; broadcast to " + broadcastTo.size()
                        + " nearby UBER_GO driver(s) within " + SIM_BROADCAST_RADIUS_KM + " km: "
                        + String.join(", ", broadcastTo) + ". Manoj's UBER_XL was not eligible.",
                "SUCCESS")
                .addDetail("rideId", rideId)
                .addDetail("broadcastTo", broadcastTo);
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ride", ride);
        result.put("broadcastTo", broadcastTo);
        result.put("event", event);
        return result;
    }

    /**
     * The core concurrency demonstration: both candidate drivers try to accept the same ride
     * at effectively the same instant. This exercises the exact race
     * {@link DriverAssignmentService} exists to close — see its class javadoc.
     */
    public Map<String, Object> simRace(int step) {
        Ride ride = requireSimRide();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        Map<String, String> outcomes = new ConcurrentHashMap<>();

        for (String driverId : List.of(SIM_DRIVER_A, SIM_DRIVER_B)) {
            pool.submit(() -> {
                try {
                    start.await();
                    simDriverAssignment.assign(ride, driverId);
                    outcomes.put(driverId, "ACCEPTED");
                } catch (DriverUnavailableException e) {
                    outcomes.put(driverId, "REJECTED: " + e.getMessage());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        try {
            done.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        pool.shutdown();

        String winnerId = ride.getDriverId();
        String loserId = SIM_DRIVER_A.equals(winnerId) ? SIM_DRIVER_B : SIM_DRIVER_A;

        SimEvent event = newSimEvent(step, "RACE", "Two drivers raced for one ride",
                driverName(SIM_DRIVER_A) + " and " + driverName(SIM_DRIVER_B) + " both tried to accept "
                        + "at the same instant, serialized under " + winnerId + "'s per-driver lock — "
                        + driverName(winnerId) + " won; " + driverName(loserId) + " was rejected ("
                        + outcomes.get(loserId) + ").",
                "SUCCESS")
                .addDetail("winnerDriverId", winnerId)
                .addDetail("loserDriverId", loserId)
                .addDetail("outcomes", outcomes);
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ride", ride);
        result.put("winnerDriverId", winnerId);
        result.put("loserDriverId", loserId);
        result.put("outcomes", outcomes);
        result.put("event", event);
        return result;
    }

    public synchronized Map<String, Object> simVerifyOtp(int step, String otp) {
        Ride ride = requireSimRide();

        boolean accepted = ride.verifyOtp(otp);
        SimEvent event;
        if (!accepted) {
            event = newSimEvent(step, "OTP", "OTP verification rejected",
                    "Rider gave OTP " + otp + " but the ride's real OTP is different — trip start refused.",
                    "WARNING")
                    .addDetail("attempted", otp)
                    .addDetail("accepted", false);
        } else {
            transition(ride, RideStatus.ONGOING);
            simRepository.updateRide(ride);
            event = newSimEvent(step, "OTP", "OTP verified — trip started",
                    "Correct OTP " + otp + " accepted; ride is now ONGOING.", "SUCCESS")
                    .addDetail("attempted", otp)
                    .addDetail("accepted", true);
        }
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ride", ride);
        result.put("accepted", accepted);
        result.put("event", event);
        return result;
    }

    public synchronized Map<String, Object> simArrive(int step) {
        Ride ride = requireSimRide();
        transition(ride, RideStatus.DESTINATION_REACHED);
        transition(ride, RideStatus.PAYMENT_PENDING);
        simRepository.updateRide(ride);

        SimEvent event = newSimEvent(step, "ARRIVE", "Arrived at destination",
                "Ride reached " + ride.getDropoff().getLabel() + "; payment now pending.", "SUCCESS")
                .addDetail("status", ride.getStatus().name());
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ride", ride);
        result.put("event", event);
        return result;
    }

    public synchronized Map<String, Object> simComplete(int step) {
        Ride ride = requireSimRide();

        String paymentId = "PAY-SIM-" + simEventIdGen.get();
        Payment payment = new Payment(paymentId, ride.getId(), ride.getFare(), "UPI");
        payment = paymentProcessor.process(payment);
        ride.setPayment(payment);

        if (payment.getStatus() == com.lld.uber.payment.PaymentStatus.COMPLETED) {
            transition(ride, RideStatus.COMPLETED);
            simDriverAssignment.release(ride.getDriverId(), ride.getDropoff());
        } else {
            transition(ride, RideStatus.PAYMENT_FAILED);
        }
        simRepository.updateRide(ride);

        SimEvent event = newSimEvent(step, "COMPLETE", "Trip completed & paid",
                "Charged ₹" + String.format("%.2f", ride.getFare()) + " via UPI; driver "
                        + driverName(ride.getDriverId()) + " released back to the pool.", "SUCCESS")
                .addDetail("fare", ride.getFare())
                .addDetail("finalStatus", ride.getStatus().name());
        simEvents.add(event);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ride", ride);
        result.put("event", event);
        return result;
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("rider", simRepository.getRider(SIM_RIDER_ID));
        snapshot.put("drivers", simRepository.getAllDrivers());
        snapshot.put("ride", simRideId != null ? simRepository.getRide(simRideId) : null);
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    /** {@code ConcurrentHashMap.get(null)} throws NPE rather than returning null, so
     * {@code simRideId} must be checked before it ever reaches the map lookup. */
    private Ride requireSimRide() {
        Ride ride = simRideId != null ? simRepository.getRide(simRideId) : null;
        if (ride == null) {
            throw new RideNotFoundException("No sim ride — run the Request step first");
        }
        return ride;
    }

    private String driverName(String driverId) {
        Driver d = simRepository.getDriver(driverId);
        return d != null ? d.getName() : driverId;
    }

    private SimEvent newSimEvent(int step, String type, String title, String description, String status) {
        return SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step)
                .eventType(type)
                .title(title)
                .description(description)
                .status(status)
                .build();
    }
}
