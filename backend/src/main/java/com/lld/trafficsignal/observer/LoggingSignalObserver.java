package com.lld.trafficsignal.observer;

/** Writes every phase change to the server log — demonstrates a sink with no in-memory state. */
public class LoggingSignalObserver implements SignalObserver {

    @Override
    public void onSignalChange(SignalChangeEvent event) {
        System.out.printf("[trafficsignal] intersection=%d light=%d (%s) %s -> %s%n",
                event.getIntersectionId(), event.getLightId(), event.getPosition(),
                event.getPreviousPhase(), event.getNewPhase());
    }
}
