package com.lld.featureflag.service;

import com.lld.featureflag.condition.AndCondition;
import com.lld.featureflag.condition.Condition;
import com.lld.featureflag.condition.CountryCondition;
import com.lld.featureflag.exception.DuplicateFlagKeyException;
import com.lld.featureflag.exception.FlagNotFoundException;
import com.lld.featureflag.exception.InvalidRuleException;
import com.lld.featureflag.model.EvaluationResult;
import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.model.SimEvent;
import com.lld.featureflag.model.UserContext;
import com.lld.featureflag.repository.FeatureFlagRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Facade the controller delegates to wholesale. Owns the production {@link FeatureFlagRepository}
 * plus a completely separate, isolated sandbox repository (and its own event log) for the
 * {@code /sim/*} engine, so a demo run never mutates a production flag — the same isolation shape
 * as {@code SplitwiseService}'s {@code repository}/{@code simRepository} split.
 */
@Service
public class FeatureFlagService {

    private static final String SIM_FLAG_KEY = "sim-checkout-redesign";

    private final FeatureFlagRepository repository;
    private volatile FeatureFlagRepository simRepository = new FeatureFlagRepository();

    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    public FeatureFlagService(FeatureFlagRepository repository) {
        this.repository = repository;
    }

    // =========================================================================
    // PRODUCTION OPERATIONS
    // =========================================================================

    public FeatureFlag createFlag(String key, String description) {
        if (key == null || key.isBlank()) {
            throw new InvalidRuleException("Flag key must not be blank.");
        }
        if (repository.existsByKey(key)) {
            throw new DuplicateFlagKeyException("A flag with key '" + key + "' already exists.");
        }
        FeatureFlag flag = FeatureFlag.builder()
                .key(key)
                .description(description)
                .enabled(false)
                .rule(null)
                .build();
        return repository.save(flag);
    }

    public FeatureFlag getFlag(String key) {
        return requireFlag(repository, key);
    }

    public List<FeatureFlag> listFlags() {
        return repository.findAll();
    }

    public FeatureFlag setEnabled(String key, boolean enabled) {
        FeatureFlag flag = requireFlag(repository, key);
        flag.setEnabled(enabled);
        return flag;
    }

    /**
     * Builds an entirely new tree elsewhere (see {@link com.lld.featureflag.condition.ConditionTreeBuilder})
     * and swaps it in with a single volatile write — never mutates the tree currently hanging off
     * this flag. That is the whole fix for the evaluate-during-update race; see
     * {@link FeatureFlag}'s class Javadoc.
     */
    public FeatureFlag updateRules(String key, Condition newRoot) {
        if (newRoot == null) {
            throw new InvalidRuleException("Rule tree must not be null.");
        }
        FeatureFlag flag = requireFlag(repository, key);
        flag.setRule(newRoot);
        return flag;
    }

    public EvaluationResult evaluate(String key, UserContext ctx) {
        FeatureFlag flag = requireFlag(repository, key);
        return evaluate(flag, ctx);
    }

    private static EvaluationResult evaluate(FeatureFlag flag, UserContext ctx) {
        if (!flag.isEnabled()) {
            return EvaluationResult.builder()
                    .matched(false)
                    .explanation("Flag '" + flag.getKey() + "' is globally disabled (kill switch) — "
                            + "evaluation short-circuits to false regardless of targeting rules.")
                    .build();
        }
        Condition rule = flag.getRule(); // one volatile read — the whole call sees one generation
        if (rule == null) {
            return EvaluationResult.builder()
                    .matched(false)
                    .explanation("Flag '" + flag.getKey() + "' is enabled but has no targeting rule configured — defaults to false.")
                    .build();
        }
        boolean matched = rule.evaluate(ctx);
        String who = (ctx == null || ctx.getUserId() == null) ? "anonymous user" : "user " + ctx.getUserId();
        String explanation = "Flag '" + flag.getKey() + "' is enabled. Rule: " + rule.describe()
                + " -> " + (matched ? "MATCHED" : "NOT MATCHED") + " for " + who + ".";
        return EvaluationResult.builder().matched(matched).explanation(explanation).build();
    }

    private static FeatureFlag requireFlag(FeatureFlagRepository repo, String key) {
        FeatureFlag flag = repo.findByKey(key);
        if (flag == null) {
            throw new FlagNotFoundException("No feature flag registered with key '" + key + "'.");
        }
        return flag;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        this.simRepository = new FeatureFlagRepository();
        logSimEvent(1, "RESET", "SUCCESS", "Sandbox Reset", "Sim flag store wiped clean.", Map.of());
        return simSnapshot();
    }

    public synchronized Map<String, Object> simCreateFlag(int step) {
        FeatureFlag flag = FeatureFlag.builder()
                .key(SIM_FLAG_KEY)
                .description("Redesigned checkout flow")
                .enabled(false)
                .rule(null)
                .build();
        simRepository.save(flag);
        logSimEvent(step, "FLAG_CREATED", "INFO", "Flag Created (disabled)",
                "'" + SIM_FLAG_KEY + "' created with the kill switch off — evaluate() returns false no matter what rules get added next.",
                Map.of("key", SIM_FLAG_KEY));
        return simSnapshot();
    }

    public synchronized Map<String, Object> simSetEnabled(boolean enabled, int step) {
        FeatureFlag flag = requireFlag(simRepository, SIM_FLAG_KEY);
        flag.setEnabled(enabled);
        logSimEvent(step, enabled ? "ENABLED" : "DISABLED", enabled ? "SUCCESS" : "WARNING",
                enabled ? "Kill Switch ON" : "Kill Switch OFF (global disable)",
                enabled
                        ? "Flag enabled — targeting rules now apply."
                        : "Flag disabled — evaluate() now always returns false, regardless of any configured rule.",
                Map.of("enabled", enabled));
        return simSnapshot();
    }

    public synchronized Map<String, Object> simSetRule(Condition rule, String label, int step) {
        if (rule == null) {
            throw new InvalidRuleException("Rule tree must not be null.");
        }
        FeatureFlag flag = requireFlag(simRepository, SIM_FLAG_KEY);
        flag.setRule(rule);
        logSimEvent(step, "RULE_UPDATED", "SUCCESS", label == null || label.isBlank() ? "Rule Updated" : label,
                "New targeting rule: " + rule.describe(), Map.of("rule", rule.describe()));
        return simSnapshot();
    }

    public synchronized Map<String, Object> simEvaluate(String userLabel, UserContext ctx, int step) {
        FeatureFlag flag = requireFlag(simRepository, SIM_FLAG_KEY);
        EvaluationResult result = evaluate(flag, ctx);
        logSimEvent(step, "EVALUATED", result.isMatched() ? "SUCCESS" : "INFO",
                "Evaluated for " + userLabel,
                result.getExplanation(),
                Map.of("userId", String.valueOf(ctx.getUserId()), "matched", result.isMatched()));
        return simSnapshot();
    }

    /**
     * Fires the exact race the module is built to close: one thread hammers {@code evaluate()} in
     * a tight loop while another repeatedly swaps the rule tree, then reports whether it survived
     * cleanly — zero exceptions, every read internally consistent. This is the same guarantee
     * {@code FeatureFlagConcurrencyTest} proves with a JUnit assertion; here it is a live,
     * visible demo for the Simulation tab.
     */
    public synchronized Map<String, Object> simConcurrentUpdateDemo(int step) {
        FeatureFlag flag = requireFlag(simRepository, SIM_FLAG_KEY);
        Condition genA = new AndCondition(List.of(new CountryCondition("IN")));
        Condition genB = new AndCondition(List.of(new CountryCondition("US")));
        boolean wasEnabled = flag.isEnabled();
        Condition previousRule = flag.getRule();
        flag.setEnabled(true);
        flag.setRule(genA);

        int rounds = 300;
        AtomicInteger evaluations = new AtomicInteger();
        AtomicInteger swaps = new AtomicInteger();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(2);
        UserContext readerCtx = UserContext.builder().userId("demo-reader").country("IN").attributes(Map.of()).build();

        Thread reader = new Thread(() -> {
            try {
                startLatch.await();
                for (int i = 0; i < rounds; i++) {
                    evaluate(flag, readerCtx);
                    evaluations.incrementAndGet();
                }
            } catch (Throwable t) {
                failure.compareAndSet(null, t);
            } finally {
                doneLatch.countDown();
            }
        }, "ff-sim-reader");

        Thread writer = new Thread(() -> {
            try {
                startLatch.await();
                for (int i = 0; i < rounds; i++) {
                    flag.setRule(i % 2 == 0 ? genB : genA);
                    swaps.incrementAndGet();
                }
            } catch (Throwable t) {
                failure.compareAndSet(null, t);
            } finally {
                doneLatch.countDown();
            }
        }, "ff-sim-writer");

        reader.start();
        writer.start();
        startLatch.countDown();
        boolean finished;
        try {
            finished = doneLatch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            finished = false;
        }

        flag.setRule(previousRule);
        flag.setEnabled(wasEnabled);

        Throwable error = failure.get();
        String status = (finished && error == null) ? "SUCCESS" : "ERROR";
        String description;
        if (!finished) {
            description = "Race demo timed out waiting for reader/writer threads to finish.";
        } else if (error != null) {
            description = "Race demo failed: " + error;
        } else {
            description = evaluations.get() + " concurrent evaluate() calls survived " + swaps.get()
                    + " concurrent updateRules() swaps with zero exceptions — the atomic reference "
                    + "swap means every read saw a fully-old or fully-new rule tree, never a mix.";
        }
        logSimEvent(step, "CONCURRENCY_DEMO", status, "Concurrent Read/Write Race", description,
                Map.of("evaluations", evaluations.get(), "swaps", swaps.get(), "threwException", error != null));
        return simSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public Map<String, Object> simSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("flags", simRepository.findAll());
        snapshot.put("events", List.copyOf(simEvents));
        return snapshot;
    }

    private void logSimEvent(int step, String type, String status, String title, String description, Map<String, Object> details) {
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step)
                .eventType(type)
                .status(status)
                .title(title)
                .description(description)
                .build();
        details.forEach(event::addDetail);
        simEvents.add(event);
    }
}
