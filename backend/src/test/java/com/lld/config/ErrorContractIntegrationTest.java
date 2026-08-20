package com.lld.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The unit tests prove the handler maps correctly; this proves it is actually
 * registered and reached through the real MVC stack. Without the advice these
 * requests returned 500 with an empty message, which is what the UI surfaced as
 * "HTTP 500 Internal Server Error".
 */
@SpringBootTest
@AutoConfigureMockMvc
class ErrorContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("an unknown flight is 404 with a readable reason, not a bare 500")
    void unknownFlightIs404() throws Exception {
        mockMvc.perform(get("/api/airline/flights/NO-SUCH-FLIGHT"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Flight not found with ID: NO-SUCH-FLIGHT"))
                .andExpect(jsonPath("$.code").value("FlightNotFoundException"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("an unknown stock symbol is 404 with a readable reason")
    void unknownStockIs404() throws Exception {
        mockMvc.perform(get("/api/stockbroker/stocks/NOPE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("StockNotFoundException"))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("an unknown library member is 404 with a readable reason")
    void unknownMemberIs404() throws Exception {
        mockMvc.perform(get("/api/library/members/NO-SUCH-MEMBER"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("the error body always carries a non-empty reason")
    void bodyAlwaysHasAReason() throws Exception {
        mockMvc.perform(get("/api/airline/flights/X"))
                .andExpect(jsonPath("$.error").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("a genuinely unmapped path is still Spring's own 404, not ours")
    void frameworkErrorsAreUntouched() throws Exception {
        // The advice is deliberately narrow: it must not swallow framework routing.
        mockMvc.perform(get("/api/definitely-not-a-module/nope"))
                .andExpect(status().is4xxClientError());
    }
}
