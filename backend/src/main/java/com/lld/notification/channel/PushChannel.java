package com.lld.notification.channel;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import org.springframework.stereotype.Component;

import java.util.Random;

/** Simulated push-notification delivery — see {@link EmailChannel} for the injectable-failure-rate
 * idiom. */
@Component
public class PushChannel implements NotificationChannel {
    private final double failureProbability;
    private final Random random;

    public PushChannel() {
        this(0.05, new Random());
    }

    public PushChannel(double failureProbability, Random random) {
        this.failureProbability = failureProbability;
        this.random = random;
    }

    @Override
    public void send(Notification notification) throws ChannelDeliveryException {
        if (random.nextDouble() < failureProbability) {
            throw new ChannelDeliveryException(
                    "Push delivery failed for recipient " + notification.getRecipientId());
        }
    }

    @Override
    public ChannelType getType() {
        return ChannelType.PUSH;
    }
}
