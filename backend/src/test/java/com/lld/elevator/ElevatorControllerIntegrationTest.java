package com.lld.elevator;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for RCA-049's follow-up finding: {@link com.lld.elevator.model.Elevator}
 * exposed its internal {@code ReentrantLock} via a public getter with no {@code @JsonIgnore},
 * so every {@code GET /api/elevator/elevators} response leaked the lock's raw concurrency state
 * (locked/fair/queueLength/heldByCurrentThread) into the JSON body. Unlike traffic-signal's
 * {@code SignalChangeNotifier} (zero bean-visible properties, so Jackson threw), a
 * {@code ReentrantLock} genuinely has bean-style getters, so this didn't 500 — it just quietly
 * leaked internal state to every client. Asserts the lock field is absent from the response.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ElevatorControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/elevator/elevators does not leak the elevator's internal lock")
    void listElevatorsDoesNotLeakLock() throws Exception {
        mockMvc.perform(get("/api/elevator/elevators"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].lock").doesNotExist());
    }
}
