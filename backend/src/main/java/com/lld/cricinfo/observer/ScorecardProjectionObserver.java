package com.lld.cricinfo.observer;

import com.lld.cricinfo.model.*;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The primary observer: folds the ball-by-ball stream into Innings' running
 * aggregates (runs, wickets, overs, extras, per-player batting/bowling
 * stats, fall of wickets) and republishes a {@link Scorecard} read-model per
 * match. This is the "live scorecard projection" the design data calls out
 * — clients read {@link #getScorecard(String)} instead of re-deriving score
 * from raw balls themselves.
 *
 * <p>Innings itself never mutates its own totals; this is the one place a
 * Ball turns into score, so there is a single, auditable fold function.
 * BallRecordingEngine calls {@link MatchPublisher#publish} synchronously
 * inside the per-match lock that appended the ball, so this method always
 * runs with exclusive access to the Innings it is mutating — see the
 * concurrency test asserting no lost/double-counted runs under concurrent
 * recordBall calls for the same match.
 */
@Component
public class ScorecardProjectionObserver implements BallEventObserver {

    private final Map<String, Scorecard> scorecards = new ConcurrentHashMap<>();

    @Override
    public void onBallBowled(BallEvent event) {
        Match match = event.match();
        Innings innings = event.innings();
        Ball ball = event.ball();

        applyToInnings(match, innings, ball);
        scorecards.put(match.getId(), buildScorecard(match, innings));
    }

    private void applyToInnings(Match match, Innings innings, Ball ball) {
        innings.setTotalRuns(innings.getTotalRuns() + ball.totalRuns());
        if (ball.isLegalDelivery()) {
            innings.setLegalBallsBowled(innings.getLegalBallsBowled() + 1);
        }

        ExtraType extraType = ball.getExtraType();
        if (extraType != null) {
            switch (extraType) {
                case WIDE -> innings.setExtraWides(innings.getExtraWides() + ball.getExtraRuns());
                case NO_BALL -> innings.setExtraNoBalls(innings.getExtraNoBalls() + ball.getExtraRuns());
                case BYE -> innings.setExtraByes(innings.getExtraByes() + ball.getExtraRuns());
                case LEG_BYE -> innings.setExtraLegByes(innings.getExtraLegByes() + ball.getExtraRuns());
                case PENALTY -> innings.setExtraPenalties(innings.getExtraPenalties() + ball.getExtraRuns());
            }
        }

        BattingStat strikerStat = innings.getBattingStats().computeIfAbsent(ball.getStrikerId(),
                id -> BattingStat.builder().playerId(id).playerName(resolvePlayerName(match, id)).build());
        boolean batsmanFacedBall = extraType != ExtraType.WIDE;
        if (batsmanFacedBall) {
            strikerStat.setBallsFaced(strikerStat.getBallsFaced() + 1);
        }
        strikerStat.setRuns(strikerStat.getRuns() + ball.getRunsOffBat());
        if (ball.isFour()) strikerStat.setFours(strikerStat.getFours() + 1);
        if (ball.isSix()) strikerStat.setSixes(strikerStat.getSixes() + 1);

        BowlingStat bowlerStat = innings.getBowlingStats().computeIfAbsent(ball.getBowlerId(),
                id -> BowlingStat.builder().playerId(id).playerName(resolvePlayerName(match, id)).build());
        if (ball.isLegalDelivery()) {
            bowlerStat.setLegalBallsBowled(bowlerStat.getLegalBallsBowled() + 1);
        }
        boolean chargedToBowler = extraType == null || extraType == ExtraType.WIDE || extraType == ExtraType.NO_BALL;
        if (chargedToBowler) {
            bowlerStat.setRunsConceded(bowlerStat.getRunsConceded() + ball.totalRuns());
        }

        if (ball.isWicket()) {
            innings.setWickets(innings.getWickets() + 1);
            String dismissedId = ball.getDismissedPlayerId() != null ? ball.getDismissedPlayerId() : ball.getStrikerId();
            BattingStat dismissedStat = innings.getBattingStats().computeIfAbsent(dismissedId,
                    id -> BattingStat.builder().playerId(id).playerName(resolvePlayerName(match, id)).build());
            dismissedStat.setOut(true);
            dismissedStat.setDismissalDescription(describeDismissal(match, ball));

            if (ball.getWicketType() != null && ball.getWicketType().creditsBowler()) {
                bowlerStat.setWickets(bowlerStat.getWickets() + 1);
            }

            innings.getFallOfWickets().add(FallOfWicket.builder()
                    .wicketNumber(innings.getWickets())
                    .playerOutId(dismissedId)
                    .playerOutName(dismissedStat.getPlayerName())
                    .teamScoreAtFall(innings.getTotalRuns())
                    .oversDisplay(innings.oversDisplay())
                    .wicketType(ball.getWicketType())
                    .build());
        }
    }

    private String describeDismissal(Match match, Ball ball) {
        if (ball.getWicketType() == null) return "out";
        String bowlerName = resolvePlayerName(match, ball.getBowlerId());
        return switch (ball.getWicketType()) {
            case BOWLED -> "b " + bowlerName;
            case CAUGHT -> "c " + resolvePlayerName(match, ball.getFielderId()) + " b " + bowlerName;
            case LBW -> "lbw b " + bowlerName;
            case STUMPED -> "st " + resolvePlayerName(match, ball.getFielderId()) + " b " + bowlerName;
            case RUN_OUT -> "run out (" + resolvePlayerName(match, ball.getFielderId()) + ")";
            case HIT_WICKET -> "hit wicket b " + bowlerName;
        };
    }

    private String resolvePlayerName(Match match, String playerId) {
        if (playerId == null) return "Unknown";
        for (Player p : match.getTeamA().getPlayers()) {
            if (p.getId().equals(playerId)) return p.getName();
        }
        for (Player p : match.getTeamB().getPlayers()) {
            if (p.getId().equals(playerId)) return p.getName();
        }
        return playerId;
    }

    private Scorecard buildScorecard(Match match, Innings innings) {
        BattingStat striker = innings.getBattingStats().get(innings.getStrikerId());
        BattingStat nonStriker = innings.getBattingStats().get(innings.getNonStrikerId());
        BowlingStat bowler = innings.getBowlingStats().get(innings.getCurrentBowlerId());

        List<String> recent = new ArrayList<>();
        List<Ball> balls = innings.getBalls();
        int from = Math.max(0, balls.size() - 6);
        for (int i = from; i < balls.size(); i++) {
            recent.add(formatBallLabel(balls.get(i)));
        }

        Integer target = innings.getTargetRuns();
        Double requiredRunRate = null;
        if (target != null && match.getFormat().getOversLimit() != null) {
            int ballsLeft = match.getFormat().getOversLimit() * 6 - innings.getLegalBallsBowled();
            int runsNeeded = target - innings.getTotalRuns();
            if (ballsLeft > 0 && runsNeeded > 0) {
                requiredRunRate = Math.round((runsNeeded * 6.0 / ballsLeft) * 100.0) / 100.0;
            }
        }

        return Scorecard.builder()
                .matchId(match.getId())
                .inningsIndex(innings.getIndex())
                .battingTeamName(innings.getBattingTeamName())
                .bowlingTeamName(innings.getBowlingTeamName())
                .totalRuns(innings.getTotalRuns())
                .wickets(innings.getWickets())
                .oversDisplay(innings.oversDisplay())
                .oversLimit(match.getFormat().getOversLimit())
                .runRate(innings.runRate())
                .requiredRunRate(requiredRunRate)
                .target(target)
                .strikerName(striker != null ? striker.getPlayerName() : null)
                .strikerRuns(striker != null ? striker.getRuns() : 0)
                .strikerBalls(striker != null ? striker.getBallsFaced() : 0)
                .nonStrikerName(nonStriker != null ? nonStriker.getPlayerName() : null)
                .nonStrikerRuns(nonStriker != null ? nonStriker.getRuns() : 0)
                .nonStrikerBalls(nonStriker != null ? nonStriker.getBallsFaced() : 0)
                .currentBowlerName(bowler != null ? bowler.getPlayerName() : null)
                .currentBowlerFigures(bowler != null
                        ? bowler.getOversDisplay() + "-0-" + bowler.getRunsConceded() + "-" + bowler.getWickets()
                        : null)
                .recentBalls(recent)
                .fallOfWickets(new ArrayList<>(innings.getFallOfWickets()))
                .battingStats(new ArrayList<>(innings.getBattingStats().values()))
                .bowlingStats(new ArrayList<>(innings.getBowlingStats().values()))
                .inningsCompleted(innings.isCompleted())
                .matchCompleted(match.getStatus() == MatchStatus.COMPLETED)
                .matchStatusSummary(match.getResult() != null ? match.getResult().getSummary() : match.getStatus().name())
                .lastUpdated(Instant.now())
                .build();
    }

    private String formatBallLabel(Ball ball) {
        if (ball.isWicket()) return "W";
        ExtraType extraType = ball.getExtraType();
        if (extraType == null) return String.valueOf(ball.getRunsOffBat());
        return switch (extraType) {
            case WIDE -> "wd" + (ball.getExtraRuns() > 1 ? ball.getExtraRuns() : "");
            case NO_BALL -> "nb" + (ball.getRunsOffBat() > 0 ? "+" + ball.getRunsOffBat() : "");
            case BYE -> "b" + ball.getExtraRuns();
            case LEG_BYE -> "lb" + ball.getExtraRuns();
            case PENALTY -> "pen" + ball.getExtraRuns();
        };
    }

    public Scorecard getScorecard(String matchId) {
        return scorecards.get(matchId);
    }

    public void clear(String matchId) {
        scorecards.remove(matchId);
    }

    @Override
    public String getObserverName() {
        return "ScorecardProjection";
    }
}
