package com.lld.movieticket;

import com.lld.movieticket.model.Seat;
import com.lld.movieticket.model.SeatStatus;
import com.lld.movieticket.model.SeatType;
import com.lld.movieticket.model.Show;
import com.lld.movieticket.strategy.BasePricingStrategy;
import com.lld.movieticket.strategy.PricingStrategy;
import com.lld.movieticket.strategy.PricingStrategyFactory;
import com.lld.movieticket.strategy.PricingTier;
import com.lld.movieticket.strategy.SurgePricingStrategy;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Strategy-flavour tests. Before {@link PricingStrategyFactory} existed, {@link SurgePricingStrategy}
 * was dead code — {@code MovieTicketService} only ever constructed a {@link BasePricingStrategy}
 * directly, so nothing in the running app ever picked the surge strategy. These tests pin both the
 * per-seat-type base pricing and the peak/standard classification that now actually selects it.
 */
public class PricingStrategyTest {

    private Seat seat(SeatType type, double price) {
        return new Seat(1L, 1L, 1, 1, type, price, SeatStatus.AVAILABLE);
    }

    private Show showAt(String time) {
        return new Show(1L, 1L, "Screen 1", time, 24, 24);
    }

    // ---- BasePricingStrategy -------------------------------------------------

    @Test
    public void baseStrategyUsesSeatsExplicitPriceWhenSet() {
        PricingStrategy base = new BasePricingStrategy();
        assertEquals(275.0, base.calculatePrice(showAt("10:00 AM"), seat(SeatType.SILVER, 275.0)));
    }

    @Test
    public void baseStrategyFallsBackToSeatTypeDefaultsWhenNoExplicitPrice() {
        PricingStrategy base = new BasePricingStrategy();
        assertEquals(500.0, base.calculatePrice(showAt("10:00 AM"), seat(SeatType.PLATINUM, 0.0)));
        assertEquals(350.0, base.calculatePrice(showAt("10:00 AM"), seat(SeatType.GOLD, 0.0)));
        assertEquals(200.0, base.calculatePrice(showAt("10:00 AM"), seat(SeatType.SILVER, 0.0)));
    }

    @Test
    public void baseStrategyHandlesANullSeatGracefully() {
        assertEquals(200.0, new BasePricingStrategy().calculatePrice(showAt("10:00 AM"), null));
    }

    // ---- SurgePricingStrategy -------------------------------------------------

    @Test
    public void surgeStrategyAppliesDefaultTwentyFivePercentMultiplierOverBase() {
        PricingStrategy surge = new SurgePricingStrategy();
        assertEquals(250.0, surge.calculatePrice(showAt("07:00 PM"), seat(SeatType.SILVER, 0.0)), 0.001);
    }

    @Test
    public void surgeStrategyHonoursACustomMultiplier() {
        PricingStrategy surge = new SurgePricingStrategy(1.5);
        assertEquals(300.0, surge.calculatePrice(showAt("07:00 PM"), seat(SeatType.SILVER, 0.0)), 0.001);
    }

    // ---- PricingStrategyFactory: classification --------------------------------

    @Test
    public void showTimeAtOrAfterFivePmClassifiesAsPeak() {
        assertEquals(PricingTier.PEAK, PricingStrategyFactory.classify(showAt("05:00 PM")));
        assertEquals(PricingTier.PEAK, PricingStrategyFactory.classify(showAt("07:00 PM")));
        assertEquals(PricingTier.PEAK, PricingStrategyFactory.classify(showAt("11:59 PM")));
    }

    @Test
    public void showTimeBeforeFivePmClassifiesAsStandard() {
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(showAt("10:00 AM")));
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(showAt("02:00 PM")));
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(showAt("04:59 PM")));
    }

    @Test
    public void unparseableOrMissingShowTimeDefaultsToStandardNotPeak() {
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(showAt("garbage")));
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(showAt(null)));
        assertEquals(PricingTier.STANDARD, PricingStrategyFactory.classify(null));
    }

    // ---- PricingStrategyFactory: resolution --------------------------------

    @Test
    public void factoryResolvesPeakShowsToSurgeAndStandardShowsToBase() {
        PricingStrategyFactory factory = new PricingStrategyFactory(new BasePricingStrategy(), new SurgePricingStrategy());

        Seat goldSeat = seat(SeatType.GOLD, 0.0);
        double standardPrice = factory.resolve(showAt("10:00 AM")).calculatePrice(showAt("10:00 AM"), goldSeat);
        double peakPrice = factory.resolve(showAt("07:00 PM")).calculatePrice(showAt("07:00 PM"), goldSeat);

        assertEquals(350.0, standardPrice, "off-peak show uses base pricing, unmarked up");
        assertEquals(437.5, peakPrice, 0.001, "5 PM-or-later show gets the surge strategy's 25% markup");
        assertTrue(peakPrice > standardPrice);
    }

    @Test
    public void forTierReturnsTheSameStrategyInstancesTheFactoryWasBuiltWith() {
        BasePricingStrategy base = new BasePricingStrategy();
        SurgePricingStrategy surge = new SurgePricingStrategy();
        PricingStrategyFactory factory = new PricingStrategyFactory(base, surge);

        assertSame(base, factory.forTier(PricingTier.STANDARD));
        assertSame(surge, factory.forTier(PricingTier.PEAK));
    }
}
