package com.lld.jobscheduler.misfire;

import com.lld.jobscheduler.exception.InvalidScheduleException;
import org.springframework.stereotype.Component;

/**
 * Resolves a {@link MisfirePolicyType} to its stateless singleton implementation — the factory
 * half of this module's second Strategy, so callers never {@code if/else} on policy type.
 */
@Component
public class MisfirePolicyFactory {
    private final FireImmediatelyMisfirePolicy fireImmediately = new FireImmediatelyMisfirePolicy();
    private final SkipToNextOccurrenceMisfirePolicy skipToNextOccurrence = new SkipToNextOccurrenceMisfirePolicy();

    public MisfirePolicy get(MisfirePolicyType type) {
        if (type == null) {
            return fireImmediately; // a reasonable default: run the job late rather than silently drop it
        }
        switch (type) {
            case FIRE_IMMEDIATELY:
                return fireImmediately;
            case SKIP_TO_NEXT_OCCURRENCE:
                return skipToNextOccurrence;
            default:
                throw new InvalidScheduleException("unsupported misfire policy: " + type);
        }
    }

    /** Case-insensitive convenience for the controller, which receives a plain JSON string. */
    public MisfirePolicy get(String typeName) {
        if (typeName == null || typeName.isBlank()) {
            return fireImmediately;
        }
        try {
            return get(MisfirePolicyType.valueOf(typeName.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new InvalidScheduleException("unknown misfire policy: " + typeName);
        }
    }
}
