package com.lld.coupon.service;

import com.lld.coupon.chain.EligibilityChainFactory;
import com.lld.coupon.chain.EligibilityResult;
import com.lld.coupon.exception.CouponExpiredException;
import com.lld.coupon.exception.IneligibleCartException;
import com.lld.coupon.exception.RedemptionLimitExceededException;
import com.lld.coupon.model.ApplyResult;
import com.lld.coupon.model.CartContext;
import com.lld.coupon.model.Coupon;
import com.lld.coupon.model.DiscountType;
import com.lld.coupon.model.SimEvent;
import com.lld.coupon.repository.CouponRepository;
import com.lld.coupon.strategy.DiscountStrategy;
import com.lld.coupon.strategy.DiscountStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Facade owning coupon creation/application and the isolated simulation engine.
 * {@link #doApply}'s redemption step is the concurrency centerpiece: {@link Coupon#tryRedeem()}
 * runs under that coupon's own {@link Coupon#getLock()}, holding "read count, compare to limit,
 * increment" as one atomic block — the classic bounded-counter check-then-act race, closed the
 * same way {@code locker.service.LockerService#deposit} closes its own per-entity race.
 */
@Service
public class CouponService {

    private final CouponRepository repository;
    private final EligibilityChainFactory chainFactory;
    private final DiscountStrategyFactory strategyFactory;

    // Isolated Simulation Engine State
    private final CouponRepository simRepository = new CouponRepository();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public CouponService(CouponRepository repository, EligibilityChainFactory chainFactory,
                          DiscountStrategyFactory strategyFactory) {
        this.repository = repository;
        this.chainFactory = chainFactory;
        this.strategyFactory = strategyFactory;
        initSimState();
    }

    public Coupon createCoupon(String code, DiscountType discountType, double discountValue, double minCartValue,
                                String requiredCategory, boolean firstOrderOnly, int maxRedemptions, Long expiresAtEpoch) {
        Coupon coupon = new Coupon(code, discountType, discountValue, minCartValue, requiredCategory,
                firstOrderOnly, maxRedemptions, expiresAtEpoch);
        repository.save(coupon);
        return coupon;
    }

    public Coupon getCoupon(String code) {
        return repository.get(code);
    }

    public ApplyResult apply(String code, CartContext cart) {
        return doApply(repository, code, cart);
    }

    private ApplyResult doApply(CouponRepository targetRepository, String code, CartContext cart) {
        Coupon coupon = targetRepository.get(code);

        if (coupon.isExpired()) {
            throw new CouponExpiredException("Coupon expired: " + code);
        }

        EligibilityResult eligibility = chainFactory.run(coupon, cart);
        if (!eligibility.isEligible()) {
            throw new IneligibleCartException(eligibility.getRejectionReason());
        }

        coupon.getLock().lock();
        try {
            if (!coupon.tryRedeem()) {
                throw new RedemptionLimitExceededException(
                        "Coupon " + code + " has reached its redemption limit of " + coupon.getMaxRedemptions());
            }
        } finally {
            coupon.getLock().unlock();
        }

        DiscountStrategy strategy = strategyFactory.forType(coupon.getDiscountType());
        double discountedTotal = strategy.apply(cart, coupon.getDiscountValue());
        return ApplyResult.builder()
                .code(code)
                .discountType(coupon.getDiscountType())
                .originalTotal(cart.getCartTotal())
                .discountedTotal(discountedTotal)
                .build();
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simEventLog.clear();

        simRepository.save(new Coupon("SIM10", DiscountType.PERCENTAGE_OFF, 10, 0, null, false, 100, null));
        simRepository.save(new Coupon("SIM-SCARCE", DiscountType.FLAT_OFF, 5, 0, null, false, 3, null));
        simRepository.save(new Coupon("SIM-VIP", DiscountType.PERCENTAGE_OFF, 20, 200, "electronics", true, 50, null));

        logSimEvent("SIM_RESET", "System", "Sandbox reset -- 3 coupons seeded (SIM10, SIM-SCARCE with 3 redemptions, SIM-VIP with eligibility conditions)", null);
    }

    public Map<String, Object> simApply(String code, CartContext cart) {
        try {
            ApplyResult result = doApply(simRepository, code, cart);
            logSimEvent("APPLIED", "System", String.format(
                    "Applied '%s': %.2f -> %.2f", code, result.getOriginalTotal(), result.getDiscountedTotal()), null);
        } catch (IneligibleCartException | CouponExpiredException | RedemptionLimitExceededException e) {
            logSimEvent("REJECTED", "System", "Rejected '" + code + "': " + e.getMessage(), null);
        }
        return getSimSnapshots();
    }

    /**
     * Live demonstration of the redemption-limit race: {@code workerCount} threads all race to
     * apply the same scarce coupon. Not {@code synchronized} -- a method-level lock here would
     * serialize every worker before any of them reached {@link Coupon#getLock()}, and the race
     * this module exists to demonstrate would never actually happen.
     */
    public Map<String, Object> simRedemptionRace(String code, int workerCount) throws InterruptedException {
        CartContext cart = CartContext.builder().cartTotal(100).itemCount(1).category(null).firstOrder(false).build();

        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workerCount);
        AtomicInteger succeeded = new AtomicInteger(0);
        AtomicInteger rejected = new AtomicInteger(0);

        for (int i = 0; i < workerCount; i++) {
            String workerId = "RaceWorker-" + (i + 1);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    doApply(simRepository, code, cart);
                    succeeded.incrementAndGet();
                    logSimEvent("REDEEMED", workerId, workerId + " successfully redeemed '" + code + "'", null);
                } catch (RedemptionLimitExceededException e) {
                    rejected.incrementAndGet();
                    logSimEvent("REDEMPTION_REJECTED", workerId, workerId + " lost the race for '" + code + "': " + e.getMessage(), null);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        Map<String, Object> details = new HashMap<>();
        details.put("attempts", workerCount);
        details.put("succeeded", succeeded.get());
        details.put("rejected", rejected.get());
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d workers raced to redeem '%s' -- %d succeeded, %d rejected", workerCount, code, succeeded.get(), rejected.get()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("coupons", simRepository.getAll());
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
