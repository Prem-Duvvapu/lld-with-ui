package com.lld.coupon.controller;

import com.lld.coupon.model.ApplyResult;
import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import com.lld.coupon.model.DiscountType;
import com.lld.coupon.model.SimEvent;
import com.lld.coupon.service.CouponService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/coupon")
@CrossOrigin(origins = "*")
public class CouponController {

    private final CouponService service;

    public CouponController(CouponService service) {
        this.service = service;
    }

    @PostMapping
    public Coupon createCoupon(@RequestBody Map<String, Object> body) {
        String code = body.get("code").toString();
        DiscountType discountType = DiscountType.valueOf(body.get("discountType").toString());
        double discountValue = Double.parseDouble(body.getOrDefault("discountValue", "0").toString());
        double minCartValue = Double.parseDouble(body.getOrDefault("minCartValue", "0").toString());
        String requiredCategory = body.get("requiredCategory") != null ? body.get("requiredCategory").toString() : null;
        boolean firstOrderOnly = Boolean.parseBoolean(body.getOrDefault("firstOrderOnly", "false").toString());
        int maxRedemptions = Integer.parseInt(body.get("maxRedemptions").toString());
        Long expiresAtEpoch = body.get("expiresAtEpoch") != null ? Long.parseLong(body.get("expiresAtEpoch").toString()) : null;
        return service.createCoupon(code, discountType, discountValue, minCartValue, requiredCategory, firstOrderOnly, maxRedemptions, expiresAtEpoch);
    }

    @GetMapping("/{code}")
    public Coupon getCoupon(@PathVariable String code) {
        return service.getCoupon(code);
    }

    @PostMapping("/{code}/apply")
    public ApplyResult apply(@PathVariable String code, @RequestBody Map<String, Object> body) {
        CartContext cart = parseCart(body);
        return service.apply(code, cart);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/{code}/apply")
    public Map<String, Object> simApply(@PathVariable String code, @RequestBody Map<String, Object> body) {
        CartContext cart = parseCart(body);
        return service.simApply(code, cart);
    }

    @PostMapping("/sim/{code}/race")
    public Map<String, Object> simRace(@PathVariable String code, @RequestBody Map<String, Object> body) throws InterruptedException {
        int workerCount = Integer.parseInt(body.getOrDefault("workerCount", "8").toString());
        return service.simRedemptionRace(code, workerCount);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }

    private CartContext parseCart(Map<String, Object> body) {
        double cartTotal = Double.parseDouble(body.getOrDefault("cartTotal", "0").toString());
        int itemCount = Integer.parseInt(body.getOrDefault("itemCount", "1").toString());
        String category = body.get("category") != null ? body.get("category").toString() : null;
        boolean firstOrder = Boolean.parseBoolean(body.getOrDefault("isFirstOrder", "false").toString());
        return CartContext.builder().cartTotal(cartTotal).itemCount(itemCount).category(category).firstOrder(firstOrder).build();
    }
}
