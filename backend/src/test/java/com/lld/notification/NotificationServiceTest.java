package com.lld.notification;

import com.lld.notification.channel.ChannelDeliveryException;
import com.lld.notification.channel.NotificationChannel;
import com.lld.notification.channel.NotificationChannelFactory;
import com.lld.notification.exception.NotificationNotFoundException;
import com.lld.notification.exception.RecipientNotFoundException;
import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationStatus;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.Priority;
import com.lld.notification.repository.NotificationRepository;
import com.lld.notification.retry.ExponentialBackoffRetryPolicy;
import com.lld.notification.retry.RetryPolicy;
import com.lld.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Service-level coverage: every legitimate happy path, and every way {@code send()} can
 * legitimately reject or redirect a notification. Uses hand-rolled {@link NotificationChannel}
 * test doubles (always-succeed / always-fail / counting) rather than the real, probabilistic
 * channels, so outcomes here are fully deterministic.
 */
@DisplayName("Notification Service")
class NotificationServiceTest {

    private NotificationRepository repository;
    private RetryPolicy fastRetryPolicy;

    @BeforeEach
    void setUp() {
        repository = new NotificationRepository();
        repository.registerRecipient(1L, "Alice");
        repository.registerRecipient(2L, "Bob");
        // Tiny delays so exhaustion/retry tests run fast and deterministically.
        fastRetryPolicy = new ExponentialBackoffRetryPolicy(3, Duration.ofMillis(2), Duration.ofMillis(10));
    }

    /** A channel whose outcome is fixed by construction, with a thread-safe invocation counter
     * so suppression/duplicate tests can prove it was never (or exactly once) called. */
    static class ScriptedChannel implements NotificationChannel {
        private final ChannelType type;
        private final boolean succeed;
        final AtomicInteger invocations = new AtomicInteger();

        ScriptedChannel(ChannelType type, boolean succeed) {
            this.type = type;
            this.succeed = succeed;
        }

        @Override
        public void send(Notification notification) throws ChannelDeliveryException {
            invocations.incrementAndGet();
            if (!succeed) {
                throw new ChannelDeliveryException("scripted failure");
            }
        }

        @Override
        public ChannelType getType() {
            return type;
        }
    }

    private NotificationChannelFactory factoryWith(ChannelType type, NotificationChannel channel) {
        Map<ChannelType, NotificationChannel> map = new EnumMap<>(ChannelType.class);
        map.put(type, channel);
        return new NotificationChannelFactory(map);
    }

    /** Waits (bounded) for a notification to reach a terminal (or otherwise expected) status,
     * since dispatch happens on background worker threads once {@code start()} is called. Never
     * asserts on timing — only on the eventual state, with a generous timeout so CI jitter can't
     * flake it. */
    private Notification awaitStatus(NotificationService service, long id, NotificationStatus expected, long timeoutMs) throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        Notification n;
        do {
            n = service.getNotification(id);
            if (n.getStatus() == expected) {
                return n;
            }
            Thread.sleep(5);
        } while (System.currentTimeMillis() < deadline);
        return n;
    }

    @Test
    @DisplayName("send() with a reliable channel eventually reaches SENT")
    void sendSucceedsEventually() throws InterruptedException {
        ScriptedChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 1);
        service.start();
        try {
            Notification n = service.send(1L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL,
                    Map.of("orderId", "ORD-1"), "KEY-1", null);

            Notification result = awaitStatus(service, n.getId(), NotificationStatus.SENT, 2000);
            assertEquals(NotificationStatus.SENT, result.getStatus());
            assertEquals(1, channel.invocations.get());
            assertEquals(Priority.MEDIUM, result.getPriority(), "TRANSACTIONAL defaults to MEDIUM priority");
        } finally {
            service.shutdown();
        }
    }

    @Test
    @DisplayName("A priority override replaces the type's default priority")
    void priorityOverrideWins() {
        ScriptedChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);
        Notification n = service.send(1L, NotificationType.PROMOTIONAL, ChannelType.EMAIL,
                Map.of(), "KEY-OVERRIDE", Priority.HIGH);
        assertEquals(Priority.HIGH, n.getPriority(), "explicit override must beat PROMOTIONAL's LOW default");
    }

    @Test
    @DisplayName("An opted-out (type, channel) pair suppresses the notification before ever touching a channel")
    void suppressionNeverTouchesChannel() {
        repository.setPreference(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, false);
        ScriptedChannel channel = new ScriptedChannel(ChannelType.SMS, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.SMS, channel), fastRetryPolicy, 0);

        Notification n = service.send(1L, NotificationType.PROMOTIONAL, ChannelType.SMS,
                Map.of("offer", "sale"), "KEY-SUPPRESS", null);

        assertEquals(NotificationStatus.SUPPRESSED, n.getStatus());
        assertEquals(0, channel.invocations.get(), "an opted-out send must never call the channel");
        assertEquals(0, service.pendingQueueSize(), "a suppressed notification is never enqueued for dispatch");
    }

    @Test
    @DisplayName("An always-failing channel eventually exhausts retries and lands on FAILED")
    void retriesExhaustToFailed() throws InterruptedException {
        ScriptedChannel channel = new ScriptedChannel(ChannelType.PUSH, false);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.PUSH, channel), fastRetryPolicy, 1);
        service.start();
        try {
            Notification n = service.send(1L, NotificationType.ALERT, ChannelType.PUSH,
                    Map.of("alert", "x"), "KEY-FAIL", null);

            Notification result = awaitStatus(service, n.getId(), NotificationStatus.FAILED, 2000);
            assertEquals(NotificationStatus.FAILED, result.getStatus());
            assertEquals(3, result.getAttemptCount(), "maxAttempts=3 means exactly 3 attempts before giving up");
            assertEquals(3, channel.invocations.get());
            assertNotNull(result.getLastError());
        } finally {
            service.shutdown();
        }
    }

    @Test
    @DisplayName("send() rejects an unknown recipient with RecipientNotFoundException")
    void rejectsUnknownRecipient() {
        NotificationChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        assertThrows(RecipientNotFoundException.class,
                () -> service.send(999L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "KEY-X", null));
    }

    @Test
    @DisplayName("getNotification() on an unknown id throws NotificationNotFoundException")
    void getNotificationRejectsUnknownId() {
        NotificationChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        assertThrows(NotificationNotFoundException.class, () -> service.getNotification(12345L));
    }

    @Test
    @DisplayName("setPreference()/getPreferences() reject an unknown recipient")
    void preferencesRejectUnknownRecipient() {
        NotificationChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        assertThrows(RecipientNotFoundException.class,
                () -> service.setPreference(999L, NotificationType.PROMOTIONAL, ChannelType.SMS, false));
        assertThrows(RecipientNotFoundException.class, () -> service.getPreferences(999L));
    }

    @Test
    @DisplayName("getAllNotifications(recipientId) filters; null returns everything")
    void getAllNotificationsFiltersByRecipient() {
        NotificationChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "K1", null);
        service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "K2", null);
        service.send(2L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "K3", null);

        List<Notification> forAlice = service.getAllNotifications(1L);
        assertEquals(2, forAlice.size());
        assertEquals(3, service.getAllNotifications(null).size());
    }

    @Test
    @DisplayName("A duplicate idempotencyKey is recognized as a no-op: same notification, channel called once")
    void duplicateIdempotencyKeyIsNoOp() {
        ScriptedChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        Notification first = service.send(1L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL,
                Map.of(), "SAME-KEY", null);
        service.drainOnce(); // deliver the first one synchronously (worker pool never started)

        Notification second = service.send(1L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL,
                Map.of(), "SAME-KEY", null);

        assertEquals(first.getId(), second.getId(), "the duplicate must resolve to the same notification");
        assertEquals(0, service.pendingQueueSize(), "a duplicate must never be enqueued for its own dispatch");
        assertEquals(1, channel.invocations.get(), "the channel must be invoked exactly once across both calls");
    }

    @Test
    @DisplayName("A blank idempotencyKey is auto-generated, so two blank-key sends are independent")
    void blankIdempotencyKeyIsAutoGenerated() {
        ScriptedChannel channel = new ScriptedChannel(ChannelType.EMAIL, true);
        NotificationService service = new NotificationService(repository, factoryWith(ChannelType.EMAIL, channel), fastRetryPolicy, 0);

        Notification a = service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "", null);
        Notification b = service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), null, null);

        assertNotEquals(a.getId(), b.getId());
    }
}
