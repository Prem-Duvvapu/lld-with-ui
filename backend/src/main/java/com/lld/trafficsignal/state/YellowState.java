package com.lld.trafficsignal.state;

import com.lld.trafficsignal.model.LightState;

/** YELLOW holds for {@value DURATION_SECONDS}s, then legally advances only to {@link RedState}. */
public final class YellowState implements SignalState {
    public static final int DURATION_SECONDS = 3;
    public static final YellowState INSTANCE = new YellowState();

    private YellowState() {}

    @Override
    public LightState getPhase() {
        return LightState.YELLOW;
    }

    @Override
    public int getDurationSeconds() {
        return DURATION_SECONDS;
    }

    @Override
    public SignalState next() {
        return RedState.INSTANCE;
    }
}
