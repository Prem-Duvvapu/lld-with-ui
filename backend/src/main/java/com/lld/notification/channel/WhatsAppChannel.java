package com.lld.notification.channel;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import org.springframework.stereotype.Component;

import java.util.Random;

/** Simulated WhatsApp delivery — see {@link EmailChannel} for the injectable-failure-rate
 * idiom. */
@Component
public class WhatsAppChannel implements NotificationChannel {
    private final double failureProbability;
    private final Random random;

    public WhatsAppChannel() {
        this(0.12, new Random());
    }

    public WhatsAppChannel(double failureProbability, Random random) {
        this.failureProbability = failureProbability;
        this.random = random;
    }

    @Override
    public void send(Notification notification) throws ChannelDeliveryException {
        if (random.nextDouble() < failureProbability) {
            throw new ChannelDeliveryException(
                    "WhatsApp delivery failed for recipient " + notification.getRecipientId());
        }
    }

    @Override
    public ChannelType getType() {
        return ChannelType.WHATSAPP;
    }
}
