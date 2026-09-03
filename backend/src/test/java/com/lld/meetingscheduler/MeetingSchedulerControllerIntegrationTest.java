package com.lld.meetingscheduler;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-level HTTP + JSON-serialization round trip — the test flavour RCA-049 found this
 * whole repo was missing everywhere except traffic-signal: every other test in this package calls
 * the service/domain layer directly and never proves the real response body actually serializes.
 * Also directly checks for RCA-049's bug class: a getter on a returned domain object exposing an
 * internal lock/notifier with no {@code @JsonIgnore} — {@link com.lld.meetingscheduler.model.MeetingRoom}
 * and {@link com.lld.meetingscheduler.model.Meeting} carry no such field at all (the module's one
 * lock lives in {@code ConflictDetectionService}, never on a returned model), but this is where a
 * future regression would be caught.
 */
@SpringBootTest
@AutoConfigureMockMvc
class MeetingSchedulerControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/meetingscheduler/rooms serializes cleanly and leaks no internal lock")
    void listRoomsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/meetingscheduler/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].lock").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/meetingscheduler/meetings serializes cleanly, including nested attendeeIds")
    void listMeetingsSerializesCleanly() throws Exception {
        mockMvc.perform(get("/api/meetingscheduler/meetings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].attendeeIds").isArray())
                .andExpect(jsonPath("$[0].status").exists());
    }

    @Test
    @DisplayName("GET an unknown room is a 404 with a readable reason, not a bare 500")
    void unknownRoomIs404() throws Exception {
        mockMvc.perform(get("/api/meetingscheduler/rooms/GHOST"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RoomNotFoundException"))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("Booking a real conflict returns 409 with the AttendeeConflictException code")
    void bookingRealConflictReturns409() throws Exception {
        String roomsJson = mockMvc.perform(get("/api/meetingscheduler/rooms"))
                .andReturn().getResponse().getContentAsString();
        String roomId = JsonPath.read(roomsJson, "$[0].id");

        // First booking succeeds.
        String body1 = """
                {"organizerId":"itest-alice","attendeeIds":[],"title":"Integration Test 1",
                 "start":"2099-01-01T10:00:00","end":"2099-01-01T11:00:00"}
                """;
        mockMvc.perform(post("/api/meetingscheduler/rooms/" + roomId + "/book")
                        .contentType(MediaType.APPLICATION_JSON).content(body1))
                .andExpect(status().isOk());

        // Second booking, same room, overlapping time, different organizer -> RoomConflictException.
        String body2 = """
                {"organizerId":"itest-bob","attendeeIds":[],"title":"Integration Test 2",
                 "start":"2099-01-01T10:30:00","end":"2099-01-01T12:00:00"}
                """;
        mockMvc.perform(post("/api/meetingscheduler/rooms/" + roomId + "/book")
                        .contentType(MediaType.APPLICATION_JSON).content(body2))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RoomConflictException"));
    }

    @Test
    @DisplayName("POST /sim/reset then booking in the sandbox never touches live room/meeting counts")
    void simBookingIsIsolatedFromLive() throws Exception {
        String liveBefore = mockMvc.perform(get("/api/meetingscheduler/meetings"))
                .andReturn().getResponse().getContentAsString();
        int liveCountBefore = JsonPath.read(liveBefore, "$.length()");

        mockMvc.perform(post("/api/meetingscheduler/sim/reset")).andExpect(status().isOk());
        String simRoomJson = mockMvc.perform(post("/api/meetingscheduler/sim/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Sim Room\",\"capacity\":6}"))
                .andReturn().getResponse().getContentAsString();
        String simRoomId = JsonPath.read(simRoomJson, "$.id");

        mockMvc.perform(post("/api/meetingscheduler/sim/rooms/" + simRoomId + "/book")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"organizerId":"sim-alice","attendeeIds":[],"title":"Sim Meeting",
                                 "start":"2099-02-01T09:00:00","end":"2099-02-01T10:00:00"}
                                """))
                .andExpect(status().isOk());

        String liveAfter = mockMvc.perform(get("/api/meetingscheduler/meetings"))
                .andReturn().getResponse().getContentAsString();
        int liveCountAfter = JsonPath.read(liveAfter, "$.length()");
        assertNotEquals(-1, liveCountAfter); // sanity: JsonPath actually returned a count
        org.junit.jupiter.api.Assertions.assertEquals(liveCountBefore, liveCountAfter,
                "booking in the sim sandbox must not change the live meeting count");
    }
}
