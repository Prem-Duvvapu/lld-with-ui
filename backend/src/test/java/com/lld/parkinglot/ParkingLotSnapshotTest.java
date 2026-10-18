package com.lld.parkinglot;

import com.lld.parkinglot.model.ParkingSpot;
import com.lld.parkinglot.model.SimEvent;
import com.lld.parkinglot.model.Ticket;
import com.lld.parkinglot.service.ParkingLotSimService;
import com.lld.parkinglot.strategy.DynamicPricingStrategy;
import com.lld.parkinglot.strategy.FarthestSpotStrategy;
import com.lld.parkinglot.strategy.FlatRatePricingStrategy;
import com.lld.parkinglot.strategy.HourlyPricingStrategy;
import com.lld.parkinglot.strategy.NearestSpotStrategy;
import com.lld.parkinglot.strategy.PricingStrategyFactory;
import com.lld.parkinglot.strategy.SpotAssignmentStrategyFactory;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.*;

class ParkingLotSnapshotTest {
    private ParkingLotSimService sandbox(HourlyPricingStrategy hourly) {
        return new ParkingLotSimService(
                new SpotAssignmentStrategyFactory(new NearestSpotStrategy(), new FarthestSpotStrategy()),
                new PricingStrategyFactory(hourly, new FlatRatePricingStrategy(), new DynamicPricingStrategy()));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aReturnedSnapshotDoesNotChangeAfterPaymentOrReset() {
        var sim = sandbox(new HourlyPricingStrategy());
        var entered = sim.entry("CAR-42", "CAR", "NEAREST");
        var active = (List<Ticket>) entered.get("activeTickets");
        var spots = (List<ParkingSpot>) entered.get("spots");
        var events = (List<SimEvent>) entered.get("events");
        int originalEvents = events.size();
        sim.pay(active.get(0).getTicketNumber(), "HOURLY", "CARD");
        assertNull(active.get(0).getExitTime());
        assertEquals(Ticket.PaymentStatus.UNPAID, active.get(0).getPaymentStatus());
        assertEquals(1, spots.stream().filter(ParkingSpot::isOccupied).count());
        assertEquals(originalEvents, events.size());
        sim.reset();
        assertEquals(originalEvents, events.size());
    }

    @Test
    @SuppressWarnings("unchecked")
    void callersCannotMutateSandboxModelsOrEventDetailsThroughSnapshots() {
        var sim = sandbox(new HourlyPricingStrategy());
        var entered = sim.entry("CAR-42", "CAR", "NEAREST");
        ((List<ParkingSpot>) entered.get("spots")).forEach(spot -> spot.setOccupied(false));
        ((List<Ticket>) entered.get("activeTickets")).get(0).setVehicleNumber("CORRUPTED");
        sim.getEvents().get(1).getData().put("spotId", "CORRUPTED");
        var actual = sim.getState();
        assertEquals(1, ((List<ParkingSpot>) actual.get("spots")).stream().filter(ParkingSpot::isOccupied).count());
        assertEquals("CAR-42", ((List<Ticket>) actual.get("activeTickets")).get(0).getVehicleNumber());
        assertNotEquals("CORRUPTED", sim.getEvents().get(1).getData().get("spotId"));
    }

    @Test
    void resetWaitsForAnInFlightPaymentInsteadOfSplittingItsState() throws Exception {
        var pricingEntered = new CountDownLatch(1);
        var allowPayment = new CountDownLatch(1);
        var resetStarted = new CountDownLatch(1);
        var sim = sandbox(new HourlyPricingStrategy() {
            @Override
            public double calculatePrice(Ticket ticket) {
                pricingEntered.countDown();
                try {
                    if (!allowPayment.await(5, TimeUnit.SECONDS)) throw new AssertionError("Payment was not released");
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError(interrupted);
                }
                return super.calculatePrice(ticket);
            }
        });
        sim.entry("CAR-42", "CAR", "NEAREST");
        var workers = Executors.newFixedThreadPool(2);
        try {
            var payment = workers.submit(() -> sim.pay("SIM-TKT-00001", "HOURLY", "CARD"));
            assertTrue(pricingEntered.await(5, TimeUnit.SECONDS));
            var reset = workers.submit(() -> { resetStarted.countDown(); return sim.reset(); });
            assertTrue(resetStarted.await(5, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> reset.get(1, TimeUnit.SECONDS));
            allowPayment.countDown();
            assertNotNull(payment.get(5, TimeUnit.SECONDS));
            Map<String, Object> cleared = reset.get(5, TimeUnit.SECONDS);
            assertTrue(((List<?>) cleared.get("activeTickets")).isEmpty());
            assertEquals(1, ((List<?>) cleared.get("events")).size());
        } finally {
            allowPayment.countDown();
            workers.shutdownNow();
        }
    }
}
