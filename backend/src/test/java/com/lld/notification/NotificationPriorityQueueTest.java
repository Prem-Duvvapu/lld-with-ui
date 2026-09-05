package com.lld.notification;

import com.lld.notification.channel.NotificationChannel;
import com.lld.notification.channel.NotificationChannelFactory;
import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationType;
import com.lld.notification.repository.NotificationRepository;
import com.lld.notification.retry.ExponentialBackoffRetryPolicy;
import com.lld.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pending notifications are dispatched from a {@code PriorityBlockingQueue} ordered by
 * {@link com.lld.notification.model.Priority} then {@code createdAt} — a HIGH-priority OTP must
 * observably jump ahead of an already-queued LOW-priority PROMOTIONAL. The service under test is
 * constructed with a zero-size worker pool and {@code start()} is never called, so nothing
 * consumes the queue automatically; {@code drainOnce()} — the exact method the real background
 * workers call in a loop — is invoked by hand, making the order fully deterministic instead of a
 * race against real threads.
 */
@DisplayName("Notification Priority Dispatch Ordering")
class NotificationPriorityQueueTest {

    private NotificationRepository repository;
    private NotificationService service;
    private List<String> dispatchOrder;

    @BeforeEach
    void setUp() {
        repository = new NotificationRepository();
        repository.registerRecipient(1L, "Alice");
        dispatchOrder = new CopyOnWriteArrayList<>();

        Map<ChannelType, NotificationChannel> channels = new EnumMap<>(ChannelType.class);
        channels.put(ChannelType.EMAIL, recordingChannel(ChannelType.EMAIL));
        channels.put(ChannelType.SMS, recordingChannel(ChannelType.SMS));
        NotificationChannelFactory factory = new NotificationChannelFactory(channels);

        // workerCount=0 and start() never called: nothing drains the queue except drainOnce().
        service = new NotificationService(repository, factory, new ExponentialBackoffRetryPolicy(3, Duration.ofMillis(1)), 0);
    }

    private NotificationChannel recordingChannel(ChannelType type) {
        return new NotificationChannel() {
            @Override
            public void send(Notification notification) {
                dispatchOrder.add(notification.getType().name());
            }

            @Override
            public ChannelType getType() {
                return type;
            }
        };
    }

    @Test
    @DisplayName("A HIGH-priority OTP enqueued after a LOW-priority PROMOTIONAL is still dispatched first")
    void highPriorityJumpsAheadOfLowPriority() {
        service.send(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, Map.of(), "LOW-1", null); // LOW, enqueued first
        service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "HIGH-1", null);       // HIGH, enqueued second

        assertEquals(2, service.pendingQueueSize());

        Notification firstDrained = service.drainOnce();
        Notification secondDrained = service.drainOnce();

        assertEquals(NotificationType.OTP, firstDrained.getType(), "HIGH-priority OTP must drain first despite arriving second");
        assertEquals(NotificationType.PROMOTIONAL, secondDrained.getType());
        assertEquals(List.of("OTP", "PROMOTIONAL"), dispatchOrder, "the channel itself must observe HIGH before LOW");
        assertNull(service.drainOnce(), "the queue is now empty");
    }

    @Test
    @DisplayName("Three priorities enqueued in reverse order still drain HIGH, MEDIUM, LOW")
    void threePrioritiesDrainInPriorityOrder() {
        service.send(1L, NotificationType.PROMOTIONAL, ChannelType.SMS, Map.of(), "LOW-2", null);      // LOW
        service.send(1L, NotificationType.TRANSACTIONAL, ChannelType.EMAIL, Map.of(), "MED-2", null);  // MEDIUM
        service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "HIGH-2", null);           // HIGH

        assertEquals(NotificationType.OTP, service.drainOnce().getType());
        assertEquals(NotificationType.TRANSACTIONAL, service.drainOnce().getType());
        assertEquals(NotificationType.PROMOTIONAL, service.drainOnce().getType());
    }

    @Test
    @DisplayName("Same priority preserves FIFO (createdAt) order")
    void samePriorityPreservesArrivalOrder() {
        service.send(1L, NotificationType.OTP, ChannelType.EMAIL, Map.of(), "OTP-A", null);
        service.send(1L, NotificationType.ALERT, ChannelType.EMAIL, Map.of(), "OTP-B", null); // also HIGH

        Notification first = service.drainOnce();
        Notification second = service.drainOnce();
        assertTrue(first.getCreatedAt().isBefore(second.getCreatedAt()) || first.getCreatedAt().isEqual(second.getCreatedAt()));
        assertEquals("OTP-A", first.getIdempotencyKey());
        assertEquals("OTP-B", second.getIdempotencyKey());
    }
}
