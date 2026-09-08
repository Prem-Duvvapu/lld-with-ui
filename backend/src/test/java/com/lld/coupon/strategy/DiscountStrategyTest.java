package com.lld.coupon.strategy;

import com.lld.coupon.model.CartContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Proves the three strategies genuinely diverge, not just carry different names for one formula. */
public class DiscountStrategyTest {

    @Test
    void percentageOffReducesByThePercentage() {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertEquals(90.0, new PercentageOffStrategy().apply(cart, 10), 0.001);
    }

    @Test
    void percentageOffNeverGoesBelowZeroEvenOverOneHundredPercent() {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertEquals(0.0, new PercentageOffStrategy().apply(cart, 150), 0.001);
    }

    @Test
    void flatOffSubtractsAFixedAmount() {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertEquals(80.0, new FlatOffStrategy().apply(cart, 20), 0.001);
    }

    @Test
    void flatOffNeverGoesNegative() {
        CartContext cart = CartContext.builder().cartTotal(10).itemCount(1).build();
        assertEquals(0.0, new FlatOffStrategy().apply(cart, 50), 0.001);
    }

    @Test
    void bogoGivesEveryPairOneFreeItem() {
        // 4 items, $100 total -> $25/item -> 2 free items -> $50 off.
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(4).build();
        assertEquals(50.0, new BogoStrategy().apply(cart, 0), 0.001);
    }

    @Test
    void bogoAppliesNoDiscountWithFewerThanTwoItems() {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).build();
        assertEquals(100.0, new BogoStrategy().apply(cart, 0), 0.001);
    }

    @Test
    void bogoDivergesFromPercentageOffOnTheSameCart() {
        // 4 items, $100 total: BOGO gives $50 off, a 25% coupon on the same numbers would give $25 off.
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(4).build();
        double bogoResult = new BogoStrategy().apply(cart, 0);
        double percentageResult = new PercentageOffStrategy().apply(cart, 25);
        assertNotEquals(bogoResult, percentageResult, "BOGO must depend on itemCount, not just discountValue");
    }

    @Test
    void factoryResolvesEachTypeToItsOwnStrategyInstance() {
        DiscountStrategyFactory factory = new DiscountStrategyFactory(
                new PercentageOffStrategy(), new FlatOffStrategy(), new BogoStrategy());

        assertInstanceOf(PercentageOffStrategy.class, factory.forType(com.lld.coupon.model.DiscountType.PERCENTAGE_OFF));
        assertInstanceOf(FlatOffStrategy.class, factory.forType(com.lld.coupon.model.DiscountType.FLAT_OFF));
        assertInstanceOf(BogoStrategy.class, factory.forType(com.lld.coupon.model.DiscountType.BOGO));
    }
}
