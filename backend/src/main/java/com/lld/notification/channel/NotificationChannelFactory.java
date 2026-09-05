package com.lld.notification.channel;

import com.lld.notification.exception.UnsupportedChannelException;
import com.lld.notification.model.ChannelType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

/** Resolves a {@link ChannelType} to its concrete {@link NotificationChannel} — a real Factory,
 * not an if/else at the call site. The Spring-wired constructor registers the four production
 * channels; the map constructor exists so tests (and the isolated {@code /sim/*} sandbox) can
 * swap in test doubles or channels with forced failure rates, and can also prove
 * {@link UnsupportedChannelException} is reachable by omitting an entry. Two constructors with no
 * default means Spring cannot guess which one to autowire — {@link Autowired} on the
 * production one disambiguates it; the map constructor is for manual (test/sim) construction
 * only. */
@Component
public class NotificationChannelFactory {
    private final Map<ChannelType, NotificationChannel> channels;

    @Autowired
    public NotificationChannelFactory(EmailChannel email, SmsChannel sms, PushChannel push, WhatsAppChannel whatsApp) {
        this.channels = new EnumMap<>(ChannelType.class);
        channels.put(ChannelType.EMAIL, email);
        channels.put(ChannelType.SMS, sms);
        channels.put(ChannelType.PUSH, push);
        channels.put(ChannelType.WHATSAPP, whatsApp);
    }

    public NotificationChannelFactory(Map<ChannelType, NotificationChannel> channels) {
        this.channels = new EnumMap<>(channels);
    }

    public NotificationChannel getChannel(ChannelType type) {
        NotificationChannel channel = channels.get(type);
        if (channel == null) {
            throw new UnsupportedChannelException("No channel implementation registered for " + type);
        }
        return channel;
    }
}
