package com.lld.cricinfo;

import com.lld.cricinfo.exception.InvalidBallException;
import com.lld.cricinfo.exception.InvalidMatchStateException;
import com.lld.cricinfo.model.*;
import com.lld.cricinfo.observer.*;
import com.lld.cricinfo.repository.CricinfoRepository;
import com.lld.cricinfo.service.BallRequest;
import com.lld.cricinfo.service.CricinfoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CricinfoService — match lifecycle and ball-by-ball scoring workflow")
class CricinfoServiceTest {

    private CricinfoService service;
    private String teamAId;
    private String teamBId;

    @BeforeEach
    void setUp() {
        CricinfoRepository repository = new CricinfoRepository();
        MatchPublisher publisher = new MatchPublisher();
        service = new CricinfoService(repository, publisher,
                new ScorecardProjectionObserver(), new PlayerCareerStatsObserver(),
                new CommentaryObserver(), new BallEventAuditObserver());

        Team teamA = service.registerTeam(team("TEAM-A", "Alpha XI", "A-1", "A-2", "A-3", "A-4"));
        Team teamB = service.registerTeam(team("TEAM-B", "Beta XI", "B-1", "B-2", "B-3", "B-4"));
        teamAId = teamA.getId();
        teamBId = teamB.getId();
    }

    private Team team(String id, String name, String... playerIds) {
        List<Player> players = new ArrayList<>();
        for (String pid : playerIds) {
            players.add(Player.builder().id(pid).name(pid).role(PlayerRole.ALL_ROUNDER)
                    .battingStyle(BattingStyle.RIGHT_HANDED).bowlingStyle(BowlingStyle.MEDIUM)
                    .careerStats(CareerStats.builder().build()).build());
        }
        return Team.builder().id(id).name(name).shortName(id).captainId(playerIds[0]).players(players).build();
    }

    @Test
    @DisplayName("createMatch starts UPCOMING and rejects a team playing itself")
    void createMatch_upcomingStatus() {
        Match match = service.createMatch(teamAId, teamBId, "Test Ground", MatchFormat.T20, null);
        assertEquals(MatchStatus.UPCOMING, match.getStatus());
        assertThrows(InvalidMatchStateException.class,
                () -> service.createMatch(teamAId, teamAId, "X", MatchFormat.T20, null));
    }

    @Test
    @DisplayName("Starting a match before the toss is rejected")
    void startMatch_beforeToss_rejected() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        assertThrows(InvalidMatchStateException.class, () -> service.startMatch(match.getId()));
    }

    @Test
    @DisplayName("Recording a ball before the match is LIVE is rejected")
    void recordBall_beforeStart_rejected() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        assertThrows(InvalidMatchStateException.class, () -> service.recordBall(match.getId(),
                new BallRequest("A-1", "A-2", "B-1", 1, null, 0, false, null, null, null)));
    }

    @Test
    @DisplayName("Happy path: toss, start, bowl a few balls — scorecard projection reflects them")
    void happyPath_scorecardReflectsBalls() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());

        service.recordBall(match.getId(), new BallRequest("A-1", "A-2", "B-1", 4, null, 0, false, null, null, null));
        service.recordBall(match.getId(), new BallRequest(null, null, null, 1, null, 0, false, null, null, null));
        service.recordBall(match.getId(), new BallRequest(null, null, null, 0, ExtraType.WIDE, 1, false, null, null, null));

        Scorecard scorecard = service.getScorecard(match.getId());
        assertEquals(6, scorecard.getTotalRuns()); // 4 + 1 + 1(wide)
        assertEquals(0, scorecard.getWickets());
        assertEquals("0.2", scorecard.getOversDisplay()); // only 2 legal deliveries
    }

    @Test
    @DisplayName("A wicket increments wickets and records fall of wicket")
    void wicket_updatesScorecardAndFallOfWickets() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());

        service.recordBall(match.getId(),
                new BallRequest("A-1", "A-2", "B-1", 0, null, 0, true, WicketType.BOWLED, null, null));

        Scorecard scorecard = service.getScorecard(match.getId());
        assertEquals(1, scorecard.getWickets());
        assertEquals(1, scorecard.getFallOfWickets().size());
        assertEquals("A-1", scorecard.getFallOfWickets().get(0).getPlayerOutId());
    }

    @Test
    @DisplayName("A bowler cannot bowl two overs in a row")
    void sameBowlerConsecutiveOvers_rejected() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());

        for (int i = 0; i < 6; i++) {
            service.recordBall(match.getId(), new BallRequest(
                    i == 0 ? "A-1" : null, i == 0 ? "A-2" : null, i == 0 ? "B-1" : null,
                    0, null, 0, false, null, null, null));
        }
        assertThrows(InvalidBallException.class, () -> service.recordBall(match.getId(),
                new BallRequest(null, null, "B-1", 1, null, 0, false, null, null, null)));
    }

    @Test
    @DisplayName("Runs off the bat on a wide is rejected as an invalid ball shape")
    void invalidBallShape_rejected() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());

        assertThrows(InvalidBallException.class, () -> service.recordBall(match.getId(),
                new BallRequest("A-1", "A-2", "B-1", 4, ExtraType.WIDE, 1, false, null, null, null)));
    }

    @Test
    @DisplayName("Full T20 innings completes on overs exhausted, moves to INNINGS_BREAK, second innings can start")
    void inningsCompletesOnOversExhausted_thenNextInningsStarts() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());

        bowlDotOvers(match.getId(), 20, "B-1", "B-2", "A-1", "A-2");

        Match afterFirstInnings = service.getMatch(match.getId());
        assertEquals(MatchStatus.INNINGS_BREAK, afterFirstInnings.getStatus());
        assertTrue(afterFirstInnings.getInnings().get(0).isCompleted());

        Innings second = service.startNextInnings(match.getId());
        assertEquals(1, second.getIndex());
        assertEquals(teamBId, second.getBattingTeamId());
        assertEquals(1, second.getTargetRuns()); // first innings scored 0 -> target = 1
        assertEquals(MatchStatus.LIVE, service.getMatch(match.getId()).getStatus());
    }

    @Test
    @DisplayName("Match ties when both teams score the same total")
    void tiedMatch_resultTie() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());
        bowlDotOvers(match.getId(), 20, "B-1", "B-2", "A-1", "A-2");
        service.startNextInnings(match.getId());
        bowlDotOvers(match.getId(), 20, "A-1", "A-2", "B-1", "B-2");

        Match finished = service.getMatch(match.getId());
        assertEquals(MatchStatus.COMPLETED, finished.getStatus());
        assertEquals(ResultType.TIE, finished.getResult().getResultType());
    }

    @Test
    @DisplayName("Chasing team winning is reported as won-by-wickets")
    void chasingTeamWins_reportedByWickets() {
        Match match = service.createMatch(teamAId, teamBId, "Ground", MatchFormat.T20, null);
        service.performToss(match.getId(), teamAId, TossChoice.BAT);
        service.startMatch(match.getId());
        // First innings: one four, rest dots -> target 5
        service.recordBall(match.getId(), new BallRequest("A-1", "A-2", "B-1", 4, null, 0, false, null, null, null));
        bowlRemainderOfDotOvers(match.getId(), 20, 1, "B-1", "B-2");
        service.startNextInnings(match.getId());
        // Second innings: hit a six on the very first ball, immediately clears target of 5
        service.recordBall(match.getId(), new BallRequest("B-1", "B-2", "A-1", 6, null, 0, false, null, null, null));

        Match afterChase = service.getMatch(match.getId());
        assertEquals(MatchStatus.COMPLETED, afterChase.getStatus());
        assertEquals(ResultType.WON_BY_WICKETS, afterChase.getResult().getResultType());
        assertEquals(teamBId, afterChase.getResult().getWinningTeamId());
    }

    @Test
    @DisplayName("toggleObserver unsubscribes and resubscribes a non-core observer")
    void toggleObserver_controlsFanOut() {
        var status = service.getObserverStatus();
        assertEquals(4, status.size());

        service.toggleObserver("Commentary", false);
        var afterDisable = service.getObserverStatus();
        boolean commentarySubscribed = afterDisable.stream()
                .filter(m -> "Commentary".equals(m.get("name")))
                .findFirst().map(m -> (Boolean) m.get("subscribed")).orElse(true);
        assertFalse(commentarySubscribed);

        assertThrows(IllegalArgumentException.class, () -> service.toggleObserver("ScorecardProjection", false));
    }

    /** Bowls `overs` overs of dot balls, alternating between two bowlers each over. */
    private void bowlDotOvers(String matchId, int overs, String bowler1, String bowler2, String striker, String nonStriker) {
        for (int over = 0; over < overs; over++) {
            String bowler = over % 2 == 0 ? bowler1 : bowler2;
            for (int ball = 0; ball < 6; ball++) {
                boolean firstOfOver = ball == 0;
                boolean firstOfInnings = over == 0 && ball == 0;
                service.recordBall(matchId, new BallRequest(
                        firstOfInnings ? striker : null,
                        firstOfInnings ? nonStriker : null,
                        firstOfOver ? bowler : null,
                        0, null, 0, false, null, null, null));
            }
        }
    }

    /** Continues an already-started over/innings with dot balls for the remaining overs, alternating bowlers. */
    private void bowlRemainderOfDotOvers(String matchId, int totalOvers, int ballsAlreadyBowledInOver0, String bowler1, String bowler2) {
        for (int ball = ballsAlreadyBowledInOver0; ball < 6; ball++) {
            service.recordBall(matchId, new BallRequest(null, null, null, 0, null, 0, false, null, null, null));
        }
        for (int over = 1; over < totalOvers; over++) {
            String bowler = over % 2 == 0 ? bowler1 : bowler2;
            for (int ball = 0; ball < 6; ball++) {
                service.recordBall(matchId, new BallRequest(
                        null, null, ball == 0 ? bowler : null, 0, null, 0, false, null, null, null));
            }
        }
    }
}
