package com.lld.coupon.repository;

import com.lld.coupon.exception.CouponNotFoundException;
import com.lld.coupon.model.Coupon;
import com.lld.coupon.model.DiscountType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CouponRepositoryTest {

    private CouponRepository repository;

    @BeforeEach
    void setUp() {
        repository = new CouponRepository();
    }

    @Test
    void unknownCodeThrowsCouponNotFoundException() {
        assertThrows(CouponNotFoundException.class, () -> repository.get("nope"));
    }

    @Test
    void saveAndGetRoundTrips() {
        Coupon coupon = new Coupon("C1", DiscountType.FLAT_OFF, 10, 0, null, false, 100, null);
        repository.save(coupon);
        assertSame(coupon, repository.get("C1"));
    }

    @Test
    void getAllReturnsEverySavedCoupon() {
        repository.save(new Coupon("C1", DiscountType.FLAT_OFF, 10, 0, null, false, 100, null));
        repository.save(new Coupon("C2", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, null));
        assertEquals(2, repository.getAll().size());
    }

    @Test
    void resetWipesEverything() {
        repository.save(new Coupon("C1", DiscountType.FLAT_OFF, 10, 0, null, false, 100, null));
        repository.reset();
        assertTrue(repository.getAll().isEmpty());
    }
}
