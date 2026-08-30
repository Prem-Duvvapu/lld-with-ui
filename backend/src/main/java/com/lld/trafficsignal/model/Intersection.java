package com.lld.trafficsignal.model;

import com.lld.trafficsignal.exception.InvalidOverrideException;
import com.lld.trafficsignal.exception.SignalNotFoundException;
import com.lld.trafficsignal.observer.SignalChangeEvent;
import com.lld.trafficsignal.observer.SignalChangeNotifier;
import com.lld.trafficsignal.state.GreenState;
import com.lld.trafficsignal.state.RedState;
import com.lld.trafficsignal.state.SignalState;
import com.lld.trafficsignal.state.YellowState;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * A 4-way intersection where exactly one {@link TrafficLight} is ever GREEN or YELLOW at a time
 * (the "active" light) while every other light sits RED — a real conflict surface: two
 * directions simultaneously GREEN would mean a collision. {@link #lock} is what prevents that
 * under concurrent callers; every method that reads-then-writes intersection state acquires it
 * for the whole operation.
 *
 * <h2>Emergency override semantics (documented decision)</h2>
 * <p>{@link #requestEmergencyOverride(int)} forces exactly one light to GREEN and every other
 * light to RED <em>immediately</em>, bypassing the normal legal-transition table (a light that
 * was GREEN skips its YELLOW clearance phase entirely). This is a deliberate simplification: a
 * production preemption system would insert a brief all-red or yellow-clearance interval first
 * for safety; this module snaps straight to the override for demo clarity. Normal cycling is
 * frozen — {@link #tick()} is a no-op — until {@link #resumeNormalOperation()} is called
 * explicitly. There is no automatic timeout: the original implementation spawned a one-shot
 * {@code ScheduledExecutorService} per call to auto-clear the override after a fixed delay,
 * which both leaked a thread pool per call (RCA-038) and could resume normal cycling out from
 * under an emergency vehicle still in the intersection. Requiring an explicit resume call is
 * simpler, leak-free, and matches how real signal preemption works: the controller (or, here,
 * the operator) ends the preemption when it is actually safe to. On resume, the overridden light
 * moves from GREEN to YELLOW — a legal transition — and ordinary ticking continues from there,
 * handing GREEN to the next light in rotation once that YELLOW (and the RED after it) elapse.
 *
 * <p>Only one override may be active at a time per intersection: a second concurrent request
 * while one is in force is rejected with {@link InvalidOverrideException} rather than queued or
 * silently overriding the first — see {@code IntersectionEmergencyOverrideConcurrencyTest} for
 * the race this guards.
 */
public class Intersection {
    private final int id;
    private final String name;
    private final List<TrafficLight> lights;
    private final SignalChangeNotifier notifier;
    private final ReentrantLock lock = new ReentrantLock();

    private int activeIndex;
    private boolean emergencyActive;
    private Integer emergencyLightId;

    public Intersection(int id, String name, List<TrafficLight> lights, SignalChangeNotifier notifier) {
        if (lights == null || lights.isEmpty()) {
            throw new IllegalArgumentException("An intersection needs at least one light.");
        }
        this.id = id;
        this.name = name;
        this.lights = lights;
        this.notifier = notifier;
        this.activeIndex = 0;
        lights.get(0).forceState(GreenState.INSTANCE);
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<TrafficLight> getLights() {
        return lights;
    }

    public boolean isEmergencyActive() {
        return emergencyActive;
    }

    public Integer getEmergencyLightId() {
        return emergencyLightId;
    }

    public int getActiveIndex() {
        return activeIndex;
    }

    public SignalChangeNotifier getNotifier() {
        return notifier;
    }

    /**
     * One simulated second. Decrements the active light's countdown; when it reaches zero, the
     * phase advances (GREEN -&gt; YELLOW on the same light, or YELLOW -&gt; RED followed by
     * handing GREEN to the next light in rotation). A no-op while an emergency override is active.
     */
    public void tick() {
        lock.lock();
        try {
            if (emergencyActive) {
                return;
            }
            TrafficLight active = lights.get(activeIndex);
            if (active.decrementAndCheckExpired()) {
                advance(active);
            }
        } finally {
            lock.unlock();
        }
    }

    private void advance(TrafficLight active) {
        if (active.getCurrentState() == LightState.GREEN) {
            transition(active, YellowState.INSTANCE);
        } else {
            // YELLOW just finished: this light goes RED, and the next light in rotation goes GREEN.
            transition(active, RedState.INSTANCE);
            activeIndex = (activeIndex + 1) % lights.size();
            transition(lights.get(activeIndex), GreenState.INSTANCE);
        }
    }

    private void transition(TrafficLight light, SignalState newState) {
        LightState previous = light.getCurrentState();
        light.forceState(newState);
        notifier.publish(SignalChangeEvent.builder()
                .intersectionId(id).lightId(light.getId()).position(light.getPosition())
                .previousPhase(previous).newPhase(newState.getPhase())
                .timestamp(LocalDateTime.now())
                .build());
    }

    /**
     * Validates {@code requested} against {@code lightId}'s current phase and, if legal, applies
     * it. This is a low-level demonstration/testing hook for the legal-transition table itself —
     * unlike {@link #tick()}, it does not manage the active-light rotation, so it is only safe to
     * call when {@code lightId} is not the currently-active light (or in tests that inspect the
     * light in isolation).
     */
    public void manualTransition(int lightId, LightState requested) {
        lock.lock();
        try {
            TrafficLight light = findLight(lightId);
            LightState previous = light.getCurrentState();
            light.requestTransitionTo(requested);
            notifier.publish(SignalChangeEvent.builder()
                    .intersectionId(id).lightId(light.getId()).position(light.getPosition())
                    .previousPhase(previous)
                    .newPhase(requested)
                    .timestamp(LocalDateTime.now())
                    .build());
        } finally {
            lock.unlock();
        }
    }

    /** See the class-level javadoc for the exact override semantics. */
    public void requestEmergencyOverride(int lightId) {
        lock.lock();
        try {
            if (emergencyActive) {
                throw new InvalidOverrideException("Intersection " + id
                        + " already has an active emergency override for light " + emergencyLightId + ".");
            }
            TrafficLight target = findLight(lightId);
            for (TrafficLight light : lights) {
                transition(light, light == target ? GreenState.INSTANCE : RedState.INSTANCE);
            }
            activeIndex = lights.indexOf(target);
            emergencyActive = true;
            emergencyLightId = lightId;
        } finally {
            lock.unlock();
        }
    }

    /** See the class-level javadoc for the exact resume semantics. */
    public void resumeNormalOperation() {
        lock.lock();
        try {
            if (!emergencyActive) {
                throw new InvalidOverrideException("Intersection " + id + " has no active emergency override to resume from.");
            }
            TrafficLight overridden = lights.get(activeIndex);
            transition(overridden, YellowState.INSTANCE);
            emergencyActive = false;
            emergencyLightId = null;
        } finally {
            lock.unlock();
        }
    }

    private TrafficLight findLight(int lightId) {
        return lights.stream()
                .filter(l -> l.getId() == lightId)
                .findFirst()
                .orElseThrow(() -> new SignalNotFoundException(
                        "No light with id " + lightId + " at intersection " + id + "."));
    }
}
