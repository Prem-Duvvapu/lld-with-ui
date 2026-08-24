package com.lld.cricinfo.service;

import com.lld.cricinfo.model.*;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Fixed, deterministic seed data — two fictional squads and a hand-authored
 * opening sequence of balls so the live demo shows a match already in
 * progress on first load, plus small "who bats/bowls next" helpers reused
 * by the /sim engine.
 */
final class DemoData {

    private DemoData() {
    }

    static Team coastalKings() {
        return Team.builder()
                .id("TEAM-KNG")
                .name("Coastal Kings")
                .shortName("KNG")
                .captainId("P-KNG-4")
                .players(List.of(
                        player("P-KNG-1", "Rohan Verma", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-KNG-2", "Aditya Rao", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-KNG-3", "Karan Mehta", PlayerRole.BATSMAN, BattingStyle.LEFT_HANDED, BowlingStyle.NONE),
                        player("P-KNG-4", "Suresh Iyer", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-KNG-5", "Vikram Singh", PlayerRole.ALL_ROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.MEDIUM),
                        player("P-KNG-6", "Arjun Nair", PlayerRole.ALL_ROUNDER, BattingStyle.LEFT_HANDED, BowlingStyle.SPIN),
                        player("P-KNG-7", "Rahul Khanna", PlayerRole.WICKETKEEPER, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-KNG-8", "Manish Yadav", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.FAST),
                        player("P-KNG-9", "Deepak Chawla", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.FAST),
                        player("P-KNG-10", "Sanjay Bhatt", PlayerRole.BOWLER, BattingStyle.LEFT_HANDED, BowlingStyle.SPIN),
                        player("P-KNG-11", "Nikhil Joshi", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.MEDIUM)
                ))
                .build();
    }

    static Team northernTitans() {
        return Team.builder()
                .id("TEAM-TTN")
                .name("Northern Titans")
                .shortName("TTN")
                .captainId("P-TTN-4")
                .players(List.of(
                        player("P-TTN-1", "Farhan Ali", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-TTN-2", "Yusuf Khan", PlayerRole.BATSMAN, BattingStyle.LEFT_HANDED, BowlingStyle.NONE),
                        player("P-TTN-3", "Ibrahim Sheikh", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-TTN-4", "Zaid Ansari", PlayerRole.BATSMAN, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-TTN-5", "Omar Siddiqui", PlayerRole.ALL_ROUNDER, BattingStyle.RIGHT_HANDED, BowlingStyle.MEDIUM),
                        player("P-TTN-6", "Bilal Ahmed", PlayerRole.ALL_ROUNDER, BattingStyle.LEFT_HANDED, BowlingStyle.SPIN),
                        player("P-TTN-7", "Kabir Rizvi", PlayerRole.WICKETKEEPER, BattingStyle.RIGHT_HANDED, BowlingStyle.NONE),
                        player("P-TTN-8", "Hamza Qureshi", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.FAST),
                        player("P-TTN-9", "Salman Baig", PlayerRole.BOWLER, BattingStyle.LEFT_HANDED, BowlingStyle.FAST),
                        player("P-TTN-10", "Tariq Malik", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.SPIN),
                        player("P-TTN-11", "Naveed Iqbal", PlayerRole.BOWLER, BattingStyle.RIGHT_HANDED, BowlingStyle.MEDIUM)
                ))
                .build();
    }

    private static Player player(String id, String name, PlayerRole role, BattingStyle battingStyle, BowlingStyle bowlingStyle) {
        return Player.builder()
                .id(id)
                .name(name)
                .role(role)
                .battingStyle(battingStyle)
                .bowlingStyle(bowlingStyle)
                .careerStats(CareerStats.builder().matchesPlayed(1).build())
                .build();
    }

    /** Hand-authored opening sequence: 1 over + 3 balls, one wicket, so the live demo shows a match in progress. */
    static void bowlOpeningOvers(CricinfoService service, String matchId, Team batting, Team bowling) {
        String striker1 = "P-KNG-1";
        String striker2 = "P-KNG-2";
        String striker3 = "P-KNG-3";
        String bowler1 = "P-TTN-8";
        String bowler2 = "P-TTN-9";
        String fielder = "P-TTN-5";

        service.recordBall(matchId, new BallRequest(striker1, striker2, bowler1, 1, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 4, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 0, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 6, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 0, ExtraType.WIDE, 1, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 2, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 0, null, 0, true, WicketType.CAUGHT, null, fielder));

        service.recordBall(matchId, new BallRequest(striker3, null, bowler2, 1, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 4, null, 0, false, null, null, null));
        service.recordBall(matchId, new BallRequest(null, null, null, 1, null, 0, false, null, null, null));
    }

    static String pickNextBowler(Team bowlingTeam, String excludePreviousOverBowlerId) {
        for (Player p : bowlingTeam.getPlayers()) {
            boolean canBowl = p.getRole() == PlayerRole.BOWLER || p.getRole() == PlayerRole.ALL_ROUNDER;
            if (canBowl && !p.getId().equals(excludePreviousOverBowlerId)) {
                return p.getId();
            }
        }
        for (Player p : bowlingTeam.getPlayers()) {
            if (!p.getId().equals(excludePreviousOverBowlerId)) return p.getId();
        }
        return bowlingTeam.getPlayers().get(0).getId();
    }

    static String pickFielder(Team bowlingTeam, String excludeBowlerId) {
        for (Player p : bowlingTeam.getPlayers()) {
            if (!p.getId().equals(excludeBowlerId)) return p.getId();
        }
        return bowlingTeam.getPlayers().get(0).getId();
    }

    static String pickNextBatsman(Team battingTeam, Collection<String> alreadyAtCreaseOrOut) {
        for (Player p : battingTeam.getPlayers()) {
            if (!alreadyAtCreaseOrOut.contains(p.getId())) {
                return p.getId();
            }
        }
        return null;
    }
}
