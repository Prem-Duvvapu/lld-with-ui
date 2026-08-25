package com.lld.trafficsignal;

import com.lld.trafficsignal.exception.IllegalSignalTransitionException;
import com.lld.trafficsignal.exception.InvalidOverrideException;
import com.lld.trafficsignal.exception.SignalNotFoundException;
import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.observer.SignalChangeNotifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Intersection — timed transitions, legal-jump rejection, emergency override")
class IntersectionTest {

    private Intersection intersection;

    private Intersection freshIntersection() {
        List<TrafficLight> lights = new ArrayList<>();
        lights.add(new TrafficLight(0, "North"));
        lights.add(new TrafficLight(1, "South"));
        lights.add(new TrafficLight(2, "East"));
        lights.add(new TrafficLight(3, "West"));
        return new Intersection(1, "Test Intersection", lights, new SignalChangeNotifier());
    }

    @BeforeEach
    void setUp() {
        intersection = freshIntersection();
    }

    @Test
    @DisplayName("Fresh intersection starts with exactly light 0 GREEN and every other light RED")
    void freshIntersectionStartsWithExactlyOneGreen() {
        assertEquals(LightState.GREEN, intersection.getLights().get(0).getCurrentState());
        for (int i = 1; i < intersection.getLights().size(); i++) {
            assertEquals(LightState.RED, intersection.getLights().get(i).getCurrentState());
        }
        assertEquals(0, intersection.getActiveIndex());
    }

    @Test
    @DisplayName("Timed transition: GREEN holds for its full duration, then the SAME light goes YELLOW")
    void greenHoldsFullDurationThenGoesYellowOnSameLight() {
        TrafficLight active = intersection.getLights().get(0);
        int greenDuration = active.getTimer();

        for (int i = 0; i < greenDuration - 1; i++) {
            intersection.tick();
            assertEquals(LightState.GREEN, active.getCurrentState(), "must not transition before the duration elapses");
        }
        intersection.tick(); // the tick that expires the countdown

        assertEquals(LightState.YELLOW, active.getCurrentState());
        assertEquals(0, intersection.getActiveIndex(), "the same light stays active through YELLOW");
    }

    @Test
    @DisplayName("Timed transition: after YELLOW expires, this light goes RED and the NEXT light becomes GREEN")
    void yellowExpiryHandsGreenToNextLight() {
        TrafficLight first = intersection.getLights().get(0);
        int greenDuration = first.getTimer();
        int yellowDuration;

        for (int i = 0; i < greenDuration; i++) {
            intersection.tick();
        }
        yellowDuration = first.getTimer();
        for (int i = 0; i < yellowDuration; i++) {
            intersection.tick();
        }

        assertEquals(LightState.RED, first.getCurrentState());
        assertEquals(1, intersection.getActiveIndex());
        assertEquals(LightState.GREEN, intersection.getLights().get(1).getCurrentState());
        // every other light stays RED
        assertEquals(LightState.RED, intersection.getLights().get(2).getCurrentState());
        assertEquals(LightState.RED, intersection.getLights().get(3).getCurrentState());
    }

    @Test
    @DisplayName("A full rotation returns control to light 0, GREEN, exactly once per lap")
    void fullRotationReturnsToLightZero() {
        int totalSecondsPerLight = intersection.getLights().get(0).getTimer(); // green
        // Drive one full lap: each of the 4 lights gets a GREEN+YELLOW turn.
        for (int lap = 0; lap < 4; lap++) {
            int greenDuration = intersection.getLights().get(intersection.getActiveIndex()).getTimer();
            for (int i = 0; i < greenDuration; i++) intersection.tick();
            int yellowDuration = intersection.getLights().get((lap) % 4).getTimer();
            for (int i = 0; i < yellowDuration; i++) intersection.tick();
        }

        assertEquals(0, intersection.getActiveIndex(), "after 4 full light-turns, rotation must return to light 0");
        assertEquals(LightState.GREEN, intersection.getLights().get(0).getCurrentState());
        for (int i = 1; i < 4; i++) {
            assertEquals(LightState.RED, intersection.getLights().get(i).getCurrentState());
        }
    }

    @Test
    @DisplayName("manualTransition rejects an illegal jump and leaves the light's phase unchanged")
    void manualTransitionRejectsIllegalJump() {
        // Light 1 (South) is RED; RED's only legal next phase is GREEN, not YELLOW.
        IllegalSignalTransitionException ex = assertThrows(IllegalSignalTransitionException.class,
                () -> intersection.manualTransition(1, LightState.YELLOW));
        assertTrue(ex.getMessage().contains("South") || ex.getMessage().contains("1"));
        assertEquals(LightState.RED, intersection.getLights().get(1).getCurrentState(), "a rejected request must not mutate state");
    }

    @Test
    @DisplayName("manualTransition rejects skipping YELLOW: active GREEN light cannot jump straight to RED")
    void manualTransitionRejectsSkippingYellow() {
        assertThrows(IllegalSignalTransitionException.class, () -> intersection.manualTransition(0, LightState.RED));
        assertEquals(LightState.GREEN, intersection.getLights().get(0).getCurrentState());
    }

    @Test
    @DisplayName("manualTransition accepts the one legal next phase")
    void manualTransitionAcceptsLegalPhase() {
        intersection.manualTransition(1, LightState.GREEN); // RED -> GREEN is legal
        assertEquals(LightState.GREEN, intersection.getLights().get(1).getCurrentState());
    }

    @Test
    @DisplayName("manualTransition on an unknown light id throws SignalNotFoundException")
    void manualTransitionUnknownLightThrows() {
        assertThrows(SignalNotFoundException.class, () -> intersection.manualTransition(99, LightState.GREEN));
    }

    @Test
    @DisplayName("Emergency override forces the target light GREEN and every other light RED, freezing tick()")
    void emergencyOverrideForcesTargetGreenAndFreezesTicking() {
        intersection.requestEmergencyOverride(2); // East
        assertTrue(intersection.isEmergencyActive());
        assertEquals(2, intersection.getEmergencyLightId());
        assertEquals(LightState.GREEN, intersection.getLights().get(2).getCurrentState());
        assertEquals(LightState.RED, intersection.getLights().get(0).getCurrentState());
        assertEquals(LightState.RED, intersection.getLights().get(1).getCurrentState());
        assertEquals(LightState.RED, intersection.getLights().get(3).getCurrentState());

        // tick() must be a no-op while the override is active, however many seconds pass.
        for (int i = 0; i < 50; i++) intersection.tick();
        assertEquals(LightState.GREEN, intersection.getLights().get(2).getCurrentState());
        assertTrue(intersection.isEmergencyActive());
    }

    @Test
    @DisplayName("Emergency override on an unknown light throws SignalNotFoundException")
    void emergencyOverrideUnknownLightThrows() {
        assertThrows(SignalNotFoundException.class, () -> intersection.requestEmergencyOverride(99));
    }

    @Test
    @DisplayName("A second emergency override while one is active is rejected")
    void secondEmergencyOverrideIsRejected() {
        intersection.requestEmergencyOverride(2);
        assertThrows(InvalidOverrideException.class, () -> intersection.requestEmergencyOverride(3));
        // the first override must still be the one in force
        assertEquals(2, intersection.getEmergencyLightId());
        assertEquals(LightState.GREEN, intersection.getLights().get(2).getCurrentState());
    }

    @Test
    @DisplayName("resumeNormalOperation without an active override throws InvalidOverrideException")
    void resumeWithoutActiveOverrideThrows() {
        assertThrows(InvalidOverrideException.class, () -> intersection.resumeNormalOperation());
    }

    @Test
    @DisplayName("resumeNormalOperation moves the overridden light GREEN -> YELLOW and un-freezes ticking")
    void resumeMovesOverriddenLightToYellowAndUnfreezes() {
        intersection.requestEmergencyOverride(3); // West
        intersection.resumeNormalOperation();

        assertFalse(intersection.isEmergencyActive());
        assertNull(intersection.getEmergencyLightId());
        assertEquals(LightState.YELLOW, intersection.getLights().get(3).getCurrentState());

        // Ticking resumes: draining YELLOW's duration must send light 3 to RED and hand GREEN
        // to the next light in rotation (index (3+1)%4 = 0).
        int yellowDuration = intersection.getLights().get(3).getTimer();
        for (int i = 0; i < yellowDuration; i++) intersection.tick();

        assertEquals(LightState.RED, intersection.getLights().get(3).getCurrentState());
        assertEquals(0, intersection.getActiveIndex());
        assertEquals(LightState.GREEN, intersection.getLights().get(0).getCurrentState());
    }

    @Test
    @DisplayName("Constructing with no lights is rejected")
    void constructingWithNoLightsIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> new Intersection(1, "Empty", List.of(), new SignalChangeNotifier()));
    }
}
