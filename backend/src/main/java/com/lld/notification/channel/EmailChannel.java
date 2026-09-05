package com.lld.notification.channel;

import com.lld.notification.model.ChannelType;
import com.lld.notification.model.Notification;
import org.springframework.stereotype.Component;

import java.util.Random;

/** Simulated email delivery. The failure rate and the {@link Random} source are both
 * constructor-injectable so tests can force deterministic success or failure — see
 * {@code EmailChannelTest}. */
@Component
public class EmailChannel implements NotificationChannel {
    private final double failureProbability;
    private final Random random;

    public EmailChannel() {
        this(0.10, new Random());
    }

    public EmailChannel(double failureProbability, Random random) {
        this.failureProbability = failureProbability;
        this.random = random;
    }

    @Override
    public void send(Notification notification) throws ChannelDeliveryException {
        if (random.nextDouble() < failureProbability) {
            throw new ChannelDeliveryException(
                    "Email delivery failed for recipient " + notification.getRecipientId());
        }
    }

    @Override
    public ChannelType getType() {
        return ChannelType.EMAIL;
    }
}
