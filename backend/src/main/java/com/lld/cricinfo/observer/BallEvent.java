package com.lld.cricinfo.observer;

import com.lld.cricinfo.model.Ball;
import com.lld.cricinfo.model.Innings;
import com.lld.cricinfo.model.Match;

/**
 * The payload published to every subscriber the instant a ball is recorded.
 * Carries the mutable Match/Innings/Ball references rather than a snapshot —
 * observers run synchronously, inside the same per-match lock that recorded
 * the ball (see BallRecordingEngine), so there is no risk of an observer
 * reading state a concurrent ball is still mutating.
 */
public record BallEvent(Match match, Innings innings, Ball ball) {
}
