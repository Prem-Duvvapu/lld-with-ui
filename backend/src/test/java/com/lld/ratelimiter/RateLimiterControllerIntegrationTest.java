package com.lld.ratelimiter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-level round trip through real Spring MVC + Jackson serialization — the flavour
 * RCA-049 found missing everywhere in this backend. Every model returned here
 * (RateLimitDecision, ClientStatus) is a plain flat DTO with no internal lock or wiring object
 * reachable through a getter, by design — these tests confirm that holds in practice, not just
 * in the class design.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RateLimiterControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/ratelimiter/clients serializes the seeded demo clients cleanly")
    void listClientsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/ratelimiter/clients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].clientId").exists())
                .andExpect(jsonPath("$[0].algorithm").exists())
                .andExpect(jsonPath("$[0].remaining").exists());
    }

    @Test
    @DisplayName("POST /api/ratelimiter/clients/{id}/request against a seeded client returns 200 and a decision")
    void attemptRequestOnSeededClientSucceeds() throws Exception {
        mockMvc.perform(post("/api/ratelimiter/clients/mobile-app/request"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientId").value("mobile-app"))
                .andExpect(jsonPath("$.allowed").exists())
                .andExpect(jsonPath("$.remaining").exists());
    }

    @Test
    @DisplayName("POST /api/ratelimiter/clients/{id}/request against an unknown client is 404 with a readable reason")
    void attemptRequestUnknownClientIs404() throws Exception {
        mockMvc.perform(post("/api/ratelimiter/clients/no-such-client/request"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ClientNotFoundException"))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("PUT /api/ratelimiter/clients/{id}/config with an invalid config is 400, not a bare 500")
    void configureWithInvalidConfigIs400() throws Exception {
        mockMvc.perform(put("/api/ratelimiter/clients/bad-client/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"algorithm\":\"TOKEN_BUCKET\",\"capacityOrLimit\":0,\"refillPerSecondOrWindowSeconds\":1.0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidRateLimitConfigException"));
    }

    @Test
    @DisplayName("The full /sim/* flow (reset, request, advance, snapshot) serializes cleanly end to end")
    void simFlowSerializesCleanly() throws Exception {
        mockMvc.perform(post("/api/ratelimiter/sim/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status.clientId").exists());

        mockMvc.perform(post("/api/ratelimiter/sim/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].eventType").exists());

        mockMvc.perform(post("/api/ratelimiter/sim/advance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seconds\":2,\"step\":3}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/ratelimiter/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status.remaining").exists())
                .andExpect(jsonPath("$.events").isArray());
    }
}
