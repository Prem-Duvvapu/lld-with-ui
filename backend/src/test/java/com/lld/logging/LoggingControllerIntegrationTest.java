package com.lld.logging;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@SpringBootTest
@AutoConfigureMockMvc
class LoggingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Unknown global level returns a typed 400 ErrorResponse")
    void unknownGlobalLevelIsTyped400() throws Exception {
        mockMvc.perform(post("/api/logging/configure")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"VERBOSE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidLogLevelException"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Unsupported log level: VERBOSE"));
    }

    @Test
    @DisplayName("Unknown formatter returns a typed 400 ErrorResponse")
    void unknownFormatterIsTyped400() throws Exception {
        mockMvc.perform(post("/api/logging/formatter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"formatter\":\"XML\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidFormatterException"))
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("Unknown appender toggle returns a typed 404 instead of a false success")
    void unknownAppenderToggleIsTyped404() throws Exception {
        mockMvc.perform(post("/api/logging/appender/toggle")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"KafkaAppender\",\"enabled\":true}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AppenderNotFoundException"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("Unknown appender log query returns a typed 404 instead of an empty list")
    void unknownAppenderLogsAreTyped404() throws Exception {
        mockMvc.perform(get("/api/logging/appenders/KAFKA/logs"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AppenderNotFoundException"));
    }

    @Test
    @DisplayName("Simulation log parsing uses the same typed level contract")
    void invalidSimulationLevelIsTyped400() throws Exception {
        mockMvc.perform(post("/api/logging/sim/log")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loggerName\":\"SimLogger\",\"level\":\"NOTICE\",\"message\":\"test\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("InvalidLogLevelException"));
    }

    @Test
    @DisplayName("Unknown simulation appender returns the same typed 404 contract")
    void unknownSimulationAppenderIsTyped404() throws Exception {
        mockMvc.perform(get("/api/logging/sim/appenders/KAFKA/logs"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("AppenderNotFoundException"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void sandboxThresholdDeterminesTheHttpOutcomeAndDoesNotChangeLiveConfiguration() throws Exception {
        String liveConfig = mockMvc.perform(get("/api/logging/config")).andReturn().getResponse().getContentAsString();
        mockMvc.perform(post("/api/logging/sim/reset")).andExpect(status().isOk());
        mockMvc.perform(post("/api/logging/sim/configure").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"ERROR\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.globalLevel").value("ERROR"))
                .andExpect(jsonPath("$.asyncEnabled").value(false))
                .andExpect(jsonPath("$.queueCapacity").value(20));
        mockMvc.perform(post("/api/logging/sim/log").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loggerName\":\"Orders\",\"level\":\"WARN\",\"message\":\"Filtered\"}"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        mockMvc.perform(get("/api/logging/sim/logs"))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(post("/api/logging/sim/log").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loggerName\":\"Orders\",\"level\":\"ERROR\",\"message\":\"Accepted\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Accepted"));
        mockMvc.perform(get("/api/logging/sim/appenders/CONSOLE/logs"))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/logging/config")).andExpect(content().json(liveConfig));
    }

    @Test
    void sandboxConfigurationRejectsInvalidAndMissingLevelsWithTypedErrors() throws Exception {
        for (String body : new String[] {"{}", "{\"level\":\"VERBOSE\"}", "{\"level\":\"\"}"}) {
            mockMvc.perform(post("/api/logging/sim/configure").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("InvalidLogLevelException"))
                    .andExpect(jsonPath("$.status").value(400));
        }
    }
}
