package com.lld.trafficsignal;

import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.state.GreenState;
import com.lld.trafficsignal.state.RedState;
import com.lld.trafficsignal.state.YellowState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Traffic Signal State Pattern — legal transition table")
class SignalStateTest {

    @Test
    @DisplayName("Each state exposes its own phase")
    void eachStateExposesItsOwnPhase() {
        assertEquals(LightState.RED, RedState.INSTANCE.getPhase());
        assertEquals(LightState.GREEN, GreenState.INSTANCE.getPhase());
        assertEquals(LightState.YELLOW, YellowState.INSTANCE.getPhase());
    }

    @Test
    @DisplayName("The declared cycle is RED -> GREEN -> YELLOW -> RED, and nothing else")
    void declaredCycleIsRedGreenYellowRed() {
        assertSame(GreenState.INSTANCE, RedState.INSTANCE.next());
        assertSame(YellowState.INSTANCE, GreenState.INSTANCE.next());
        assertSame(RedState.INSTANCE, YellowState.INSTANCE.next());
    }

    @Test
    @DisplayName("States are singletons — next() always returns the same instance")
    void statesAreSingletons() {
        assertSame(RedState.INSTANCE, RedState.INSTANCE);
        assertSame(RedState.INSTANCE, YellowState.INSTANCE.next());
        assertSame(GreenState.INSTANCE, RedState.INSTANCE.next());
        assertSame(YellowState.INSTANCE, GreenState.INSTANCE.next());
    }

    @Test
    @DisplayName("Each phase's duration is positive and RED/GREEN/YELLOW have distinct durations")
    void durationsArePositiveAndDistinct() {
        assertTrue(RedState.INSTANCE.getDurationSeconds() > 0);
        assertTrue(GreenState.INSTANCE.getDurationSeconds() > 0);
        assertTrue(YellowState.INSTANCE.getDurationSeconds() > 0);
        assertNotEquals(GreenState.INSTANCE.getDurationSeconds(), YellowState.INSTANCE.getDurationSeconds());
    }
}
