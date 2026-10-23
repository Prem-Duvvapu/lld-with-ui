package com.lld.kvstore;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lld.config.GlobalExceptionHandler;
import com.lld.kvstore.controller.KvStoreController;
import com.lld.kvstore.repository.KvStoreRepository;
import com.lld.kvstore.service.KvStoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controller/service/repository and JSON serialization, with no application server. */
class KvStoreControllerIntegrationTest {
    private MockMvc http;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        http = MockMvcBuilders.standaloneSetup(new KvStoreController(new KvStoreService(new KvStoreRepository())))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void liveCasAndDeletePreserveVersionAndTypedErrorContracts() throws Exception {
        http.perform(put("/api/kvstore/key").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"seed\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.value").value("seed"));
        http.perform(post("/api/kvstore/key/cas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedVersion\":1,\"newValue\":\"latest\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
        http.perform(post("/api/kvstore/key/cas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expectedVersion\":1,\"newValue\":\"rejected\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").isString()).andExpect(jsonPath("$.code").isString());
        http.perform(get("/api/kvstore/key")).andExpect(status().isOk())
                .andExpect(jsonPath("$.value").value("latest")).andExpect(jsonPath("$.version").value(2));
        http.perform(delete("/api/kvstore/key")).andExpect(status().isOk());
        http.perform(get("/api/kvstore/key")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404)).andExpect(jsonPath("$.code").isString());
    }

    @Test
    void serializedSandboxSnapshotsMatchReplayAndResetWithoutChangingLiveState() throws Exception {
        http.perform(put("/api/kvstore/live").contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":\"untouched\"}")).andExpect(status().isOk());
        http.perform(put("/api/kvstore/sim/key").contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":\"first\",\"ttlSeconds\":60}")).andExpect(status().isOk());
        String beforeBody = http.perform(put("/api/kvstore/sim/key").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\":\"second\",\"ttlSeconds\":60}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.walSize").value(2))
                .andExpect(jsonPath("$.wal.length()").value(2)).andReturn().getResponse().getContentAsString();
        String afterBody = http.perform(post("/api/kvstore/sim/replay"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var before = json.readTree(beforeBody);
        var after = json.readTree(afterBody);
        assertEquals(before.get("entries"), after.get("entries"));
        assertEquals(before.get("wal"), after.get("wal"));
        assertEquals(2, after.get("walSize").asInt());
        assertEquals(3, after.get("entries").get("key").size(), "no lock or internal state in entry JSON");
        http.perform(post("/api/kvstore/sim/reset")).andExpect(status().isOk())
                .andExpect(jsonPath("$.entries").isEmpty()).andExpect(jsonPath("$.wal").isEmpty())
                .andExpect(jsonPath("$.walSize").value(0));
        http.perform(get("/api/kvstore/live")).andExpect(status().isOk())
                .andExpect(jsonPath("$.value").value("untouched"));
    }
}
