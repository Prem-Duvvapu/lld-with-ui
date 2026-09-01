package com.lld.library;

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
 * Regression coverage for RCA-049's follow-up finding: {@link com.lld.library.model.Member}
 * exposed its internal {@code ReentrantLock} via a public getter with no {@code @JsonIgnore},
 * so every {@code GET /api/library/members} response leaked the lock's raw concurrency state
 * into the JSON body. Asserts the lock field is absent from the response.
 */
@SpringBootTest
@AutoConfigureMockMvc
class LibraryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/library/members does not leak a member's internal lock")
    void listMembersDoesNotLeakLock() throws Exception {
        mockMvc.perform(get("/api/library/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].lock").doesNotExist());
    }
}
