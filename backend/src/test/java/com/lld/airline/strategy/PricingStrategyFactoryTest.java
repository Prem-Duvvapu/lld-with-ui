package com.lld.airline.strategy;

import com.lld.airline.enums.PricingModel;
import com.lld.airline.enums.SeatClass;
import com.lld.airline.model.Aircraft;
import com.lld.airline.model.Flight;
import com.lld.airline.model.SeatTemplate;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PricingStrategyFactoryTest {

    private final ClassBasedPricingStrategy standard = new ClassBasedPricingStrategy();
    private final DemandSurgePricingStrategy surge = new DemandSurgePricingStrategy();
    private final PricingStrategyFactory factory = new PricingStrategyFactory(standard, surge);

    private SeatTemplate template(SeatClass seatClass) {
        return SeatTemplate.builder().seatNumber("1A").seatClass(seatClass).window(true).aisle(false).build();
    }

    private Flight flightDepartingIn(long days) {
        LocalDateTime dep = LocalDateTime.now().plusDays(days);
        Aircraft aircraft = Aircraft.of("Test", "T-1", List.of(template(SeatClass.ECONOMY)));
        return Flight.create("F1", "F1", "DEL", "BOM", dep, dep.plusHours(2), aircraft, standard);
    }

    @Test
    void factoryResolvesStandardModel() {
        assertSame(standard, factory.forModel(PricingModel.STANDARD));
    }

    @Test
    void factoryResolvesDemandSurgeModel() {
        assertSame(surge, factory.forModel(PricingModel.DEMAND_SURGE));
    }

    @Test
    void factoryDefaultsToStandardWhenModelIsNull() {
        assertSame(standard, factory.forModel(null));
    }

    @Test
    void classBasedPricingOrdersFareByCabinClass() {
        Flight flight = flightDepartingIn(30);
        double economy = standard.calculateSeatPrice(template(SeatClass.ECONOMY), flight);
        double premiumEconomy = standard.calculateSeatPrice(template(SeatClass.PREMIUM_ECONOMY), flight);
        double business = standard.calculateSeatPrice(template(SeatClass.BUSINESS), flight);
        double first = standard.calculateSeatPrice(template(SeatClass.FIRST), flight);

        assertTrue(economy < premiumEconomy);
        assertTrue(premiumEconomy < business);
        assertTrue(business < first);
    }

    @Test
    void classBasedPricingFallsBackToEconomyForNullTemplate() {
        Flight flight = flightDepartingIn(30);
        assertEquals(4500.0, standard.calculateSeatPrice(null, flight));
    }

    @Test
    void demandSurgeChargesAPremiumInsideTheFourteenDayWindow() {
        Flight soon = flightDepartingIn(5);
        Flight standardFare = flightDepartingIn(30);

        double surgePrice = surge.calculateSeatPrice(template(SeatClass.ECONOMY), soon);
        double basePrice = standard.calculateSeatPrice(template(SeatClass.ECONOMY), standardFare);

        assertTrue(surgePrice > basePrice);
    }

    @Test
    void demandSurgeChargesLastMinutePremiumInsideThreeDays() {
        Flight lastMinute = flightDepartingIn(1);
        Flight midWindow = flightDepartingIn(10);

        double lastMinutePrice = surge.calculateSeatPrice(template(SeatClass.ECONOMY), lastMinute);
        double midWindowPrice = surge.calculateSeatPrice(template(SeatClass.ECONOMY), midWindow);

        assertTrue(lastMinutePrice > midWindowPrice, "Booking inside 3 days must cost more than the 3-14 day window");
    }

    @Test
    void demandSurgeMatchesStandardFarWellInAdvance() {
        Flight wellAhead = flightDepartingIn(60);
        double surgePrice = surge.calculateSeatPrice(template(SeatClass.ECONOMY), wellAhead);
        double basePrice = standard.calculateSeatPrice(template(SeatClass.ECONOMY), wellAhead);
        assertEquals(basePrice, surgePrice, 0.001);
    }
}
