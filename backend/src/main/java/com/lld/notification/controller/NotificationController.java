package com.lld.notification.controller;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.Priority;
import com.lld.notification.model.SimEvent;
import com.lld.notification.model.UserPreference;
import com.lld.notification.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notification")
@CrossOrigin(origins = "*")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @PostMapping("/notifications")
    public ResponseEntity<Notification> send(@RequestBody Map<String, Object> body) {
        long recipientId = ((Number) body.get("recipientId")).longValue();
        NotificationType type = NotificationType.valueOf(((String) body.get("type")).toUpperCase());
        ChannelType channel = ChannelType.valueOf(((String) body.get("channel")).toUpperCase());
        @SuppressWarnings("unchecked")
        Map<String, String> templateData = (Map<String, String>) body.get("templateData");
        String idempotencyKey = (String) body.get("idempotencyKey");
        Priority priority = body.get("priority") != null
                ? Priority.valueOf(((String) body.get("priority")).toUpperCase())
                : null;

        Notification notification = service.send(recipientId, type, channel, templateData, idempotencyKey, priority);
        return ResponseEntity.ok(notification);
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getAll(@RequestParam(required = false) Long recipientId) {
        return ResponseEntity.ok(service.getAllNotifications(recipientId));
    }

    @GetMapping("/notifications/{id}")
    public ResponseEntity<Notification> getOne(@PathVariable long id) {
        return ResponseEntity.ok(service.getNotification(id));
    }

    @PutMapping("/preferences/{userId}")
    public ResponseEntity<Map<String, String>> setPreference(@PathVariable long userId, @RequestBody Map<String, Object> body) {
        NotificationType type = NotificationType.valueOf(((String) body.get("type")).toUpperCase());
        ChannelType channel = ChannelType.valueOf(((String) body.get("channel")).toUpperCase());
        boolean optedIn = Boolean.TRUE.equals(body.get("optedIn"));
        service.setPreference(userId, type, channel, optedIn);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @GetMapping("/preferences/{userId}")
    public ResponseEntity<List<UserPreference>> getPreferences(@PathVariable long userId) {
        return ResponseEntity.ok(service.getPreferences(userId));
    }

    @GetMapping("/recipients")
    public ResponseEntity<Map<Long, String>> getRecipients() {
        return ResponseEntity.ok(service.getRecipients());
    }

    // --- ISOLATED SIMULATION ENDPOINTS ---

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/send-otp")
    public ResponseEntity<Map<String, Object>> simSendOtp(@RequestParam(defaultValue = "1") int step) {
        return ResponseEntity.ok(service.simSendOtp(step));
    }

    @PostMapping("/sim/send-promo-opted-out")
    public ResponseEntity<Map<String, Object>> simSendPromoToOptedOutUser(@RequestParam(defaultValue = "2") int step) {
        return ResponseEntity.ok(service.simSendPromoToOptedOutUser(step));
    }

    @PostMapping("/sim/send-forced-failure")
    public ResponseEntity<Map<String, Object>> simSendWithForcedFailure(@RequestParam(defaultValue = "3") int step) {
        return ResponseEntity.ok(service.simSendWithForcedFailure(step));
    }

    @PostMapping("/sim/retry-outcome")
    public ResponseEntity<Map<String, Object>> simRetryOutcome(@RequestParam(defaultValue = "4") int step) {
        return ResponseEntity.ok(service.simRetryOutcome(step));
    }

    @PostMapping("/sim/send-duplicate")
    public ResponseEntity<Map<String, Object>> simSendDuplicate(@RequestParam(defaultValue = "5") int step) {
        return ResponseEntity.ok(service.simSendDuplicate(step));
    }

    @PostMapping("/sim/concurrent-duplicate-race")
    public ResponseEntity<Map<String, Object>> simConcurrentDuplicateRace(@RequestParam(defaultValue = "6") int step) {
        return ResponseEntity.ok(service.simConcurrentDuplicateRace(step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<Map<String, Object>> simGetSnapshot() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }
}
