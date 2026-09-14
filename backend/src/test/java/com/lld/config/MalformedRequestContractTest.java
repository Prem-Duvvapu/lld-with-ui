package com.lld.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * A caller who sends a body missing a required field, or with a field of the wrong type,
 * has made a client error. It must come back as 4xx with a message saying which field is
 * wrong — not as a 500.
 *
 * <p>299 of this codebase's 360 {@code @RequestBody} parameters are raw
 * {@code Map<String, Object>}, read with unchecked casts like
 * {@code ((Number) body.get("amount")).doubleValue()}. A missing key made that a
 * NullPointerException and a string made it a ClassCastException; neither is a
 * DomainException, so both fell through to Spring's default handler as HTTP 500 —
 * indistinguishable, to the caller, from the server being broken.
 *
 * <p>Bean Validation cannot help here: {@code @Valid} has nothing to validate on a raw
 * Map. {@link RequestFields} does the same job at the same boundary, throwing
 * IllegalArgumentException (already mapped to 400) with the field name in the message.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MalformedRequestContractTest {

    @Autowired
    private MockMvc mockMvc;

    private MvcResult postJson(String path, String json) throws Exception {
        return mockMvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json)).andReturn();
    }

    @Test
    @DisplayName("a missing required field is a 400 naming the field, not a 500")
    void missingFieldIsBadRequest() throws Exception {
        MvcResult result = postJson("/api/splitwise/expenses", "{\"description\":\"Dinner\"}");

        assertThat(result.getResponse().getStatus())
                .as("missing 'amount' must not surface as a server error")
                .isEqualTo(400);
        assertThat(result.getResponse().getContentAsString()).contains("amount");
    }

    @Test
    @DisplayName("a field of the wrong type is a 400 naming the field, not a 500")
    void wrongTypeIsBadRequest() throws Exception {
        MvcResult result = postJson(
                "/api/splitwise/expenses",
                "{\"description\":\"Dinner\",\"amount\":\"not-a-number\",\"paidBy\":1,\"groupId\":1,\"splits\":[]}");

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(result.getResponse().getContentAsString()).contains("amount");
    }

    @Test
    @DisplayName("a missing required list is a 400, not an NPE inside a stream")
    void missingListIsBadRequest() throws Exception {
        MvcResult result = postJson("/api/splitwise/groups", "{\"name\":\"Trip\"}");

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(result.getResponse().getContentAsString()).contains("memberIds");
    }

    @Test
    @DisplayName("syntactically invalid JSON is a 400 in the shared error shape")
    void malformedJsonIsBadRequest() throws Exception {
        MvcResult result = postJson("/api/splitwise/users", "{not valid json");

        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        // The shared ErrorResponse contract, not Spring's default body.
        assertThat(result.getResponse().getContentAsString()).contains("\"error\"");
    }
}
