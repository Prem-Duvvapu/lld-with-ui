package com.lld.uber;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real HTTP + JSON-serialization coverage for the {@code /api/uber/sim/*} engine — the gap the
 * audit found: every other Uber test calls {@link com.lld.uber.service.UberService} directly and
 * never round-trips a {@link com.lld.uber.model.Ride}/{@link com.lld.uber.model.Driver} through
 * Spring MVC + Jackson the way the Simulation tab's frontend actually does (RCA-049 pattern).
 */
@SpringBootTest
@AutoConfigureMockMvc
class UberControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/uber/rides and /drivers serialize cleanly")
    void liveEndpointsSerializeCleanly() throws Exception {
        mockMvc.perform(get("/api/uber/rides")).andExpect(status().isOk());
        mockMvc.perform(get("/api/uber/drivers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists());
    }

    @Test
    @DisplayName("POST /api/uber/sim/reset serializes the sandbox snapshot cleanly, with no leaked lock")
    void simResetSerializesCleanly() throws Exception {
        mockMvc.perform(post("/api/uber/sim/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drivers").isArray())
                .andExpect(jsonPath("$.drivers.length()").value(3))
                .andExpect(jsonPath("$.rider.id").exists())
                .andExpect(jsonPath("$.drivers[0].lock").doesNotExist())
                .andExpect(jsonPath("$.rider.lock").doesNotExist());
    }

    @Test
    @DisplayName("walking all 8 sim steps returns 200 at each step and ends with a COMPLETED ride")
    void fullSimWalkthroughSucceeds() throws Exception {
        mockMvc.perform(post("/api/uber/sim/reset")).andExpect(status().isOk());

        mockMvc.perform(post("/api/uber/sim/estimate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estimate.fare").exists());

        String requestResponse = mockMvc.perform(post("/api/uber/sim/request"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.broadcastTo").isArray())
                .andReturn().getResponse().getContentAsString();
        assertEquals(2, ((java.util.List<?>) JsonPath.read(requestResponse, "$.broadcastTo")).size());

        String raceResponse = mockMvc.perform(post("/api/uber/sim/race"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("ACCEPTED"))
                .andReturn().getResponse().getContentAsString();
        String winnerId = JsonPath.read(raceResponse, "$.winnerDriverId");
        String loserId = JsonPath.read(raceResponse, "$.loserDriverId");
        assertNotEquals(winnerId, loserId);

        String rideOtp = JsonPath.read(raceResponse, "$.ride.otp");

        mockMvc.perform(post("/api/uber/sim/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otp\":\"0000\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(false));

        mockMvc.perform(post("/api/uber/sim/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otp\":\"" + rideOtp + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(true))
                .andExpect(jsonPath("$.ride.status").value("ONGOING"));

        mockMvc.perform(post("/api/uber/sim/arrive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("PAYMENT_PENDING"));

        mockMvc.perform(post("/api/uber/sim/complete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("COMPLETED"))
                .andExpect(jsonPath("$.ride.payment.status").value("COMPLETED"));

        mockMvc.perform(get("/api/uber/sim/events"))
                .andExpect(status().isOk())
                // reset, estimate, request, race, otp(wrong), otp(correct), arrive, complete
                .andExpect(jsonPath("$.length()").value(8));

        mockMvc.perform(get("/api/uber/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ride.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("acting out of order returns a domain 404, not a raw 500")
    void actingOutOfOrderIsADomainError() throws Exception {
        mockMvc.perform(post("/api/uber/sim/reset")).andExpect(status().isOk());
        mockMvc.perform(post("/api/uber/sim/race"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }
}
