package com.lld.trafficsignal.state;

import com.lld.trafficsignal.model.LightState;

/** GREEN holds for {@value DURATION_SECONDS}s, then legally advances only to {@link YellowState}. */
public final class GreenState implements SignalState {
    public static final int DURATION_SECONDS = 8;
    public static final GreenState INSTANCE = new GreenState();

    private GreenState() {}

    @Override
    public LightState getPhase() {
        return LightState.GREEN;
    }

    @Override
    public int getDurationSeconds() {
        return DURATION_SECONDS;
    }

    @Override
    public SignalState next() {
        return YellowState.INSTANCE;
    }
}
