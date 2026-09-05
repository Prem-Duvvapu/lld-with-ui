package com.lld.notification;

import com.lld.notification.channel.ChannelDeliveryException;
import com.lld.notification.channel.EmailChannel;
import com.lld.notification.channel.NotificationChannel;
import com.lld.notification.channel.NotificationChannelFactory;
import com.lld.notification.channel.PushChannel;
import com.lld.notification.channel.SmsChannel;
import com.lld.notification.channel.WhatsAppChannel;
import com.lld.notification.exception.UnsupportedChannelException;
import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import com.lld.notification.model.NotificationStatus;
import com.lld.notification.model.NotificationType;
import com.lld.notification.model.Priority;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

/** Each channel's simulated failure behavior is deterministic once the {@link Random} source is
 * fixed — a failureProbability of 0.0 must always succeed and 1.0 must always fail, for every
 * channel type, so retry logic downstream is genuinely exercisable rather than flaky. */
@DisplayName("Notification Channels & Factory")
class NotificationChannelTest {

    private Notification notification(ChannelType channel) {
        return Notification.builder()
                .id(1L).recipientId(1L).type(NotificationType.OTP).priority(Priority.HIGH)
                .channel(channel).templateData(Map.of()).status(NotificationStatus.PENDING)
                .attemptCount(0).idempotencyKey("K").build();
    }

    @Test
    @DisplayName("EmailChannel: failureProbability 0.0 always succeeds, 1.0 always fails")
    void emailChannelDeterministicOutcomes() {
        EmailChannel alwaysSucceeds = new EmailChannel(0.0, new Random());
        assertDoesNotThrow(() -> alwaysSucceeds.send(notification(ChannelType.EMAIL)));

        EmailChannel alwaysFails = new EmailChannel(1.0, new Random());
        assertThrows(ChannelDeliveryException.class, () -> alwaysFails.send(notification(ChannelType.EMAIL)));

        assertEquals(ChannelType.EMAIL, alwaysSucceeds.getType());
    }

    @Test
    @DisplayName("SmsChannel: failureProbability 0.0 always succeeds, 1.0 always fails")
    void smsChannelDeterministicOutcomes() {
        SmsChannel alwaysSucceeds = new SmsChannel(0.0, new Random());
        assertDoesNotThrow(() -> alwaysSucceeds.send(notification(ChannelType.SMS)));

        SmsChannel alwaysFails = new SmsChannel(1.0, new Random());
        assertThrows(ChannelDeliveryException.class, () -> alwaysFails.send(notification(ChannelType.SMS)));

        assertEquals(ChannelType.SMS, alwaysSucceeds.getType());
    }

    @Test
    @DisplayName("PushChannel: failureProbability 0.0 always succeeds, 1.0 always fails")
    void pushChannelDeterministicOutcomes() {
        PushChannel alwaysSucceeds = new PushChannel(0.0, new Random());
        assertDoesNotThrow(() -> alwaysSucceeds.send(notification(ChannelType.PUSH)));

        PushChannel alwaysFails = new PushChannel(1.0, new Random());
        assertThrows(ChannelDeliveryException.class, () -> alwaysFails.send(notification(ChannelType.PUSH)));

        assertEquals(ChannelType.PUSH, alwaysSucceeds.getType());
    }

    @Test
    @DisplayName("WhatsAppChannel: failureProbability 0.0 always succeeds, 1.0 always fails")
    void whatsAppChannelDeterministicOutcomes() {
        WhatsAppChannel alwaysSucceeds = new WhatsAppChannel(0.0, new Random());
        assertDoesNotThrow(() -> alwaysSucceeds.send(notification(ChannelType.WHATSAPP)));

        WhatsAppChannel alwaysFails = new WhatsAppChannel(1.0, new Random());
        assertThrows(ChannelDeliveryException.class, () -> alwaysFails.send(notification(ChannelType.WHATSAPP)));

        assertEquals(ChannelType.WHATSAPP, alwaysSucceeds.getType());
    }

    @Test
    @DisplayName("Default constructors are usable without an explicit Random (probabilistic by design)")
    void defaultConstructorsAreUsable() {
        EmailChannel channel = new EmailChannel();
        Notification n = notification(ChannelType.EMAIL);
        // Not asserting a specific outcome (it's probabilistic by design) — just that construction
        // and a single send() call don't blow up either way.
        try {
            channel.send(n);
        } catch (ChannelDeliveryException expectedSometimes) {
            // a real, simulated failure — also a valid outcome
        }
    }

    @Test
    @DisplayName("Factory resolves each ChannelType to its matching channel implementation")
    void factoryResolvesEachChannelType() {
        NotificationChannelFactory factory = new NotificationChannelFactory(
                new EmailChannel(0.0, new Random()), new SmsChannel(0.0, new Random()),
                new PushChannel(0.0, new Random()), new WhatsAppChannel(0.0, new Random()));

        assertEquals(ChannelType.EMAIL, factory.getChannel(ChannelType.EMAIL).getType());
        assertEquals(ChannelType.SMS, factory.getChannel(ChannelType.SMS).getType());
        assertEquals(ChannelType.PUSH, factory.getChannel(ChannelType.PUSH).getType());
        assertEquals(ChannelType.WHATSAPP, factory.getChannel(ChannelType.WHATSAPP).getType());
    }

    @Test
    @DisplayName("Factory throws UnsupportedChannelException (not a silent null) for an unregistered channel type")
    void factoryThrowsForUnregisteredChannelType() {
        Map<ChannelType, NotificationChannel> partial = new EnumMap<>(ChannelType.class);
        partial.put(ChannelType.EMAIL, new EmailChannel(0.0, new Random()));
        // SMS, PUSH, WHATSAPP deliberately left unregistered.
        NotificationChannelFactory factory = new NotificationChannelFactory(partial);

        assertDoesNotThrow(() -> factory.getChannel(ChannelType.EMAIL));
        assertThrows(UnsupportedChannelException.class, () -> factory.getChannel(ChannelType.SMS));
        assertThrows(UnsupportedChannelException.class, () -> factory.getChannel(ChannelType.PUSH));
    }
}
