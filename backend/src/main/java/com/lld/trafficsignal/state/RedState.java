package com.lld.trafficsignal.state;

import com.lld.trafficsignal.model.LightState;

/** RED holds for {@value DURATION_SECONDS}s, then legally advances only to {@link GreenState}. */
public final class RedState implements SignalState {
    public static final int DURATION_SECONDS = 10;
    public static final RedState INSTANCE = new RedState();

    private RedState() {}

    @Override
    public LightState getPhase() {
        return LightState.RED;
    }

    @Override
    public int getDurationSeconds() {
        return DURATION_SECONDS;
    }

    @Override
    public SignalState next() {
        return GreenState.INSTANCE;
    }
}
