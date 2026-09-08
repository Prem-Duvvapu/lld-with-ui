package com.lld.coupon;

import com.lld.coupon.chain.CategoryRestrictionHandler;
import com.lld.coupon.chain.EligibilityChainFactory;
import com.lld.coupon.chain.FirstOrderOnlyHandler;
import com.lld.coupon.chain.MinCartValueHandler;
import com.lld.coupon.exception.RedemptionLimitExceededException;
import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.DiscountType;
import com.lld.coupon.repository.CouponRepository;
import com.lld.coupon.service.CouponService;
import com.lld.coupon.strategy.BogoStrategy;
import com.lld.coupon.strategy.DiscountStrategyFactory;
import com.lld.coupon.strategy.FlatOffStrategy;
import com.lld.coupon.strategy.PercentageOffStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code Coupon#tryRedeem}, called under {@code Coupon#getLock()}, closes the classic
 * bounded-counter check-then-act race: a coupon with K redemptions remaining must never be
 * redeemed more than K times under concurrent checkout, no matter how many threads race it.
 */
public class CouponConcurrencyTest {

    private static CouponService newService() {
        EligibilityChainFactory chainFactory = new EligibilityChainFactory(
                new MinCartValueHandler(), new CategoryRestrictionHandler(), new FirstOrderOnlyHandler());
        DiscountStrategyFactory strategyFactory = new DiscountStrategyFactory(
                new PercentageOffStrategy(), new FlatOffStrategy(), new BogoStrategy());
        return new CouponService(new CouponRepository(), chainFactory, strategyFactory);
    }

    @Test
    @DisplayName("N concurrent applies against a coupon with exactly K redemptions left: exactly K succeed — 300 rounds")
    void repeatedRedemptionRaceNeverOvershootsTheLimit() throws InterruptedException {
        int remaining = 3;
        int racerCount = 12;

        for (int round = 0; round < 300; round++) {
            CouponService service = newService();
            service.createCoupon("RACE", DiscountType.FLAT_OFF, 5, 0, null, false, remaining, null);
            CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();

            ExecutorService pool = Executors.newFixedThreadPool(racerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(racerCount);
            AtomicInteger succeeded = new AtomicInteger();
            AtomicInteger rejected = new AtomicInteger();

            for (int i = 0; i < racerCount; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        service.apply("RACE", cart);
                        succeeded.incrementAndGet();
                    } catch (RedemptionLimitExceededException expected) {
                        rejected.incrementAndGet();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(remaining, succeeded.get(), "round " + round + ": exactly " + remaining + " redemptions must succeed, never more");
            assertEquals(racerCount - remaining, rejected.get(), "round " + round + ": every other racer must cleanly lose, not silently redeem");
            assertEquals(remaining, service.getCoupon("RACE").getCurrentRedemptions(),
                    "round " + round + ": the coupon's own counter must land exactly at its limit, never over");
        }
    }

    @Test
    @DisplayName("More racers than redemptions available: exactly min(racers, limit) succeed — 200 rounds")
    void moreRacersThanRedemptionsClaimsExactlyTheLimit() throws InterruptedException {
        int limit = 5;
        int racerCount = 20;

        for (int round = 0; round < 200; round++) {
            CouponService service = newService();
            service.createCoupon("RACE", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, limit, null);
            CartContext cart = CartContext.builder().cartTotal(50).itemCount(1).build();

            ExecutorService pool = Executors.newFixedThreadPool(racerCount);
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(racerCount);
            AtomicInteger succeeded = new AtomicInteger();

            for (int i = 0; i < racerCount; i++) {
                pool.submit(() -> {
                    try {
                        start.await();
                        service.apply("RACE", cart);
                        succeeded.incrementAndGet();
                    } catch (RedemptionLimitExceededException expected) {
                        // exactly racerCount - limit of these are expected
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            assertTrue(done.await(5, TimeUnit.SECONDS), "round " + round + " timed out");
            pool.shutdown();

            assertEquals(limit, succeeded.get(), "round " + round + ": exactly min(racers, limit) must succeed");
            assertEquals(limit, service.getCoupon("RACE").getCurrentRedemptions());
        }
    }
}
