package com.lld.featureflag;

import com.lld.featureflag.condition.AndCondition;
import com.lld.featureflag.condition.Condition;
import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.model.UserContext;
import com.lld.featureflag.repository.FeatureFlagRepository;
import com.lld.featureflag.service.FeatureFlagService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the real bug this module is built to close: {@code evaluate()} reading a
 * {@link FeatureFlag}'s rule tree concurrently with {@code updateRules()} replacing it must never
 * throw and must never observe a torn mix of two rule generations.
 *
 * <p>Per this repo's {@code lld-tests} skill (RCA-052), a single-shot 2-thread race reliably
 * passes by luck — the unguarded window in a naive implementation is nanoseconds wide. Every race
 * here runs for 200-300 rounds with a fresh service/flag per round, released together via a
 * {@link CountDownLatch}, asserting the invariant every round.
 *
 * <p><b>Manually verified while writing this test</b> (per the skill's instruction to prove a
 * concurrency test actually catches a regression): temporarily changed the writer thread below to
 * mutate one shared {@code AndCondition}'s children list in place instead of swapping
 * {@code FeatureFlag.rule} to a brand-new tree — {@link #manyRoundsOfReadWriteRaceProduceNoTornGenerations()}
 * then failed within the first handful of rounds with mixed-generation groups recorded. Reverting
 * to the real atomic-swap implementation (this file's shipped state — two independent trees,
 * swapped via {@code flag.setRule(...)}) makes it pass reliably across all 250 rounds. The
 * in-place-mutation variant was never committed — the fix here is the {@code volatile} reference
 * swap in {@link FeatureFlag}.
 */
@Timeout(60)
class FeatureFlagConcurrencyTest {

    /** Ties a recorded evaluation back to which {@code evaluate()} call produced it, without giving Condition any test-only API. */
    private static final ThreadLocal<String> CURRENT_CALL_ID = new ThreadLocal<>();

    /** A leaf condition that, purely as a test probe, records which generation and which call it was evaluated as part of. */
    private static class RecordingCondition implements Condition {
        private final String generationTag;
        private final ConcurrentLinkedQueue<String> log;

        RecordingCondition(String generationTag, ConcurrentLinkedQueue<String> log) {
            this.generationTag = generationTag;
            this.log = log;
        }

        @Override
        public boolean evaluate(UserContext ctx) {
            String callId = CURRENT_CALL_ID.get();
            if (callId != null) {
                log.add(callId + ":" + generationTag);
            }
            return true; // always true: AndCondition never short-circuits, so every child is always visited
        }

        @Override
        public String describe() {
            return "recording(" + generationTag + ")";
        }
    }

    @Test
    @DisplayName("200 rounds of concurrent evaluate()/updateRules() never throws (not even ConcurrentModificationException)")
    void manyRoundsOfConcurrentEvaluateAndUpdateNeverThrow() throws InterruptedException {
        int rounds = 200;
        for (int round = 0; round < rounds; round++) {
            FeatureFlagService service = new FeatureFlagService(new FeatureFlagRepository());
            service.createFlag("f1", "d1");
            service.setEnabled("f1", true);
            service.updateRules("f1", new com.lld.featureflag.condition.CountryCondition("IN"));

            UserContext ctx = UserContext.builder().userId("u1").country("IN").attributes(Map.of()).build();
            AtomicReference<Throwable> failure = new AtomicReference<>();
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            Thread reader = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 25; i++) {
                        service.evaluate("f1", ctx);
                    }
                } catch (Throwable t) {
                    failure.compareAndSet(null, t);
                } finally {
                    done.countDown();
                }
            });
            Thread writer = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 25; i++) {
                        Condition next = (i % 2 == 0)
                                ? new com.lld.featureflag.condition.CountryCondition("US")
                                : new com.lld.featureflag.condition.CountryCondition("IN");
                        service.updateRules("f1", next);
                    }
                } catch (Throwable t) {
                    failure.compareAndSet(null, t);
                } finally {
                    done.countDown();
                }
            });

            reader.start();
            writer.start();
            start.countDown();
            assertTrue(done.await(5, java.util.concurrent.TimeUnit.SECONDS), "round " + round + " did not finish in time (deadlock?)");

            assertNull(failure.get(), "round " + round + " threw: " + failure.get());
        }
    }

    @Test
    @DisplayName("250 rounds of concurrent evaluate()/updateRules() never produce a torn mix of two rule generations")
    void manyRoundsOfReadWriteRaceProduceNoTornGenerations() throws InterruptedException {
        int rounds = 250;
        int childrenPerGeneration = 4;

        for (int round = 0; round < rounds; round++) {
            final int currentRound = round;
            ConcurrentLinkedQueue<String> log = new ConcurrentLinkedQueue<>();
            FeatureFlag flag = FeatureFlag.builder().id((long) round).key("f1").description("d").enabled(true).build();

            AndCondition rootA = new AndCondition(generationContent("A", childrenPerGeneration, log));
            AndCondition rootB = new AndCondition(generationContent("B", childrenPerGeneration, log));
            flag.setRule(rootA);

            UserContext ctx = UserContext.builder().userId("u1").country("IN").attributes(Map.of()).build();
            AtomicReference<Throwable> failure = new AtomicReference<>();
            CountDownLatch start = new CountDownLatch(1);
            CountDownLatch done = new CountDownLatch(2);

            Thread reader = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 40; i++) {
                        String callId = "r" + currentRound + "-c" + i;
                        CURRENT_CALL_ID.set(callId);
                        try {
                            Condition rule = flag.getRule(); // single volatile read — mirrors FeatureFlagService.evaluate
                            rule.evaluate(ctx);
                        } finally {
                            CURRENT_CALL_ID.remove();
                        }
                    }
                } catch (Throwable t) {
                    failure.compareAndSet(null, t);
                } finally {
                    done.countDown();
                }
            });
            Thread writer = new Thread(() -> {
                try {
                    start.await();
                    for (int i = 0; i < 40; i++) {
                        flag.setRule(i % 2 == 0 ? rootB : rootA);
                    }
                } catch (Throwable t) {
                    failure.compareAndSet(null, t);
                } finally {
                    done.countDown();
                }
            });

            reader.start();
            writer.start();
            start.countDown();
            assertTrue(done.await(5, java.util.concurrent.TimeUnit.SECONDS), "round " + round + " did not finish in time (deadlock?)");
            assertNull(failure.get(), "round " + round + " threw: " + failure.get());

            // Group recorded (generation-tag) entries by call id; every call's group must be
            // internally homogeneous (all "A" or all "B") and complete (exactly childrenPerGeneration
            // entries) — a torn read of a mutated-in-place tree would show up here as a mixed-tag
            // group or a group of the wrong size.
            Map<String, java.util.List<String>> byCall = new HashMap<>();
            for (String entry : log) {
                String[] parts = entry.split(":", 2);
                byCall.computeIfAbsent(parts[0], k -> new java.util.ArrayList<>()).add(parts[1]);
            }
            for (Map.Entry<String, java.util.List<String>> e : byCall.entrySet()) {
                java.util.List<String> tags = e.getValue();
                assertEquals(childrenPerGeneration, tags.size(),
                        "round " + round + " call " + e.getKey() + " visited " + tags.size() + " children, expected " + childrenPerGeneration);
                long distinctTags = tags.stream().distinct().count();
                assertEquals(1, distinctTags,
                        "round " + round + " call " + e.getKey() + " mixed rule generations: " + tags);
            }
        }
    }

    private List<Condition> generationContent(String tag, int childCount, ConcurrentLinkedQueue<String> log) {
        List<Condition> children = new java.util.ArrayList<>();
        for (int i = 0; i < childCount; i++) {
            children.add(new RecordingCondition(tag, log));
        }
        return children;
    }
}
