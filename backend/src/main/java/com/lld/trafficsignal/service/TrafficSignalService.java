package com.lld.trafficsignal.service;

import com.lld.trafficsignal.clock.ManualSignalTicker;
import com.lld.trafficsignal.clock.ScheduledExecutorSignalTicker;
import com.lld.trafficsignal.clock.SignalTicker;
import com.lld.trafficsignal.config.TrafficSignalInitializer;
import com.lld.trafficsignal.exception.IntersectionNotFoundException;
import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.SimEvent;
import com.lld.trafficsignal.observer.InAppSignalObserver;
import com.lld.trafficsignal.observer.SignalChangeEvent;
import com.lld.trafficsignal.repository.TrafficRepository;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Facade the controller delegates to wholesale. Owns one production {@link Intersection}
 * (auto-ticking on a real {@link SignalTicker}) plus every extra intersection
 * {@link TrafficSignalInitializer} seeds, and a completely separate isolated sandbox
 * intersection for the {@code /sim/*} engine, driven by a {@link ManualSignalTicker} that only
 * advances when a demo step explicitly asks it to — the sandbox is rebuilt from scratch on every
 * {@link #simReset()}, so a demo run can never leak into another and never touches the
 * production {@link TrafficRepository}.
 */
@Service
public class TrafficSignalService {
    private final TrafficRepository repository;
    private final SignalTicker productionTicker;
    private final Intersection mainIntersection;

    // Isolated Simulation Sandbox
    private volatile Intersection simIntersection;
    private final ManualSignalTicker simTicker = new ManualSignalTicker();
    private final InAppSignalObserver simEventLog = new InAppSignalObserver();
    private final List<SimEvent> simEvents = new CopyOnWriteArrayList<>();
    private final AtomicInteger simEventIdGen = new AtomicInteger(1);

    private static final List<String> FOUR_WAY = List.of("North", "South", "East", "West");

    @Autowired
    public TrafficSignalService(TrafficRepository repository) {
        this(repository, new ScheduledExecutorSignalTicker());
    }

    /** Test-support constructor: pass a {@link ManualSignalTicker} to drive production timing
     *  deterministically with no real thread involved. */
    public TrafficSignalService(TrafficRepository repository, SignalTicker productionTicker) {
        this.repository = repository;
        this.productionTicker = productionTicker;

        this.mainIntersection = TrafficSignalInitializer.buildFourWayIntersection(
                repository.nextIntersectionId(), "Main Street & 1st Ave", FOUR_WAY);
        repository.save(mainIntersection);
        productionTicker.scheduleEverySecond(mainIntersection::tick);

        this.simIntersection = TrafficSignalInitializer.buildFourWayIntersection(-1, "SIM Intersection", FOUR_WAY);
        this.simIntersection.getNotifier().registerObserver(simEventLog);
        // Bound through the field (not a captured value) so a later simReset() reassignment of
        // simIntersection is picked up automatically — no need to re-register on every reset.
        simTicker.scheduleEverySecond(() -> simIntersection.tick());
    }

    @PreDestroy
    public void shutdown() {
        if (productionTicker instanceof ScheduledExecutorSignalTicker realTicker) {
            realTicker.shutdown();
        }
    }

    public Intersection getMainIntersection() {
        return mainIntersection;
    }

    public Intersection getSimIntersection() {
        return simIntersection;
    }

    // =========================================================================
    // PRODUCTION OPERATIONS
    // =========================================================================

    public List<Intersection> listIntersections() {
        return repository.findAll();
    }

    public Intersection getIntersection(int id) {
        Intersection intersection = repository.find(id);
        if (intersection == null) {
            throw new IntersectionNotFoundException("No intersection with id " + id + ".");
        }
        return intersection;
    }

    public Intersection createIntersection(String name, List<String> positions) {
        Intersection intersection = TrafficSignalInitializer.buildFourWayIntersection(
                repository.nextIntersectionId(), name, positions);
        repository.save(intersection);
        productionTicker.scheduleEverySecond(intersection::tick);
        return intersection;
    }

    public Intersection requestEmergencyOverride(int intersectionId, int lightId) {
        Intersection intersection = getIntersection(intersectionId);
        intersection.requestEmergencyOverride(lightId);
        return intersection;
    }

    public Intersection resumeNormalOperation(int intersectionId) {
        Intersection intersection = getIntersection(intersectionId);
        intersection.resumeNormalOperation();
        return intersection;
    }

    public Intersection manualTransition(int intersectionId, int lightId, LightState requested) {
        Intersection intersection = getIntersection(intersectionId);
        intersection.manualTransition(lightId, requested);
        return intersection;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized Map<String, Object> simReset() {
        simEvents.clear();
        simEventIdGen.set(1);
        simEventLog.clear();

        Intersection fresh = TrafficSignalInitializer.buildFourWayIntersection(-1, "SIM Intersection", FOUR_WAY);
        fresh.getNotifier().registerObserver(simEventLog);
        this.simIntersection = fresh;

        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(1).eventType("INITIALIZE").status("SUCCESS")
                .title("Intersection Cold Boot")
                .description("SIM Intersection initialized with 4 signal heads (North/South/East/West). North starts GREEN, the rest RED.")
                .build()
                .addDetail("activeLight", "North");
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simTick(int seconds, int step) {
        simTicker.advance(seconds);
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("TICK").status("INFO")
                .title("Clock Advanced +" + seconds + "s")
                .description("Ticker fired " + seconds + " time(s). Active light: " + activeLightSummary())
                .build();
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simEmergencyOverride(int lightId, int step) {
        try {
            simIntersection.requestEmergencyOverride(lightId);
            SimEvent event = SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("EMERGENCY_OVERRIDE").status("WARNING")
                    .title("Emergency Override Engaged")
                    .description("Light " + lightId + " forced GREEN; every other light forced RED; normal cycling frozen.")
                    .build()
                    .addDetail("lightId", lightId);
            simEvents.add(event);
        } catch (RuntimeException ex) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("EMERGENCY_OVERRIDE_ERROR").status("ERROR")
                    .title("Emergency Override Rejected")
                    .description(ex.getMessage())
                    .build());
            throw ex;
        }
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simResume(int step) {
        simIntersection.resumeNormalOperation();
        SimEvent event = SimEvent.builder()
                .id("EV-" + simEventIdGen.getAndIncrement())
                .stepNumber(step).eventType("RESUME_NORMAL").status("SUCCESS")
                .title("Normal Cycling Resumed")
                .description("Override cleared. The overridden light moved GREEN -> YELLOW and ordinary ticking continues from there.")
                .build();
        simEvents.add(event);
        return getSimSnapshot();
    }

    public synchronized Map<String, Object> simManualTransition(int lightId, LightState requested, int step) {
        try {
            simIntersection.manualTransition(lightId, requested);
            SimEvent event = SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("MANUAL_TRANSITION").status("SUCCESS")
                    .title("Manual Transition Applied")
                    .description("Light " + lightId + " moved to " + requested + ".")
                    .build();
            simEvents.add(event);
        } catch (RuntimeException ex) {
            simEvents.add(SimEvent.builder()
                    .id("EV-" + simEventIdGen.getAndIncrement())
                    .stepNumber(step).eventType("ILLEGAL_TRANSITION_REJECTED").status("ERROR")
                    .title("Illegal Transition Rejected")
                    .description(ex.getMessage())
                    .build());
            throw ex;
        }
        return getSimSnapshot();
    }

    public List<SimEvent> simGetEvents() {
        return List.copyOf(simEvents);
    }

    public List<SignalChangeEvent> simGetPhaseChangeLog() {
        return simEventLog.recentEvents();
    }

    public Map<String, Object> getSimSnapshot() {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("intersection", simIntersection);
        snapshot.put("events", List.copyOf(simEvents));
        snapshot.put("phaseChangeLog", simEventLog.recentEvents());
        return snapshot;
    }

    private String activeLightSummary() {
        var active = simIntersection.getLights().get(simIntersection.getActiveIndex());
        return active.getPosition() + " (" + active.getCurrentState() + ", " + active.getTimer() + "s left)";
    }
}
