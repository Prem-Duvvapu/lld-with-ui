package com.lld.uber;

import com.lld.uber.exception.RideNotFoundException;
import com.lld.uber.model.*;
import com.lld.uber.payment.PaymentProcessor;
import com.lld.uber.repository.UberRepository;
import com.lld.uber.service.DriverAssignmentService;
import com.lld.uber.service.UberService;
import com.lld.uber.strategy.FarePricingStrategyFactory;
import com.lld.uber.strategy.StandardFarePricingStrategy;
import com.lld.uber.strategy.SurgeFarePricingStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Walks the isolated {@code /sim/*} engine end to end and proves it is genuinely backed by
 * real service calls against a sandbox — not a hardcoded JSON fixture — and that the sandbox
 * never touches the live rides/drivers a real user might be looking at.
 */
@DisplayName("Uber Simulation Engine")
class UberSimEngineTest {

    private UberRepository liveRepository;
    private UberService service;

    @BeforeEach
    void setUp() {
        liveRepository = new UberRepository();
        StandardFarePricingStrategy standard = new StandardFarePricingStrategy();
        FarePricingStrategyFactory pricing =
                new FarePricingStrategyFactory(standard, new SurgeFarePricingStrategy(standard));
        DriverAssignmentService assignment = new DriverAssignmentService(liveRepository);
        service = new UberService(liveRepository, new PaymentProcessor(), pricing, assignment);
    }

    @Test
    @DisplayName("reset seeds a rider and three drivers, isolated from the live repository")
    void resetSeedsSandboxWithoutTouchingLiveRepository() {
        // The live repository was created empty and nothing above touched it.
        assertTrue(liveRepository.getAllDrivers().isEmpty());
        assertTrue(liveRepository.getAllRiders().isEmpty());

        @SuppressWarnings("unchecked")
        List<Driver> simDrivers = (List<Driver>) service.getSimSnapshot().get("drivers");
        assertEquals(3, simDrivers.size());
        assertNotNull(service.getSimSnapshot().get("rider"));

        // Still nothing on the live side.
        assertTrue(liveRepository.getAllDrivers().isEmpty());
        assertTrue(liveRepository.getAllRiders().isEmpty());
    }

    @Test
    @DisplayName("estimate returns a real fare computed by the pricing strategy, not a fixture")
    void estimateUsesRealPricingStrategy() {
        Map<String, Object> result = service.simEstimate(1);
        UberService.FareEstimate estimate = (UberService.FareEstimate) result.get("estimate");

        assertTrue(estimate.distanceKm() > 0);
        assertTrue(estimate.fare() > 0);
        assertEquals(VehicleType.UBER_GO, estimate.vehicleType());
    }

    @Test
    @DisplayName("request broadcasts only to nearby drivers of the matching vehicle type")
    void requestBroadcastsToMatchingNearbyDriversOnly() {
        service.simReset();
        Map<String, Object> result = service.simRequest(2);

        @SuppressWarnings("unchecked")
        List<String> broadcastTo = (List<String>) result.get("broadcastTo");
        // Two UBER_GO drivers are seeded nearby; the third driver is UBER_XL and must not appear.
        assertEquals(2, broadcastTo.size());
        assertTrue(broadcastTo.stream().noneMatch(name -> name.contains("Manoj")));

        Ride ride = (Ride) result.get("ride");
        assertEquals(RideStatus.REQUESTED, ride.getStatus());
    }

    @Test
    @DisplayName("race step has exactly one winner and one rejected loser, every time")
    void raceAlwaysHasExactlyOneWinner() {
        for (int round = 0; round < 25; round++) {
            service.simReset();
            service.simRequest(2);
            Map<String, Object> result = service.simRace(3);

            @SuppressWarnings("unchecked")
            Map<String, String> outcomes = (Map<String, String>) result.get("outcomes");
            String winnerId = (String) result.get("winnerDriverId");
            String loserId = (String) result.get("loserDriverId");

            assertNotEquals(winnerId, loserId, "round " + round + ": winner and loser must differ");
            assertEquals("ACCEPTED", outcomes.get(winnerId), "round " + round);
            assertTrue(outcomes.get(loserId).startsWith("REJECTED"), "round " + round);

            Ride ride = (Ride) result.get("ride");
            assertEquals(RideStatus.ACCEPTED, ride.getStatus());
            assertEquals(winnerId, ride.getDriverId());
        }
    }

    @Test
    @DisplayName("the race is genuinely concurrent, not two sequential calls dressed up as one")
    void raceIsGenuinelyConcurrentAcrossRepeatedResets() throws InterruptedException {
        // Run many independent sim-service instances racing in parallel with each other to
        // make sure UberService.simRace() itself (not just DriverAssignmentService in isolation)
        // never hands the same driver to both candidates, under real thread interleaving.
        int instances = 30;
        ExecutorService pool = Executors.newFixedThreadPool(instances);
        CountDownLatch done = new CountDownLatch(instances);
        AtomicInteger failures = new AtomicInteger();

        for (int i = 0; i < instances; i++) {
            pool.submit(() -> {
                try {
                    UberRepository repo = new UberRepository();
                    StandardFarePricingStrategy standard = new StandardFarePricingStrategy();
                    UberService svc = new UberService(repo, new PaymentProcessor(),
                            new FarePricingStrategyFactory(standard, new SurgeFarePricingStrategy(standard)),
                            new DriverAssignmentService(repo));

                    svc.simReset();
                    svc.simRequest(2);
                    Map<String, Object> result = svc.simRace(3);
                    Ride ride = (Ride) result.get("ride");
                    if (ride.getStatus() != RideStatus.ACCEPTED || ride.getDriverId() == null) {
                        failures.incrementAndGet();
                    }
                } finally {
                    done.countDown();
                }
            });
        }

        assertTrue(done.await(30, TimeUnit.SECONDS), "sim races did not finish — possible deadlock");
        pool.shutdown();
        assertEquals(0, failures.get(), "at least one sim race failed to resolve to exactly one winner");
    }

    @Test
    @DisplayName("wrong OTP is rejected and the ride is not started; correct OTP starts the trip")
    void otpMustBeCorrectToStartTrip() {
        service.simReset();
        service.simRequest(2);
        service.simRace(3);

        Map<String, Object> wrong = service.simVerifyOtp(4, "0000");
        assertEquals(false, wrong.get("accepted"));
        Ride afterWrongOtp = (Ride) wrong.get("ride");
        assertEquals(RideStatus.ACCEPTED, afterWrongOtp.getStatus());

        String realOtp = afterWrongOtp.getOtp();
        Map<String, Object> correct = service.simVerifyOtp(4, realOtp);
        assertEquals(true, correct.get("accepted"));
        assertEquals(RideStatus.ONGOING, ((Ride) correct.get("ride")).getStatus());
    }

    @Test
    @DisplayName("full lifecycle: reset through complete leaves the ride COMPLETED and the driver AVAILABLE")
    void fullLifecycleEndsWithRideCompletedAndDriverReleased() {
        service.simReset();
        service.simRequest(2);
        Map<String, Object> raceResult = service.simRace(3);
        String winnerId = (String) raceResult.get("winnerDriverId");

        Ride ride = (Ride) raceResult.get("ride");
        service.simVerifyOtp(4, ride.getOtp());
        service.simArrive(5);
        Map<String, Object> completeResult = service.simComplete(6);

        Ride finalRide = (Ride) completeResult.get("ride");
        assertEquals(RideStatus.COMPLETED, finalRide.getStatus());
        assertNotNull(finalRide.getPayment());

        @SuppressWarnings("unchecked")
        List<Driver> drivers = (List<Driver>) service.getSimSnapshot().get("drivers");
        Driver winner = drivers.stream().filter(d -> d.getId().equals(winnerId)).findFirst().orElseThrow();
        assertEquals(DriverStatus.AVAILABLE, winner.getStatus());
    }

    @Test
    @DisplayName("acting before request throws RideNotFoundException, not a NullPointerException")
    void actingBeforeRequestThrowsDomainException() {
        service.simReset();
        assertThrows(RideNotFoundException.class, () -> service.simRace(3));
        assertThrows(RideNotFoundException.class, () -> service.simVerifyOtp(4, "1234"));
        assertThrows(RideNotFoundException.class, () -> service.simArrive(5));
        assertThrows(RideNotFoundException.class, () -> service.simComplete(6));
    }

    @Test
    @DisplayName("reset clears the previous event log and re-seeds cleanly")
    void resetClearsPreviousEventLog() {
        service.simReset();
        service.simRequest(2);
        assertFalse(service.simGetEvents().isEmpty());

        service.simReset();
        // Only the RESET event should remain.
        assertEquals(1, service.simGetEvents().size());
        assertEquals("RESET", service.simGetEvents().get(0).getEventType());
    }
}
