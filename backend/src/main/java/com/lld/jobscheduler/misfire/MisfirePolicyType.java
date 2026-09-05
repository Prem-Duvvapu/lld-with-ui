package com.lld.jobscheduler.misfire;

/** The two {@link MisfirePolicy} implementations {@link MisfirePolicyFactory} resolves. */
public enum MisfirePolicyType {
    FIRE_IMMEDIATELY,
    SKIP_TO_NEXT_OCCURRENCE
}
