package com.lld.cricinfo.observer;

/**
 * Subject/Observer contract for ball-by-ball fan-out — the same shape as
 * stockbroker's StockPriceObserver / linkedin's NotificationObserver.
 * Every concrete observer folds the raw ball stream into one derived view
 * (live scorecard, career stats, commentary, audit log) without the
 * publisher or the engine knowing which views exist.
 */
public interface BallEventObserver {

    void onBallBowled(BallEvent event);

    /** Stable name used by the toggle API and the /sim telemetry HUD. */
    String getObserverName();
}
