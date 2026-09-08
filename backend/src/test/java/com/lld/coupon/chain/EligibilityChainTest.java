package com.lld.coupon.chain;

import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import com.lld.coupon.model.DiscountType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the three handlers fire in the documented order and each rejects for its own specific
 * reason -- not just that rejection happens somehow.
 */
public class EligibilityChainTest {

    private EligibilityChainFactory newFactory() {
        return new EligibilityChainFactory(new MinCartValueHandler(), new CategoryRestrictionHandler(), new FirstOrderOnlyHandler());
    }

    @Test
    void anEligibleCartPassesEveryHandler() {
        Coupon coupon = new Coupon("C1", DiscountType.PERCENTAGE_OFF, 10, 50, "electronics", true, 100, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).category("electronics").firstOrder(true).build();

        EligibilityResult result = newFactory().run(coupon, cart);
        assertTrue(result.isEligible());
    }

    @Test
    void minCartValueFiresFirstEvenWhenOtherConditionsWouldAlsoFail() {
        // Cart is BOTH below min value AND wrong category AND not a first order --
        // min-cart-value must be the one that actually fires, proving handler order, not just any rejection.
        Coupon coupon = new Coupon("C1", DiscountType.PERCENTAGE_OFF, 10, 50, "electronics", true, 100, null);
        CartContext cart = CartContext.builder().cartTotal(10).itemCount(1).category("groceries").firstOrder(false).build();

        EligibilityResult result = newFactory().run(coupon, cart);
        assertFalse(result.isEligible());
        assertTrue(result.getRejectionReason().contains("minimum"), "expected the min-cart-value rejection, got: " + result.getRejectionReason());
    }

    @Test
    void categoryRestrictionFiresWhenCartValueIsFineButCategoryIsWrong() {
        Coupon coupon = new Coupon("C1", DiscountType.PERCENTAGE_OFF, 10, 50, "electronics", true, 100, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).category("groceries").firstOrder(false).build();

        EligibilityResult result = newFactory().run(coupon, cart);
        assertFalse(result.isEligible());
        assertTrue(result.getRejectionReason().contains("category"), "expected the category rejection, got: " + result.getRejectionReason());
    }

    @Test
    void firstOrderOnlyFiresWhenEverythingElsePasses() {
        Coupon coupon = new Coupon("C1", DiscountType.PERCENTAGE_OFF, 10, 50, "electronics", true, 100, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).category("electronics").firstOrder(false).build();

        EligibilityResult result = newFactory().run(coupon, cart);
        assertFalse(result.isEligible());
        assertTrue(result.getRejectionReason().contains("first order"), "expected the first-order rejection, got: " + result.getRejectionReason());
    }

    @Test
    void aNullRequiredCategoryMeansNoRestriction() {
        Coupon coupon = new Coupon("C1", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, null);
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).category("anything").firstOrder(false).build();

        assertTrue(newFactory().run(coupon, cart).isEligible());
    }
}
