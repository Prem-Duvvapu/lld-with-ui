package com.lld.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real HTTP + JSON-serialization coverage for {@code /api/notification/*}, including the
 * isolated {@code /sim/*} engine — the same gap {@code UberControllerIntegrationTest} closed
 * (RCA-049 pattern): every other test in this module calls {@link com.lld.notification.service
 * .NotificationService} directly and never round-trips a {@code Notification} through Spring
 * MVC + Jackson the way the frontend actually does, nor proves no lock object leaks into JSON.
 */
@SpringBootTest
@AutoConfigureMockMvc
class NotificationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/notification/notifications and /recipients serialize cleanly")
    void liveEndpointsSerializeCleanly() throws Exception {
        mockMvc.perform(get("/api/notification/notifications")).andExpect(status().isOk());
        mockMvc.perform(get("/api/notification/recipients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['101']").value("Alice Sharma"));
    }

    @Test
    @DisplayName("POST /api/notification/notifications sends and returns a Notification with no leaked lock")
    void sendReturnsNotificationWithNoLeakedLock() throws Exception {
        mockMvc.perform(post("/api/notification/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":101,\"type\":\"OTP\",\"channel\":\"EMAIL\","
                                + "\"templateData\":{\"otp\":\"111111\"},\"idempotencyKey\":\"IT-OTP-1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.lock").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/notification/notifications/{id} on an unknown id returns 404")
    void getUnknownNotificationReturns404() throws Exception {
        mockMvc.perform(get("/api/notification/notifications/999999")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST with an unknown recipientId returns 404")
    void sendWithUnknownRecipientReturns404() throws Exception {
        mockMvc.perform(post("/api/notification/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipientId\":999999,\"type\":\"OTP\",\"channel\":\"EMAIL\","
                                + "\"idempotencyKey\":\"IT-UNKNOWN\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT/GET preferences round-trip through real HTTP + JSON")
    void preferencesRoundTrip() throws Exception {
        mockMvc.perform(put("/api/notification/preferences/102")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"PROMOTIONAL\",\"channel\":\"SMS\",\"optedIn\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notification/preferences/102"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].optedIn").value(false));
    }

    @Test
    @DisplayName("POST /api/notification/sim/reset serializes the sandbox snapshot cleanly, with no leaked lock")
    void simResetSerializesCleanly() throws Exception {
        mockMvc.perform(post("/api/notification/sim/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipient.id").value(1))
                .andExpect(jsonPath("$.notifications").isArray())
                .andExpect(jsonPath("$.recipient.lock").doesNotExist());
    }

    @Test
    @DisplayName("Walking all 6 sim action steps returns 200 at each step and ends with a resolved race")
    void fullSimWalkthroughSucceeds() throws Exception {
        mockMvc.perform(post("/api/notification/sim/reset")).andExpect(status().isOk());

        mockMvc.perform(post("/api/notification/sim/send-otp?step=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notification.status").value("SENT"));

        mockMvc.perform(post("/api/notification/sim/send-promo-opted-out?step=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notification.status").value("SUPPRESSED"));

        mockMvc.perform(post("/api/notification/sim/send-forced-failure?step=3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notification.status").value("RETRYING"));

        mockMvc.perform(post("/api/notification/sim/retry-outcome?step=4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notification.status").value("FAILED"));

        mockMvc.perform(post("/api/notification/sim/send-duplicate?step=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.details.sameNotificationBothTimes").value(true));

        mockMvc.perform(post("/api/notification/sim/concurrent-duplicate-race?step=6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.details.distinctNotificationIds").value(1));

        mockMvc.perform(get("/api/notification/sim/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7)); // reset + 6 action steps

        mockMvc.perform(get("/api/notification/sim/snapshot")).andExpect(status().isOk());
    }
}
