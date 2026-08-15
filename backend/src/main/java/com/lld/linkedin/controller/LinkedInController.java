package com.lld.linkedin.controller;

import com.lld.linkedin.enums.EmploymentType;
import com.lld.linkedin.model.*;
import com.lld.linkedin.service.LinkedInService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/linkedin")
@CrossOrigin(origins = "*")
public class LinkedInController {

    private final LinkedInService linkedInService;

    public LinkedInController(LinkedInService linkedInService) {
        this.linkedInService = linkedInService;
    }

    // =========================================================================
    // USERS & PROFILES
    // =========================================================================

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(linkedInService.getAllUsers());
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<User> getUser(@PathVariable String userId) {
        return ResponseEntity.ok(linkedInService.getUser(userId));
    }

    @PostMapping("/users/register")
    public ResponseEntity<User> registerUser(@RequestBody Map<String, String> body) {
        User user = linkedInService.registerUser(body.get("name"), body.get("email"), body.get("password"));
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users/login")
    public ResponseEntity<User> login(@RequestBody Map<String, String> body) {
        User user = linkedInService.login(body.get("email"), body.get("password"));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}/profile")
    public ResponseEntity<Profile> updateProfile(@PathVariable String userId, @RequestBody Map<String, String> body) {
        Profile p = linkedInService.updateProfile(userId, body.get("headline"), body.get("summary"), body.get("location"));
        return ResponseEntity.ok(p);
    }

    @PostMapping("/users/{userId}/skills")
    public ResponseEntity<Profile> addSkill(@PathVariable String userId, @RequestBody Map<String, String> body) {
        Profile p = linkedInService.addSkill(userId, body.get("skill"));
        return ResponseEntity.ok(p);
    }

    @PostMapping("/users/{userId}/experience")
    public ResponseEntity<Profile> addExperience(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String company = (String) body.get("company");
        String location = (String) body.get("location");
        LocalDate startDate = LocalDate.parse((String) body.get("startDate"));
        LocalDate endDate = body.get("endDate") != null ? LocalDate.parse((String) body.get("endDate")) : null;
        boolean isCurrent = Boolean.TRUE.equals(body.get("isCurrent"));
        String desc = (String) body.get("description");

        Profile p = linkedInService.addExperience(userId, title, company, location, startDate, endDate, isCurrent, desc);
        return ResponseEntity.ok(p);
    }

    @PostMapping("/users/{userId}/education")
    public ResponseEntity<Profile> addEducation(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        String school = (String) body.get("school");
        String degree = (String) body.get("degree");
        String field = (String) body.get("fieldOfStudy");
        LocalDate startDate = LocalDate.parse((String) body.get("startDate"));
        LocalDate endDate = LocalDate.parse((String) body.get("endDate"));

        Profile p = linkedInService.addEducation(userId, school, degree, field, startDate, endDate);
        return ResponseEntity.ok(p);
    }

    // =========================================================================
    // CONNECTIONS
    // =========================================================================

    @PostMapping("/connections/request")
    public ResponseEntity<Connection> sendConnectionRequest(@RequestBody Map<String, String> body) {
        Connection c = linkedInService.sendConnectionRequest(body.get("senderId"), body.get("receiverId"));
        return ResponseEntity.ok(c);
    }

    @PostMapping("/connections/{connectionId}/accept")
    public ResponseEntity<Connection> acceptConnectionRequest(@PathVariable String connectionId,
                                                              @RequestBody Map<String, String> body) {
        Connection c = linkedInService.acceptConnectionRequest(connectionId, body.get("targetUserId"));
        return ResponseEntity.ok(c);
    }

    @PostMapping("/connections/{connectionId}/reject")
    public ResponseEntity<Connection> rejectConnectionRequest(@PathVariable String connectionId,
                                                              @RequestBody Map<String, String> body) {
        Connection c = linkedInService.rejectConnectionRequest(connectionId, body.get("targetUserId"));
        return ResponseEntity.ok(c);
    }

    @GetMapping("/connections/{userId}")
    public ResponseEntity<Set<User>> getConnections(@PathVariable String userId) {
        return ResponseEntity.ok(linkedInService.getConnections(userId));
    }

    @GetMapping("/connections/{userId}/pending")
    public ResponseEntity<List<Connection>> getPendingRequests(@PathVariable String userId) {
        return ResponseEntity.ok(linkedInService.getPendingRequests(userId));
    }

    // =========================================================================
    // MESSAGING
    // =========================================================================

    @PostMapping("/messages/send")
    public ResponseEntity<Message> sendMessage(@RequestBody Map<String, String> body) {
        Message msg = linkedInService.sendMessage(body.get("senderId"), body.get("receiverId"), body.get("content"));
        return ResponseEntity.ok(msg);
    }

    @GetMapping("/messages")
    public ResponseEntity<List<Message>> getConversation(@RequestParam String userA, @RequestParam String userB) {
        return ResponseEntity.ok(linkedInService.getConversation(userA, userB));
    }

    // =========================================================================
    // JOBS
    // =========================================================================

    @PostMapping("/jobs")
    public ResponseEntity<JobPosting> postJob(@RequestBody Map<String, Object> body) {
        String posterId = (String) body.get("posterId");
        String title = (String) body.get("title");
        String company = (String) body.get("company");
        String location = (String) body.get("location");
        String description = (String) body.get("description");
        EmploymentType type = body.get("employmentType") != null ?
                EmploymentType.valueOf((String) body.get("employmentType")) : EmploymentType.FULL_TIME;

        @SuppressWarnings("unchecked")
        List<String> skillsList = (List<String>) body.getOrDefault("requiredSkills", List.of());
        Set<String> requiredSkills = new HashSet<>(skillsList);

        JobPosting job = linkedInService.postJob(posterId, title, company, location, description, type, requiredSkills);
        return ResponseEntity.ok(job);
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<JobPosting>> getAllJobs() {
        return ResponseEntity.ok(linkedInService.getAllJobs());
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<JobPosting> getJob(@PathVariable String jobId) {
        return ResponseEntity.ok(linkedInService.getJob(jobId));
    }

    @PostMapping("/jobs/{jobId}/apply")
    public ResponseEntity<Map<String, Object>> applyForJob(@PathVariable String jobId, @RequestBody Map<String, String> body) {
        boolean success = linkedInService.applyForJob(body.get("applicantId"), jobId);
        return ResponseEntity.ok(Map.of("success", success, "jobId", jobId));
    }

    // =========================================================================
    // SEARCH & NOTIFICATIONS
    // =========================================================================

    @GetMapping("/search/users")
    public ResponseEntity<List<Map<String, Object>>> searchUsers(@RequestParam(required = false, defaultValue = "") String query,
                                                                 @RequestParam(required = false) String requestingUserId) {
        return ResponseEntity.ok(linkedInService.searchUsers(query, requestingUserId));
    }

    @GetMapping("/search/jobs")
    public ResponseEntity<List<Map<String, Object>>> searchJobs(@RequestParam(required = false, defaultValue = "") String query,
                                                                @RequestParam(required = false, defaultValue = "") String location,
                                                                @RequestParam(required = false) String applicantId) {
        return ResponseEntity.ok(linkedInService.searchJobs(query, location, applicantId));
    }

    @GetMapping("/notifications/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable String userId) {
        return ResponseEntity.ok(linkedInService.getNotifications(userId));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        linkedInService.simReset();
        return ResponseEntity.ok(linkedInService.getSimSnapshots());
    }

    @PostMapping("/sim/connect")
    public ResponseEntity<Map<String, Object>> simConnect(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(linkedInService.simSendConnection(body.get("senderId"), body.get("receiverId")));
    }

    @PostMapping("/sim/accept")
    public ResponseEntity<Map<String, Object>> simAccept(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(linkedInService.simAcceptConnection(body.get("connectionId")));
    }

    @PostMapping("/sim/message")
    public ResponseEntity<Map<String, Object>> simMessage(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(linkedInService.simSendMessage(body.get("senderId"), body.get("receiverId"), body.get("content")));
    }

    @PostMapping("/sim/apply")
    public ResponseEntity<Map<String, Object>> simApply(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(linkedInService.simApplyJob(body.get("applicantId"), body.get("jobId")));
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(linkedInService.getSimSnapshots());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(linkedInService.getSimEvents());
    }
}
