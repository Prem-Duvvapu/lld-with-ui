package com.lld.circuitbreaker;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A real HTTP + JSON-serialization round trip through the real Spring context — per RCA-049
 * (traffic-signal returned 500 on every endpoint because a getter reached Jackson with no
 * bean-visible properties, and no test anywhere caught it because every other trafficsignal test
 * called the service layer directly). Also asserts {@code lock} and {@code clock} — the two
 * internal-wiring fields on {@code CircuitBreaker} — never leak into a response body, the same
 * check that would have caught RCA-049's own follow-up finding in Elevator/Member.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CircuitBreakerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/circuitbreaker/services serializes every seeded breaker without a Jackson error, and leaks no internal wiring")
    void listServicesSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/circuitbreaker/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].phase").exists())
                .andExpect(jsonPath("$[0].tripPolicy").exists())
                .andExpect(jsonPath("$[0].lock").doesNotExist())
                .andExpect(jsonPath("$[0].clock").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/circuitbreaker/{serviceName}/state returns the seeded payment-service breaker")
    void getStateReturnsSeededService() throws Exception {
        mockMvc.perform(get("/api/circuitbreaker/payment-service/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("payment-service"))
                .andExpect(jsonPath("$.phase").value("CLOSED"));
    }

    @Test
    @DisplayName("GET /api/circuitbreaker/{serviceName}/state for an unknown service is 404 with a readable reason")
    void getStateUnknownServiceIs404() throws Exception {
        mockMvc.perform(get("/api/circuitbreaker/does-not-exist/state"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists())
                .andExpect(jsonPath("$.code").value("UnknownServiceException"));
    }

    @Test
    @DisplayName("POST /api/circuitbreaker/{serviceName}/call succeeds and serializes a CallOutcome")
    void callSucceedsAndSerializes() throws Exception {
        mockMvc.perform(post("/api/circuitbreaker/notification-service/call")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"simulateSuccess\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceName").value("notification-service"))
                .andExpect(jsonPath("$.attempted").value(true))
                .andExpect(jsonPath("$.callSucceeded").value(true))
                .andExpect(jsonPath("$.phase").value("CLOSED"));
    }

    @Test
    @DisplayName("POST .../call enough times to trip a breaker, then the next call is 409 Conflict")
    void callUntilOpenThenRejected() throws Exception {
        // inventory-service uses FailureRateTripPolicy(0.5, 4) — 4 failures reaches 100% >= 50%.
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/circuitbreaker/inventory-service/call")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"simulateSuccess\": false}"));
        }
        mockMvc.perform(get("/api/circuitbreaker/inventory-service/state"))
                .andExpect(jsonPath("$.phase").value("OPEN"));

        mockMvc.perform(post("/api/circuitbreaker/inventory-service/call")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"simulateSuccess\": true}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CircuitOpenException"));
    }

    @Test
    @DisplayName("POST .../reset returns the service to CLOSED")
    void resetReturnsToClosedState() throws Exception {
        mockMvc.perform(post("/api/circuitbreaker/notification-service/call")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"simulateSuccess\": false}"));

        mockMvc.perform(post("/api/circuitbreaker/notification-service/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phase").value("CLOSED"))
                .andExpect(jsonPath("$.consecutiveFailures").value(0));
    }

    @Test
    @DisplayName("The isolated /sim/* engine reset -> call -> snapshot round trip serializes cleanly")
    void simEngineRoundTripSerializesCleanly() throws Exception {
        mockMvc.perform(post("/api/circuitbreaker/sim/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breaker.phase").value("CLOSED"))
                .andExpect(jsonPath("$.breaker.lock").doesNotExist());

        mockMvc.perform(post("/api/circuitbreaker/sim/call")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"simulateSuccess\": false, \"step\": 2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events").isArray());

        mockMvc.perform(post("/api/circuitbreaker/sim/advance-clock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"millis\": 5000, \"step\": 3}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/circuitbreaker/sim/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(3))));

        mockMvc.perform(get("/api/circuitbreaker/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breaker.name").value(com.lld.circuitbreaker.service.CircuitBreakerService.SIM_SERVICE_NAME));
    }
}
