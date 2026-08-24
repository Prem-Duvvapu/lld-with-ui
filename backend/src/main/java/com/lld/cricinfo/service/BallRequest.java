package com.lld.cricinfo.service;

import com.lld.cricinfo.model.ExtraType;
import com.lld.cricinfo.model.WicketType;

/**
 * Caller-supplied delivery payload. strikerId/nonStrikerId/bowlerId may be
 * null to mean "continue with whoever is already at the crease/bowling" —
 * required only at the start of an innings or a new over.
 */
public record BallRequest(
        String strikerId,
        String nonStrikerId,
        String bowlerId,
        int runsOffBat,
        ExtraType extraType,
        int extraRuns,
        boolean wicket,
        WicketType wicketType,
        String dismissedPlayerId,
        String fielderId
) {
}
