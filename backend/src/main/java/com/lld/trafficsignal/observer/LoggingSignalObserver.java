package com.lld.trafficsignal.observer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Writes every phase change to the server log — demonstrates a sink with no in-memory state.
 *
 * <p>Logged at DEBUG, not INFO: the production ticker fires every second for the lifetime of
 * the process (see {@link com.lld.trafficsignal.clock.ScheduledExecutorSignalTicker}), so at
 * default log level this would flood stdout indefinitely for as long as the backend runs
 * (RCA-018). Enable {@code logging.level.com.lld.trafficsignal=DEBUG} to observe it.
 */
public class LoggingSignalObserver implements SignalObserver {

    private static final Logger log = LoggerFactory.getLogger(LoggingSignalObserver.class);

    @Override
    public void onSignalChange(SignalChangeEvent event) {
        log.debug("intersection={} light={} ({}) {} -> {}",
                event.getIntersectionId(), event.getLightId(), event.getPosition(),
                event.getPreviousPhase(), event.getNewPhase());
    }
}
