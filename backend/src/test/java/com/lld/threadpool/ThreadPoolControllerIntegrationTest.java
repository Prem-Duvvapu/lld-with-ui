package com.lld.threadpool;

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
 * RCA-049 found missing everywhere in this backend. {@code PoolStats} and {@code SubmitResult}
 * are plain records with no internal lock/queue/worker object reachable through them; these tests
 * confirm that holds in practice, not just in the class design.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ThreadPoolControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/threadpool/pools serializes both seeded demo pools cleanly")
    void listPoolsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/threadpool/pools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].poolId").exists())
                .andExpect(jsonPath("$[0].rejectionPolicy").exists())
                .andExpect(jsonPath("$[0].currentWorkerCount").exists());
    }

    @Test
    @DisplayName("GET /api/threadpool/{poolId}/stats against a seeded pool returns 200 and no leaked internals")
    void getStatsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/threadpool/web-server-pool/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.poolId").value("web-server-pool"))
                .andExpect(jsonPath("$.lock").doesNotExist())
                .andExpect(jsonPath("$.queue").doesNotExist())
                .andExpect(jsonPath("$.workers").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/threadpool/{poolId}/stats against an unknown pool is 404 with a readable reason")
    void getStatsUnknownPoolIs404() throws Exception {
        mockMvc.perform(get("/api/threadpool/no-such-pool/stats"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PoolNotFoundException"))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("POST /api/threadpool/{poolId}/submit against a seeded pool returns 200 and an accepted result")
    void submitOnSeededPoolSucceeds() throws Exception {
        mockMvc.perform(post("/api/threadpool/batch-worker-pool/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskName\":\"integration-test-task\",\"durationMillis\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskName").value("integration-test-task"))
                .andExpect(jsonPath("$.outcome").exists());
    }

    @Test
    @DisplayName("POST /api/threadpool/{poolId}/resize with an invalid config is 400, not a bare 500")
    void resizeWithInvalidConfigIs400() throws Exception {
        mockMvc.perform(post("/api/threadpool/web-server-pool/resize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"corePoolSize\":9,\"maxPoolSize\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidPoolConfigException"));
    }

    @Test
    @DisplayName("The full /sim/* flow (reset, submit, release, shutdown, snapshot) serializes cleanly end to end")
    void simFlowSerializesCleanly() throws Exception {
        mockMvc.perform(post("/api/threadpool/sim/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.poolId").value("sim-pool"));

        mockMvc.perform(post("/api/threadpool/sim/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events[0].eventType").exists());

        mockMvc.perform(post("/api/threadpool/sim/release")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":7}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/threadpool/sim/shutdown"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.shuttingDown").value(true));

        mockMvc.perform(get("/api/threadpool/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.currentWorkerCount").exists())
                .andExpect(jsonPath("$.events").isArray());

        mockMvc.perform(get("/api/threadpool/sim/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
