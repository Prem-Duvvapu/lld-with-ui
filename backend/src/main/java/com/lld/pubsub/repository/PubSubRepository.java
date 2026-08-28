package com.lld.pubsub.repository;

import com.lld.pubsub.model.Subscriber;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Subscriber directory keyed by (topicName, subscriberId), not by subscriber id alone. The same
 * subscriber id subscribing to two different topics gets two independent {@link Subscriber}
 * instances tracked here — without the composite key, the second {@code save} would silently
 * overwrite the first topic's entry and {@code getSubscriberMessages} would return the wrong
 * topic's message history (the bug this replaced: the old map was keyed by id only).
 *
 * <p>Real state used by {@code PubSubService}, not decoration: it is the backing store behind
 * {@code subscribe}/{@code unsubscribe}/{@code getSubscriberMessages}, and (via
 * {@link ConcurrentHashMap}) fixes a genuine thread-safety bug — the map it replaced was a plain
 * {@code HashMap} mutated from concurrent subscribe/unsubscribe/publish requests with no lock of
 * its own. The isolated {@code /sim/*} sandbox gets its own separate instance so a replayed demo
 * can never corrupt the live directory.
 */
@Repository
public class PubSubRepository {

    private final Map<String, Subscriber> subscribersByKey = new ConcurrentHashMap<>();

    static String key(String topicName, String subscriberId) {
        return topicName + "::" + subscriberId;
    }

    public void save(String topicName, Subscriber subscriber) {
        subscribersByKey.put(key(topicName, subscriber.getId()), subscriber);
    }

    public Subscriber find(String topicName, String subscriberId) {
        return subscribersByKey.get(key(topicName, subscriberId));
    }

    public boolean exists(String topicName, String subscriberId) {
        return subscribersByKey.containsKey(key(topicName, subscriberId));
    }

    public void remove(String topicName, String subscriberId) {
        subscribersByKey.remove(key(topicName, subscriberId));
    }

    public int size() {
        return subscribersByKey.size();
    }

    public void clear() {
        subscribersByKey.clear();
    }
}
