package com.lld.jobscheduler;

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

/**
 * Real HTTP + JSON-serialization coverage — the RCA-049 gap: every other test in this module
 * calls {@code JobSchedulerService}/{@code JobScheduler} directly and never round-trips a
 * {@code Job} through Spring MVC + Jackson the way the frontend actually does. Also proves no
 * per-job {@code ReentrantLock} (which lives only inside {@code JobScheduler}'s internal map,
 * never on {@code Job} itself) leaks into a response body.
 */
@SpringBootTest
@AutoConfigureMockMvc
class JobSchedulerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/jobscheduler/jobs serializes the seeded live jobs cleanly, with no leaked lock")
    void liveJobsSerializeCleanly() throws Exception {
        mockMvc.perform(get("/api/jobscheduler/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].lock").doesNotExist())
                .andExpect(jsonPath("$[0].cancelled").exists());
    }

    @Test
    @DisplayName("POST /api/jobscheduler/jobs creates a job and it is retrievable by id")
    void createJob_thenFetchById() throws Exception {
        String body = "{\"name\":\"Integration Job\",\"taskType\":\"GENERIC_TASK\","
                + "\"scheduleType\":\"ONE_TIME\",\"scheduleParams\":{\"delaySeconds\":3600},"
                + "\"misfirePolicy\":\"FIRE_IMMEDIATELY\"}";

        String created = mockMvc.perform(post("/api/jobscheduler/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andReturn().getResponse().getContentAsString();

        String id = com.jayway.jsonpath.JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/jobscheduler/jobs/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Integration Job"))
                .andExpect(jsonPath("$.status").value("SCHEDULED"));

        mockMvc.perform(get("/api/jobscheduler/jobs/" + id + "/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /api/jobscheduler/jobs/{id} for an unknown id returns a domain 404, not a raw 500")
    void unknownJobId_returnsDomain404() throws Exception {
        mockMvc.perform(get("/api/jobscheduler/jobs/NOPE"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("POST .../cancel on an unknown id returns a domain 404")
    void cancelUnknownJob_returnsDomain404() throws Exception {
        mockMvc.perform(post("/api/jobscheduler/jobs/NOPE/cancel"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("POST /api/jobscheduler/jobs with a malformed cron expression returns a domain 400")
    void malformedCronExpression_returnsDomain400() throws Exception {
        String body = "{\"name\":\"Bad Cron\",\"scheduleType\":\"CRON\","
                + "\"scheduleParams\":{\"cronExpression\":\"not a cron\"},\"misfirePolicy\":\"FIRE_IMMEDIATELY\"}";
        mockMvc.perform(post("/api/jobscheduler/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("POST /api/jobscheduler/preview returns the next N fire times without creating a job")
    void preview_returnsFireTimesOnly() throws Exception {
        String body = "{\"scheduleType\":\"CRON\",\"scheduleParams\":{\"cronExpression\":\"0 9 * * *\"},\"count\":3}";
        mockMvc.perform(post("/api/jobscheduler/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    @DisplayName("walking the full 8-step /sim/* flow returns 200 at each step and ends with the race resolved")
    void fullSimWalkthroughSucceeds() throws Exception {
        mockMvc.perform(post("/api/jobscheduler/sim/reset")).andExpect(status().isOk());

        String oneTimeResp = mockMvc.perform(post("/api/jobscheduler/sim/schedule-one-time")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":2,\"delaySeconds\":30}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertJobCount(oneTimeResp, 1);

        String cronResp = mockMvc.perform(post("/api/jobscheduler/sim/schedule-cron")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":3,\"cronExpression\":\"* * * * *\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertJobCount(cronResp, 2);
        String cronJobId = findJobIdByTaskType(cronResp, "HEARTBEAT");

        mockMvc.perform(post("/api/jobscheduler/sim/advance-clock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":4,\"seconds\":65}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/jobscheduler/sim/advance-clock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":5,\"seconds\":60}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/jobscheduler/sim/trigger-misfire")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":6,\"jobId\":\"" + cronJobId + "\",\"jumpSeconds\":600}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/jobscheduler/sim/cancel-job")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"step\":7,\"jobId\":\"" + cronJobId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events").isArray());

        mockMvc.perform(post("/api/jobscheduler/sim/race"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs").isArray());

        mockMvc.perform(get("/api/jobscheduler/sim/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/jobscheduler/sim/snapshot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobs[0].lock").doesNotExist());
    }

    private void assertJobCount(String json, int expected) {
        java.util.List<?> jobs = com.jayway.jsonpath.JsonPath.read(json, "$.jobs");
        org.junit.jupiter.api.Assertions.assertEquals(expected, jobs.size());
    }

    // ConcurrentHashMap iteration order is unspecified, so the jobs list's index order cannot
    // be relied on — look the job up by a field instead.
    @SuppressWarnings("unchecked")
    private String findJobIdByTaskType(String json, String taskType) {
        java.util.List<java.util.Map<String, Object>> jobs = com.jayway.jsonpath.JsonPath.read(json, "$.jobs");
        return jobs.stream()
                .filter(j -> taskType.equals(j.get("taskType")))
                .map(j -> (String) j.get("id"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no job with taskType " + taskType));
    }
}
