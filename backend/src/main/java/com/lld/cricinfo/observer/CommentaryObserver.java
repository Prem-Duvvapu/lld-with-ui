package com.lld.cricinfo.observer;

import com.lld.cricinfo.model.Ball;
import com.lld.cricinfo.model.CommentaryEntry;
import com.lld.cricinfo.model.ExtraType;
import com.lld.cricinfo.model.Player;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Third observer: generates ball-by-ball text commentary. Kept separate from
 * scoring so commentary can be muted (see CricinfoService#toggleObserver)
 * without touching the scorecard projection.
 */
@Component
public class CommentaryObserver implements BallEventObserver {

    private final Map<String, List<CommentaryEntry>> commentaryByMatch = new ConcurrentHashMap<>();

    @Override
    public void onBallBowled(BallEvent event) {
        Ball ball = event.ball();
        String text = describe(event);

        CommentaryEntry entry = CommentaryEntry.builder()
                .matchId(event.match().getId())
                .inningsIndex(event.innings().getIndex())
                .overNumber(ball.getOverNumber())
                .ballInOver(ball.getBallInOver())
                .text(text)
                .build();

        commentaryByMatch.computeIfAbsent(event.match().getId(), id -> new CopyOnWriteArrayList<>()).add(entry);
    }

    private String describe(BallEvent event) {
        Ball ball = event.ball();
        String bowlerName = resolveName(event, ball.getBowlerId());
        String strikerName = resolveName(event, ball.getStrikerId());
        String overLabel = ball.getOverNumber() + "." + ball.getBallInOver();

        if (ball.isWicket()) {
            return overLabel + " " + bowlerName + " to " + strikerName + " — OUT! "
                    + (ball.getWicketType() != null ? ball.getWicketType().name() : "wicket");
        }
        if (ball.isSix()) {
            return overLabel + " " + bowlerName + " to " + strikerName + " — SIX! Maximum, into the stands.";
        }
        if (ball.isFour()) {
            return overLabel + " " + bowlerName + " to " + strikerName + " — FOUR! Races away to the boundary.";
        }
        ExtraType extraType = ball.getExtraType();
        if (extraType == ExtraType.WIDE) {
            return overLabel + " " + bowlerName + " strays down leg — wide, " + ball.getExtraRuns() + " extra.";
        }
        if (extraType == ExtraType.NO_BALL) {
            return overLabel + " " + bowlerName + " oversteps — no ball! " + ball.getRunsOffBat() + " run(s) off the bat too.";
        }
        if (extraType == ExtraType.BYE || extraType == ExtraType.LEG_BYE) {
            return overLabel + " " + bowlerName + " to " + strikerName + " — " + ball.getExtraRuns()
                    + " " + extraType.name().toLowerCase().replace('_', ' ') + "(s).";
        }
        if (ball.getRunsOffBat() == 0) {
            return overLabel + " " + bowlerName + " to " + strikerName + " — no run, defended solidly.";
        }
        return overLabel + " " + bowlerName + " to " + strikerName + " — " + ball.getRunsOffBat() + " run(s) taken.";
    }

    private String resolveName(BallEvent event, String playerId) {
        if (playerId == null) return "Unknown";
        for (Player p : event.match().getTeamA().getPlayers()) {
            if (p.getId().equals(playerId)) return p.getName();
        }
        for (Player p : event.match().getTeamB().getPlayers()) {
            if (p.getId().equals(playerId)) return p.getName();
        }
        return playerId;
    }

    public List<CommentaryEntry> getCommentary(String matchId) {
        return List.copyOf(commentaryByMatch.getOrDefault(matchId, List.of()));
    }

    public void clear(String matchId) {
        commentaryByMatch.remove(matchId);
    }

    @Override
    public String getObserverName() {
        return "Commentary";
    }
}
