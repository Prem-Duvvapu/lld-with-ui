package com.lld.trafficsignal.observer;

/**
 * One observer of signal phase changes. Implementations are notified by
 * {@link SignalChangeNotifier} on every transition — automatic (timer expiry), manual, or
 * emergency-override induced.
 *
 * <p>Observers must never throw into the publisher and must never mutate signal state — they are
 * read-only views of the event stream.
 */
public interface SignalObserver {
    void onSignalChange(SignalChangeEvent event);
}
