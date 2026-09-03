package com.lld.circuitbreaker;

import com.lld.circuitbreaker.exception.CircuitOpenException;
import com.lld.circuitbreaker.exception.UnknownServiceException;
import com.lld.circuitbreaker.model.CallOutcome;
import com.lld.circuitbreaker.model.CircuitBreaker;
import com.lld.circuitbreaker.model.CircuitPhase;
import com.lld.circuitbreaker.model.SimEvent;
import com.lld.circuitbreaker.service.CircuitBreakerService;
import com.lld.circuitbreaker.strategy.ConsecutiveFailureTripPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CircuitBreakerService — the facade the controller delegates to, live registry and isolated /sim/* sandbox")
class CircuitBreakerServiceTest {

    private CircuitBreakerService service;

    @BeforeEach
    void setUp() {
        service = new CircuitBreakerService();
    }

    @Test
    @DisplayName("registerService() makes a breaker visible through listServices()")
    void registerServiceIsListed() {
        service.registerService("checkout", new ConsecutiveFailureTripPolicy(3), 1_000L, 10);
        List<CircuitBreaker> services = service.listServices();
        assertEquals(1, services.size());
        assertEquals("checkout", services.get(0).getName());
        assertEquals(CircuitPhase.CLOSED, services.get(0).getPhase());
    }

    @Test
    @DisplayName("getService() on an unregistered name throws UnknownServiceException")
    void getServiceUnknownThrows() {
        assertThrows(UnknownServiceException.class, () -> service.getService("nope"));
    }

    @Test
    @DisplayName("call() delegates to the named breaker and reflects its outcome")
    void callDelegatesToBreaker() {
        service.registerService("checkout", new ConsecutiveFailureTripPolicy(1), 1_000L, 10);
        CallOutcome outcome = service.call("checkout", false);

        assertFalse(outcome.getCallSucceeded());
        assertEquals(CircuitPhase.OPEN, outcome.getPhase());
    }

    @Test
    @DisplayName("call() on an unregistered service throws UnknownServiceException")
    void callUnknownServiceThrows() {
        assertThrows(UnknownServiceException.class, () -> service.call("nope", true));
    }

    @Test
    @DisplayName("call() while OPEN throws CircuitOpenException")
    void callWhileOpenThrows() {
        service.registerService("checkout", new ConsecutiveFailureTripPolicy(1), 60_000L, 10);
        service.call("checkout", false); // trips it OPEN
        assertThrows(CircuitOpenException.class, () -> service.call("checkout", true));
    }

    @Test
    @DisplayName("reset() replaces the breaker with a fresh CLOSED one, same policy and cooldown")
    void resetGivesFreshBreaker() {
        service.registerService("checkout", new ConsecutiveFailureTripPolicy(1), 1_000L, 10);
        service.call("checkout", false); // trips it OPEN

        CircuitBreaker fresh = service.reset("checkout");
        assertEquals(CircuitPhase.CLOSED, fresh.getPhase());
        assertEquals(0, fresh.getConsecutiveFailures());
    }

    // =========================================================================
    // Isolated /sim/* engine
    // =========================================================================

    @Test
    @DisplayName("simReset() seeds a fresh CLOSED sandbox breaker and logs an INITIALIZE event")
    void simResetSeedsFreshBreaker() {
        Map<String, Object> snapshot = service.simReset();
        CircuitBreaker sim = (CircuitBreaker) snapshot.get("breaker");
        assertEquals(CircuitBreakerService.SIM_SERVICE_NAME, sim.getName());
        assertEquals(CircuitPhase.CLOSED, sim.getPhase());

        List<SimEvent> events = service.simGetEvents();
        assertEquals(1, events.size());
        assertEquals("INITIALIZE", events.get(0).getEventType());
    }

    @Test
    @DisplayName("simCall() applies the outcome to the sandbox breaker and logs an event, independent of the live registry")
    void simCallAffectsOnlySandbox() {
        service.registerService("checkout", new ConsecutiveFailureTripPolicy(3), 1_000L, 10);
        service.simCall(false, 2);

        // Sandbox breaker reflects the call...
        CircuitBreaker sim = (CircuitBreaker) service.getSimSnapshot().get("breaker");
        assertEquals(1, sim.getConsecutiveFailures());
        // ...but the live "checkout" breaker registered above is completely untouched.
        assertEquals(0, service.getService("checkout").getConsecutiveFailures());
    }

    @Test
    @DisplayName("simCall() rejection while sandbox OPEN is logged as CALL_REJECTED, not thrown to the caller")
    void simCallRejectionIsLoggedNotThrown() {
        // Trip the sandbox breaker (threshold 3, per simReset()).
        service.simCall(false, 2);
        service.simCall(false, 3);
        service.simCall(false, 4);
        // Fourth call: still within cooldown, must be rejected — and simCall must not throw.
        assertDoesNotThrow(() -> service.simCall(true, 5));

        List<SimEvent> events = service.simGetEvents();
        assertEquals("CALL_REJECTED", events.get(events.size() - 1).getEventType());
    }

    @Test
    @DisplayName("simAdvanceClock() moves the sandbox's ManualClock forward, logged as an event")
    void simAdvanceClockLogsEvent() {
        service.simAdvanceClock(5_000L, 2);
        List<SimEvent> events = service.simGetEvents();
        assertEquals("CLOCK_ADVANCED", events.get(events.size() - 1).getEventType());
    }

    @Test
    @DisplayName("getSimSnapshot() carries both the breaker and the full event log")
    void simSnapshotCarriesBreakerAndEvents() {
        service.simCall(false, 2);
        Map<String, Object> snapshot = service.getSimSnapshot();
        assertNotNull(snapshot.get("breaker"));
        assertFalse(((List<?>) snapshot.get("events")).isEmpty());
    }
}
