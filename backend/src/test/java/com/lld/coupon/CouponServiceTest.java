package com.lld.coupon;

import com.lld.coupon.chain.CategoryRestrictionHandler;
import com.lld.coupon.chain.EligibilityChainFactory;
import com.lld.coupon.chain.FirstOrderOnlyHandler;
import com.lld.coupon.chain.MinCartValueHandler;
import com.lld.coupon.exception.CouponExpiredException;
import com.lld.coupon.exception.CouponNotFoundException;
import com.lld.coupon.exception.IneligibleCartException;
import com.lld.coupon.exception.RedemptionLimitExceededException;
import com.lld.coupon.model.ApplyResult;
import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import com.lld.coupon.model.DiscountType;
import com.lld.coupon.repository.CouponRepository;
import com.lld.coupon.service.CouponService;
import com.lld.coupon.strategy.BogoStrategy;
import com.lld.coupon.strategy.DiscountStrategyFactory;
import com.lld.coupon.strategy.FlatOffStrategy;
import com.lld.coupon.strategy.PercentageOffStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class CouponServiceTest {

    private CouponService service;

    @BeforeEach
    void setUp() {
        EligibilityChainFactory chainFactory = new EligibilityChainFactory(
                new MinCartValueHandler(), new CategoryRestrictionHandler(), new FirstOrderOnlyHandler());
        DiscountStrategyFactory strategyFactory = new DiscountStrategyFactory(
                new PercentageOffStrategy(), new FlatOffStrategy(), new BogoStrategy());
        service = new CouponService(new CouponRepository(), chainFactory, strategyFactory);
    }

    @Test
    void applyingAnEligibleCouponReturnsTheDiscountedTotal() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();

        ApplyResult result = service.apply("C1", cart);
        assertEquals(90.0, result.getDiscountedTotal(), 0.001);
    }

    @Test
    void applyingAnUnknownCodeThrowsCouponNotFoundException() {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertThrows(CouponNotFoundException.class, () -> service.apply("nope", cart));
    }

    @Test
    void applyingAnExpiredCouponThrowsCouponExpiredException() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, System.currentTimeMillis() - 1000);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertThrows(CouponExpiredException.class, () -> service.apply("C1", cart));
    }

    @Test
    void applyingToAnIneligibleCartThrowsIneligibleCartException() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 500, null, false, 100, null);
        CartContext cart = CartContext.builder().cartTotal(10).itemCount(1).build();
        assertThrows(IneligibleCartException.class, () -> service.apply("C1", cart));
    }

    @Test
    void exceedingTheRedemptionLimitThrowsRedemptionLimitExceededException() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 1, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();

        service.apply("C1", cart);
        assertThrows(RedemptionLimitExceededException.class, () -> service.apply("C1", cart));
    }

    @Test
    void aFailedRedemptionNeverIncrementsTheCounter() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 500, null, false, 100, null);
        CartContext ineligible = CartContext.builder().cartTotal(10).itemCount(1).build();
        try {
            service.apply("C1", ineligible);
        } catch (IneligibleCartException ignored) {
            // expected
        }
        assertEquals(0, service.getCoupon("C1").getCurrentRedemptions());
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.createCoupon("C1", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, null);

        Map<String, Object> snapshot = service.simApply("SIM10", CartContext.builder().cartTotal(100).itemCount(1).build());
        @SuppressWarnings("unchecked")
        List<Coupon> simCoupons = (List<Coupon>) (List<?>) snapshot.get("coupons");
        assertTrue(simCoupons.stream().noneMatch(c -> c.getCode().equals("C1")), "the sim sandbox must never see live coupons");

        assertEquals(0, service.getCoupon("C1").getCurrentRedemptions(), "the live coupon must be untouched by sim activity");
    }

    @Test
    void simResetWipesSimStateBackToSeedOnly() throws InterruptedException {
        service.simRedemptionRace("SIM-SCARCE", 3);
        service.initSimState();

        @SuppressWarnings("unchecked")
        List<Coupon> coupons = (List<Coupon>) (List<?>) service.getSimSnapshots().get("coupons");
        Coupon scarce = coupons.stream().filter(c -> c.getCode().equals("SIM-SCARCE")).findFirst().orElseThrow();
        assertEquals(0, scarce.getCurrentRedemptions(), "reset must wipe every previous sim redemption");
    }

    @Test
    void simRedemptionRaceHasAtMostTheRemainingRedemptionsSucceed() throws InterruptedException {
        Map<String, Object> snapshot = service.simRedemptionRace("SIM-SCARCE", 8);

        @SuppressWarnings("unchecked")
        Map<String, Object> raceResult = (Map<String, Object>) snapshot.get("raceResult");
        assertEquals(3, raceResult.get("succeeded"), "SIM-SCARCE seeds with exactly 3 redemptions remaining");
        assertEquals(5, raceResult.get("rejected"));
    }
}
