package com.lld.cricinfo.observer;

import com.lld.cricinfo.model.Ball;
import com.lld.cricinfo.model.CareerStats;
import com.lld.cricinfo.model.ExtraType;
import com.lld.cricinfo.model.Player;
import org.springframework.stereotype.Component;

/**
 * A second, independent observer over the same ball stream — updates each
 * involved Player's career aggregates. Demonstrates the point of Observer
 * here: this view (career numbers) and ScorecardProjectionObserver's view
 * (this innings' scorecard) are computed from the identical event without
 * either one knowing the other exists.
 */
@Component
public class PlayerCareerStatsObserver implements BallEventObserver {

    @Override
    public void onBallBowled(BallEvent event) {
        Ball ball = event.ball();
        Player striker = findPlayer(event, ball.getStrikerId());
        Player bowler = findPlayer(event, ball.getBowlerId());

        if (striker != null) {
            CareerStats stats = striker.getCareerStats();
            stats.setTotalRuns(stats.getTotalRuns() + ball.getRunsOffBat());
            if (ball.getExtraType() != ExtraType.WIDE) {
                stats.setTotalBallsFaced(stats.getTotalBallsFaced() + 1);
            }
            if (ball.isFour()) stats.setTotalFours(stats.getTotalFours() + 1);
            if (ball.isSix()) stats.setTotalSixes(stats.getTotalSixes() + 1);
            if (ball.isWicket() && ball.getStrikerId().equals(
                    ball.getDismissedPlayerId() != null ? ball.getDismissedPlayerId() : ball.getStrikerId())) {
                stats.setDismissals(stats.getDismissals() + 1);
            }
        }

        if (bowler != null) {
            CareerStats stats = bowler.getCareerStats();
            if (ball.isLegalDelivery()) {
                stats.setTotalBallsBowled(stats.getTotalBallsBowled() + 1);
            }
            boolean chargedToBowler = ball.getExtraType() == null
                    || ball.getExtraType() == ExtraType.WIDE
                    || ball.getExtraType() == ExtraType.NO_BALL;
            if (chargedToBowler) {
                stats.setTotalRunsConceded(stats.getTotalRunsConceded() + ball.totalRuns());
            }
            if (ball.isWicket() && ball.getWicketType() != null && ball.getWicketType().creditsBowler()) {
                stats.setTotalWicketsTaken(stats.getTotalWicketsTaken() + 1);
            }
        }
    }

    private Player findPlayer(BallEvent event, String playerId) {
        if (playerId == null) return null;
        for (Player p : event.match().getTeamA().getPlayers()) {
            if (p.getId().equals(playerId)) return p;
        }
        for (Player p : event.match().getTeamB().getPlayers()) {
            if (p.getId().equals(playerId)) return p;
        }
        return null;
    }

    @Override
    public String getObserverName() {
        return "PlayerCareerStats";
    }
}
