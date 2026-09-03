package com.lld.meetingscheduler.controller;

import com.lld.meetingscheduler.model.Meeting;
import com.lld.meetingscheduler.model.MeetingRoom;
import com.lld.meetingscheduler.service.MeetingSchedulerService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meetingscheduler")
@CrossOrigin(origins = "*")
public class MeetingSchedulerController {

    private final MeetingSchedulerService service;

    public MeetingSchedulerController(MeetingSchedulerService service) {
        this.service = service;
    }

    // ---- Rooms ----
    @GetMapping("/rooms")
    public List<MeetingRoom> getRooms() {
        return service.getAllRooms();
    }

    @GetMapping("/rooms/{roomId}")
    public MeetingRoom getRoom(@PathVariable String roomId) {
        return service.getRoom(roomId);
    }

    @GetMapping("/rooms/{roomId}/availability")
    public List<Meeting> getAvailability(@PathVariable String roomId, @RequestParam String date) {
        return service.getAvailability(roomId, LocalDate.parse(date));
    }

    @PostMapping("/rooms/{roomId}/book")
    @SuppressWarnings("unchecked")
    public Meeting book(@PathVariable String roomId, @RequestBody Map<String, Object> body) {
        return service.bookMeeting(
                roomId,
                (String) body.get("organizerId"),
                (List<String>) body.getOrDefault("attendeeIds", List.of()),
                (String) body.get("title"),
                LocalDateTime.parse((String) body.get("start")),
                LocalDateTime.parse((String) body.get("end")));
    }

    // ---- Meetings ----
    @GetMapping("/meetings")
    public List<Meeting> getMeetings(@RequestParam(required = false) String personId) {
        return personId != null ? service.getMeetingsForPerson(personId) : service.getAllMeetings();
    }

    @GetMapping("/meetings/{meetingId}")
    public Meeting getMeeting(@PathVariable String meetingId) {
        return service.getMeeting(meetingId);
    }

    @DeleteMapping("/meetings/{meetingId}")
    public Meeting cancel(@PathVariable String meetingId) {
        return service.cancelMeeting(meetingId);
    }

    // ================= Isolated simulation sandbox =================

    @PostMapping("/sim/reset")
    public Map<String, String> simReset() {
        service.simReset();
        return Map.of("status", "reset");
    }

    @PostMapping("/sim/rooms")
    public MeetingRoom simSeedRoom(@RequestBody MeetingRoom room) {
        return service.simSeedRoom(room);
    }

    @GetMapping("/sim/rooms")
    public List<MeetingRoom> simGetRooms() {
        return service.simGetRooms();
    }

    @GetMapping("/sim/meetings")
    public List<Meeting> simGetMeetings() {
        return service.simGetMeetings();
    }

    @PostMapping("/sim/rooms/{roomId}/book")
    @SuppressWarnings("unchecked")
    public Meeting simBook(@PathVariable String roomId, @RequestBody Map<String, Object> body) {
        return service.simBookMeeting(
                roomId,
                (String) body.get("organizerId"),
                (List<String>) body.getOrDefault("attendeeIds", List.of()),
                (String) body.get("title"),
                LocalDateTime.parse((String) body.get("start")),
                LocalDateTime.parse((String) body.get("end")));
    }

    @DeleteMapping("/sim/meetings/{meetingId}")
    public Meeting simCancel(@PathVariable String meetingId) {
        return service.simCancelMeeting(meetingId);
    }
}
