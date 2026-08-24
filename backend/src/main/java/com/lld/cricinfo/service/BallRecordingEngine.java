package com.lld.cricinfo.service;

import com.lld.cricinfo.exception.InningsCompleteException;
import com.lld.cricinfo.exception.InvalidBallException;
import com.lld.cricinfo.exception.InvalidMatchStateException;
import com.lld.cricinfo.exception.MatchNotFoundException;
import com.lld.cricinfo.model.*;
import com.lld.cricinfo.observer.BallEvent;
import com.lld.cricinfo.observer.MatchPublisher;
import com.lld.cricinfo.repository.CricinfoRepository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Owns the one compound operation this module's thread safety hinges on:
 * "append this ball to the innings, then fold it into the live scorecard"
 * must be atomic per match — two ball events for the same match arriving
 * concurrently must never interleave (lost update) or apply twice.
 *
 * <p>A per-match {@link ReentrantLock} (looked up via {@code matchId}, same
 * shape as zomato's per-agent lock / uber's per-driver lock) serializes
 * every recordBall call for that match end to end: numbering the ball,
 * appending it to Innings.balls, publishing to every BallEventObserver
 * (which mutate Innings' aggregates synchronously), and running over/innings
 * completion bookkeeping all happen while the lock is held. Different
 * matches use different locks, so scoring two matches concurrently never
 * contends. See CricinfoConcurrencyTest for the invariant this closes.
 */
public class BallRecordingEngine {

    private final CricinfoRepository repository;
    private final MatchPublisher publisher;
    private final Map<String, ReentrantLock> matchLocks = new ConcurrentHashMap<>();
    private final AtomicLong ballIdSeq = new AtomicLong(0);

    public BallRecordingEngine(CricinfoRepository repository, MatchPublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }

    private ReentrantLock lockFor(String matchId) {
        return matchLocks.computeIfAbsent(matchId, id -> new ReentrantLock());
    }

    public Ball recordBall(String matchId, BallRequest request) {
        ReentrantLock lock = lockFor(matchId);
        lock.lock();
        try {
            Match match = repository.getMatch(matchId);
            if (match == null) {
                throw new MatchNotFoundException("Match not found: " + matchId);
            }
            if (match.getStatus() != MatchStatus.LIVE) {
                throw new InvalidMatchStateException(
                        "Cannot record a ball while match is " + match.getStatus());
            }
            Innings innings = match.currentInnings();
            if (innings == null || innings.isCompleted()) {
                throw new InningsCompleteException("Current innings has already ended for match: " + matchId);
            }

            String strikerId = firstNonNull(request.strikerId(), innings.getStrikerId());
            String nonStrikerId = firstNonNull(request.nonStrikerId(), innings.getNonStrikerId());
            String bowlerId = firstNonNull(request.bowlerId(), innings.getCurrentBowlerId());

            if (strikerId == null || nonStrikerId == null || bowlerId == null) {
                throw new InvalidBallException(
                        "strikerId, nonStrikerId and bowlerId are required to start an innings or a new over");
            }
            if (strikerId.equals(nonStrikerId)) {
                throw new InvalidBallException("Striker and non-striker cannot be the same player");
            }

            int legalBallsBowled = innings.getLegalBallsBowled();
            int overNumber = legalBallsBowled / 6;
            int ballInOver = (legalBallsBowled % 6) + 1;
            boolean isNewOver = ballInOver == 1;

            if (isNewOver && innings.getPreviousOverBowlerId() != null
                    && bowlerId.equals(innings.getPreviousOverBowlerId())) {
                throw new InvalidBallException("Bowler " + bowlerId + " cannot bowl two overs in a row");
            }

            validateBallShape(request);

            boolean legalDelivery = request.extraType() == null || request.extraType().isLegalDelivery();
            boolean isBoundary = request.extraType() == null && request.wicket() == false;

            Ball ball = Ball.builder()
                    .id(ballIdSeq.incrementAndGet())
                    .inningsIndex(innings.getIndex())
                    .overNumber(overNumber)
                    .ballInOver(ballInOver)
                    .legalDelivery(legalDelivery)
                    .strikerId(strikerId)
                    .nonStrikerId(nonStrikerId)
                    .bowlerId(bowlerId)
                    .runsOffBat(request.runsOffBat())
                    .extraType(request.extraType())
                    .extraRuns(request.extraRuns())
                    .wicket(request.wicket())
                    .wicketType(request.wicket() ? request.wicketType() : null)
                    .dismissedPlayerId(request.wicket() ? request.dismissedPlayerId() : null)
                    .fielderId(request.wicket() ? request.fielderId() : null)
                    .isFour(isBoundary && request.runsOffBat() == 4)
                    .isSix(isBoundary && request.runsOffBat() == 6)
                    .build();

            innings.getBalls().add(ball);
            innings.setStrikerId(strikerId);
            innings.setNonStrikerId(nonStrikerId);
            innings.setCurrentBowlerId(bowlerId);

            // Synchronous fan-out: every observer mutates its own derived view
            // right here, still inside this match's lock.
            publisher.publish(new BallEvent(match, innings, ball));

            applyStrikeRotation(innings, ball);
            if (legalDelivery && innings.getLegalBallsBowled() % 6 == 0) {
                completeOver(innings, ball);
            }

            maybeCompleteInnings(match, innings);

            repository.saveMatch(match);
            return ball;
        } finally {
            lock.unlock();
        }
    }

    private void validateBallShape(BallRequest request) {
        if (request.runsOffBat() < 0 || request.runsOffBat() > 6) {
            throw new InvalidBallException("runsOffBat must be between 0 and 6");
        }
        ExtraType extraType = request.extraType();
        if (extraType != null && extraType != ExtraType.NO_BALL && request.runsOffBat() != 0) {
            throw new InvalidBallException("Runs off the bat are only possible on a legal delivery or a no ball");
        }
        if ((extraType == ExtraType.WIDE || extraType == ExtraType.BYE || extraType == ExtraType.LEG_BYE
                || extraType == ExtraType.NO_BALL || extraType == ExtraType.PENALTY) && request.extraRuns() < 1) {
            throw new InvalidBallException(extraType + " requires at least 1 extra run");
        }
        if (request.wicket()) {
            if (request.wicketType() == null) {
                throw new InvalidBallException("wicketType is required when wicket=true");
            }
            if (extraType != null && extraType != ExtraType.NO_BALL && request.wicketType() != WicketType.RUN_OUT) {
                throw new InvalidBallException("Only a run-out is possible off a " + extraType);
            }
            if ((request.wicketType() == WicketType.CAUGHT || request.wicketType() == WicketType.STUMPED
                    || request.wicketType() == WicketType.RUN_OUT) && request.fielderId() == null) {
                throw new InvalidBallException(request.wicketType() + " requires a fielderId");
            }
        }
    }

    /** Odd runs actually run between the wickets flip the strike — independent of the over-end swap. */
    private void applyStrikeRotation(Innings innings, Ball ball) {
        if (ball.isWicket()) return; // next batter is assigned explicitly by the caller
        int runsRun = ball.getRunsOffBat();
        if (ball.getExtraType() == ExtraType.BYE || ball.getExtraType() == ExtraType.LEG_BYE) {
            runsRun += ball.getExtraRuns();
        }
        if (runsRun % 2 == 1) {
            swapStrike(innings);
        }
    }

    private void swapStrike(Innings innings) {
        String striker = innings.getStrikerId();
        innings.setStrikerId(innings.getNonStrikerId());
        innings.setNonStrikerId(striker);
    }

    private void completeOver(Innings innings, Ball ball) {
        innings.setPreviousOverBowlerId(ball.getBowlerId());
        innings.setCurrentBowlerId(null);
        if (!ball.isWicket()) {
            swapStrike(innings);
        }
    }

    private void maybeCompleteInnings(Match match, Innings innings) {
        Integer oversLimit = match.getFormat().getOversLimit();
        boolean allOut = innings.getWickets() >= 10;
        boolean oversUp = oversLimit != null && innings.getLegalBallsBowled() >= oversLimit * 6;
        boolean targetChased = innings.getTargetRuns() != null && innings.getTotalRuns() >= innings.getTargetRuns();

        if (allOut || oversUp || targetChased) {
            innings.setCompleted(true);
        }
    }

    private String firstNonNull(String a, String b) {
        return a != null ? a : b;
    }
}
