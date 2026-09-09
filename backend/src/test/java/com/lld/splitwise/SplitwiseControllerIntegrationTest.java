package com.lld.splitwise;

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

@SpringBootTest
@AutoConfigureMockMvc
class SplitwiseControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Missing live user returns the shared typed 404 body")
    void missingLiveUserIsTyped404() throws Exception {
        mockMvc.perform(get("/api/splitwise/users/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("UserNotFoundException"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Splitwise user not found: 999999"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("Invalid exact split returns 422 through GlobalExceptionHandler")
    void invalidSplitIsTyped422() throws Exception {
        mockMvc.perform(post("/api/splitwise/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"Dinner","amount":100,"paidBy":1,"groupId":1,
                                 "splits":[
                                   {"userId":1,"amount":60,"type":"EXACT"},
                                   {"userId":2,"amount":30,"type":"EXACT"}
                                 ]}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("InvalidSplitException"))
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    @DisplayName("Invalid settlement returns the shared typed 400 body")
    void invalidSettlementIsTyped400() throws Exception {
        mockMvc.perform(post("/api/splitwise/settle")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{" +
                                "\"fromUserId\":1,\"toUserId\":2,\"groupId\":1,\"amount\":0" +
                                "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidSettlementException"))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("Missing simulation user returns the same typed 404 contract")
    void missingSimulationUserIsTyped404() throws Exception {
        mockMvc.perform(post("/api/splitwise/sim/reset"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/splitwise/sim/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"description":"Sandbox dinner","amount":100,
                                 "paidBy":999,"groupId":999,"splits":[]}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("UserNotFoundException"))
                .andExpect(jsonPath("$.status").value(404));
    }
}
