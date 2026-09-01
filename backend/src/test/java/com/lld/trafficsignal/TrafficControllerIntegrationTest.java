package com.lld.trafficsignal;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for RCA-049: every {@code trafficsignal} test elsewhere in this package
 * calls {@link com.lld.trafficsignal.service.TrafficSignalService} directly and asserts on the
 * returned Java objects, so none of them ever round-trip an {@link com.lld.trafficsignal.model.Intersection}
 * through Spring MVC + Jackson the way a real client does. That blind spot let
 * {@code Intersection.getNotifier()} — a getter returning a bean-property-less
 * {@link com.lld.trafficsignal.observer.SignalChangeNotifier} — reach Jackson and throw
 * {@code InvalidDefinitionException} on every non-void endpoint, invisibly to the rest of the
 * suite. These tests exercise the real HTTP + JSON-serialization path so a future getter added to
 * a serialized response body without a Jackson-visible shape fails here instead of in the browser.
 */
@SpringBootTest
@AutoConfigureMockMvc
class TrafficControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/traffic/status serializes the main intersection without a Jackson error")
    void statusSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/traffic/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.lights").isArray())
                .andExpect(jsonPath("$.lights[0].position").exists())
                .andExpect(jsonPath("$.lights[0].currentState").exists())
                .andExpect(jsonPath("$.notifier").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/traffic/intersections serializes the full list without a Jackson error")
    void listIntersectionsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/traffic/intersections"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].lights").isArray());
    }

    @Test
    @DisplayName("GET /api/traffic/sim/snapshot serializes the sim intersection without a Jackson error")
    void simSnapshotSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/traffic/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intersection.lights").isArray())
                .andExpect(jsonPath("$.intersection.notifier").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/traffic/transition forces an immediate phase advance, matching the "
            + "'Cycle' / 'Next Signal Phase Cycle' button label — not a mere one-second decrement")
    void transitionForcesImmediatePhaseAdvance() throws Exception {
        String before = mockMvc.perform(get("/api/traffic/status"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        int activeIndex = JsonPath.read(before, "$.activeIndex");
        String phaseBefore = JsonPath.read(before, "$.lights[" + activeIndex + "].currentState");

        String after = mockMvc.perform(post("/api/traffic/transition"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String phaseAfter = JsonPath.read(after, "$.lights[" + activeIndex + "].currentState");

        assertNotEquals(phaseBefore, phaseAfter,
                "a single POST /transition must complete the active light's current phase "
                        + "immediately, regardless of how much of its countdown remained");
    }
}
