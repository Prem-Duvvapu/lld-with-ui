package com.lld.coupon.repository;

import com.lld.coupon.exception.CouponNotFoundException;
import com.lld.coupon.model.Coupon;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live coupon state — pure CRUD, the same shape as
 * {@code locker.repository.LockerRepository}. No redemption or eligibility logic lives here;
 * that belongs to {@code CouponService}, which owns a second, independently constructed instance
 * of this class for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class CouponRepository {

    private final Map<String, Coupon> coupons = new ConcurrentHashMap<>();

    public void save(Coupon coupon) {
        coupons.put(coupon.getCode(), coupon);
    }

    public Coupon get(String code) {
        Coupon coupon = coupons.get(code);
        if (coupon == null) {
            throw new CouponNotFoundException("Coupon not found: " + code);
        }
        return coupon;
    }

    public List<Coupon> getAll() {
        return new ArrayList<>(coupons.values());
    }

    public void reset() {
        coupons.clear();
    }
}
