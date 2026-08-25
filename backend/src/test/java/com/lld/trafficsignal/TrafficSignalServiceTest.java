package com.lld.trafficsignal;

import com.lld.trafficsignal.clock.ManualSignalTicker;
import com.lld.trafficsignal.exception.IllegalSignalTransitionException;
import com.lld.trafficsignal.exception.IntersectionNotFoundException;
import com.lld.trafficsignal.exception.InvalidOverrideException;
import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.SimEvent;
import com.lld.trafficsignal.repository.TrafficRepository;
import com.lld.trafficsignal.service.TrafficSignalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Service-level tests. Uses the test-support constructor with a {@link ManualSignalTicker} for
 * production timing, so every timed-transition assertion is driven by explicit {@code advance()}
 * calls — no real thread, no sleeping, fully deterministic.
 */
@DisplayName("TrafficSignalService")
class TrafficSignalServiceTest {

    private TrafficRepository repository;
    private ManualSignalTicker ticker;
    private TrafficSignalService service;

    @BeforeEach
    void setUp() {
        repository = new TrafficRepository();
        ticker = new ManualSignalTicker();
        service = new TrafficSignalService(repository, ticker);
    }

    @Test
    @DisplayName("Construction seeds one main intersection with 4 lights, light 0 GREEN")
    void constructionSeedsMainIntersection() {
        Intersection main = service.getMainIntersection();
        assertEquals(4, main.getLights().size());
        assertEquals(LightState.GREEN, main.getLights().get(0).getCurrentState());
        assertEquals(1, service.listIntersections().size());
    }

    @Test
    @DisplayName("getIntersection returns the intersection by id; unknown id throws IntersectionNotFoundException")
    void getIntersectionByIdOrThrows() {
        int id = service.getMainIntersection().getId();
        assertSame(service.getMainIntersection(), service.getIntersection(id));
        assertThrows(IntersectionNotFoundException.class, () -> service.getIntersection(99999));
    }

    @Test
    @DisplayName("createIntersection adds a new intersection wired to the same production ticker")
    void createIntersectionWiresToProductionTicker() {
        Intersection created = service.createIntersection("2nd & Elm", List.of("North", "South"));
        assertEquals(2, service.listIntersections().size());

        // Advancing the shared ticker must tick BOTH intersections.
        int greenDuration = created.getLights().get(0).getTimer();
        for (int i = 0; i < greenDuration; i++) {
            ticker.advance(1);
        }
        assertEquals(LightState.YELLOW, created.getLights().get(0).getCurrentState());
    }

    @Test
    @DisplayName("The production ticker drives the main intersection's timed transitions deterministically")
    void productionTickerDrivesMainIntersection() {
        Intersection main = service.getMainIntersection();
        int greenDuration = main.getLights().get(0).getTimer();

        ticker.advance(greenDuration);
        assertEquals(LightState.YELLOW, main.getLights().get(0).getCurrentState());
    }

    @Test
    @DisplayName("requestEmergencyOverride / resumeNormalOperation delegate to the intersection")
    void emergencyOverrideAndResumeDelegate() {
        Intersection main = service.getMainIntersection();
        service.requestEmergencyOverride(main.getId(), 2);
        assertTrue(main.isEmergencyActive());
        assertEquals(LightState.GREEN, main.getLights().get(2).getCurrentState());

        service.resumeNormalOperation(main.getId());
        assertFalse(main.isEmergencyActive());
        assertEquals(LightState.YELLOW, main.getLights().get(2).getCurrentState());
    }

    @Test
    @DisplayName("A second emergency override on an unknown intersection id throws IntersectionNotFoundException")
    void emergencyOverrideUnknownIntersectionThrows() {
        assertThrows(IntersectionNotFoundException.class, () -> service.requestEmergencyOverride(99999, 0));
    }

    @Test
    @DisplayName("manualTransition rejects an illegal jump through the service facade too")
    void manualTransitionRejectsIllegalJumpThroughService() {
        Intersection main = service.getMainIntersection();
        assertThrows(IllegalSignalTransitionException.class,
                () -> service.manualTransition(main.getId(), 1, LightState.YELLOW));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    @Test
    @DisplayName("simReset initializes the sandbox and records a telemetry event")
    void simResetInitializesSandbox() {
        Map<String, Object> snap = service.simReset();
        assertNotNull(snap);
        Intersection sim = service.getSimIntersection();
        assertEquals(LightState.GREEN, sim.getLights().get(0).getCurrentState());
        assertEquals(1, service.simGetEvents().size());
        assertEquals("INITIALIZE", service.simGetEvents().get(0).getEventType());
    }

    @Test
    @DisplayName("simTick advances only the sandbox — production intersection is untouched")
    void simTickNeverTouchesProduction() {
        service.simReset();
        Intersection sim = service.getSimIntersection();
        Intersection main = service.getMainIntersection();
        int mainGreenTimer = main.getLights().get(0).getTimer();

        int simGreenDuration = sim.getLights().get(0).getTimer();
        service.simTick(simGreenDuration, 2);

        assertEquals(LightState.YELLOW, sim.getLights().get(0).getCurrentState(), "sandbox must have advanced");
        assertEquals(LightState.GREEN, main.getLights().get(0).getCurrentState(), "production must be untouched");
        assertEquals(mainGreenTimer, main.getLights().get(0).getTimer(), "production's countdown must be untouched");
    }

    @Test
    @DisplayName("simReset rebuilds the sandbox from scratch — a prior demo run never leaks into the next")
    void simResetRebuildsFromScratch() {
        service.simReset();
        Intersection sim = service.getSimIntersection();
        int greenDuration = sim.getLights().get(0).getTimer();
        service.simTick(greenDuration, 2); // sim light 0 is now YELLOW

        service.simReset();
        Intersection freshSim = service.getSimIntersection();
        assertEquals(LightState.GREEN, freshSim.getLights().get(0).getCurrentState());
        assertEquals(1, service.simGetEvents().size(), "events must be cleared on reset");
    }

    @Test
    @DisplayName("simEmergencyOverride / simResume drive the sandbox and log telemetry")
    void simEmergencyOverrideAndResume() {
        service.simReset();
        service.simEmergencyOverride(3, 5);
        Intersection sim = service.getSimIntersection();
        assertTrue(sim.isEmergencyActive());
        assertEquals(LightState.GREEN, sim.getLights().get(3).getCurrentState());

        service.simResume(6);
        assertFalse(sim.isEmergencyActive());
        assertEquals(LightState.YELLOW, sim.getLights().get(3).getCurrentState());

        List<SimEvent> events = service.simGetEvents();
        assertTrue(events.stream().anyMatch(e -> "EMERGENCY_OVERRIDE".equals(e.getEventType())));
        assertTrue(events.stream().anyMatch(e -> "RESUME_NORMAL".equals(e.getEventType())));
    }

    @Test
    @DisplayName("A second simEmergencyOverride while one is active is rejected and logged as an ERROR event")
    void secondSimEmergencyOverrideRejectedAndLogged() {
        service.simReset();
        service.simEmergencyOverride(1, 5);

        assertThrows(InvalidOverrideException.class, () -> service.simEmergencyOverride(2, 5));

        List<SimEvent> events = service.simGetEvents();
        assertTrue(events.stream().anyMatch(e -> "EMERGENCY_OVERRIDE_ERROR".equals(e.getEventType()) && "ERROR".equals(e.getStatus())));
    }

    @Test
    @DisplayName("simManualTransition rejects an illegal jump and logs it as an ERROR event")
    void simManualTransitionRejectsIllegalJumpAndLogs() {
        service.simReset();
        assertThrows(IllegalSignalTransitionException.class,
                () -> service.simManualTransition(1, LightState.YELLOW, 4));

        List<SimEvent> events = service.simGetEvents();
        assertTrue(events.stream().anyMatch(e -> "ILLEGAL_TRANSITION_REJECTED".equals(e.getEventType()) && "ERROR".equals(e.getStatus())));
    }

    @Test
    @DisplayName("getSimSnapshot carries the sandbox intersection, events, and phase-change log")
    void getSimSnapshotCarriesEverything() {
        service.simReset();
        Map<String, Object> snapshot = service.getSimSnapshot();
        assertNotNull(snapshot.get("intersection"));
        assertNotNull(snapshot.get("events"));
        assertNotNull(snapshot.get("phaseChangeLog"));
    }
}
