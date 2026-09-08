package com.lld.coupon.service;

import com.lld.coupon.model.DiscountType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a few realistic demo coupons so the UI shows something meaningful on first load. */
@Component
public class CouponInitializer implements CommandLineRunner {

    private final CouponService couponService;

    public CouponInitializer(CouponService couponService) {
        this.couponService = couponService;
    }

    @Override
    public void run(String... args) {
        couponService.createCoupon("WELCOME10", DiscountType.PERCENTAGE_OFF, 10, 0, null, true, 1000, null);
        couponService.createCoupon("FLAT20", DiscountType.FLAT_OFF, 20, 50, null, false, 500, null);
        couponService.createCoupon("BOGO-SHOES", DiscountType.BOGO, 0, 0, "footwear", false, 200, null);
        couponService.createCoupon("VIP-ELECTRONICS", DiscountType.PERCENTAGE_OFF, 25, 300, "electronics", false, 50, null);
    }
}
