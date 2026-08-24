package com.lld.cricinfo;

import com.lld.cricinfo.model.*;
import com.lld.cricinfo.observer.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Exercises the Observer pattern itself — MatchPublisher (Subject) fanning
 * a single BallEvent out to independent observers — separately from the
 * service-level workflow test. This is the "GoF pattern implemented end to
 * end" flavour: a real Subject, a real interface, multiple implementations
 * each deriving a different view from the identical event.
 */
@DisplayName("BallEventObserver — Subject/Observer fan-out")
class BallEventObserverTest {

    private Match matchWithOneBatsmanBowlerPair() {
        Team teamA = Team.builder().id("T-A").name("A").shortName("A").players(List.of(
                Player.builder().id("P1").name("Striker").role(PlayerRole.BATSMAN)
                        .battingStyle(BattingStyle.RIGHT_HANDED).bowlingStyle(BowlingStyle.NONE)
                        .careerStats(CareerStats.builder().build()).build(),
                Player.builder().id("P2").name("NonStriker").role(PlayerRole.BATSMAN)
                        .battingStyle(BattingStyle.RIGHT_HANDED).bowlingStyle(BowlingStyle.NONE)
                        .careerStats(CareerStats.builder().build()).build()
        )).build();
        Team teamB = Team.builder().id("T-B").name("B").shortName("B").players(List.of(
                Player.builder().id("P3").name("Bowler").role(PlayerRole.BOWLER)
                        .battingStyle(BattingStyle.RIGHT_HANDED).bowlingStyle(BowlingStyle.FAST)
                        .careerStats(CareerStats.builder().build()).build()
        )).build();
        return Match.builder().id("M1").teamA(teamA).teamB(teamB).format(MatchFormat.T20).status(MatchStatus.LIVE).build();
    }

    @Test
    @DisplayName("publish fans an event out to every subscribed observer exactly once")
    void publish_fansOutToAllSubscribedObservers() {
        MatchPublisher publisher = new MatchPublisher();
        ScorecardProjectionObserver scorecardObserver = new ScorecardProjectionObserver();
        AtomicInteger customCalls = new AtomicInteger(0);
        BallEventObserver spy = new BallEventObserver() {
            @Override
            public void onBallBowled(BallEvent event) {
                customCalls.incrementAndGet();
            }

            @Override
            public String getObserverName() {
                return "Spy";
            }
        };

        publisher.subscribe(scorecardObserver);
        publisher.subscribe(spy);

        Match match = matchWithOneBatsmanBowlerPair();
        Innings innings = Innings.builder().index(0).battingTeamId("T-A").battingTeamName("A")
                .bowlingTeamId("T-B").bowlingTeamName("B")
                .strikerId("P1").nonStrikerId("P2").currentBowlerId("P3").build();
        match.getInnings().add(innings);

        Ball ball = Ball.builder().id(1).inningsIndex(0).overNumber(0).ballInOver(1).legalDelivery(true)
                .strikerId("P1").nonStrikerId("P2").bowlerId("P3").runsOffBat(4).isFour(true).build();

        publisher.publish(new BallEvent(match, innings, ball));

        assertEquals(1, customCalls.get(), "every subscribed observer must receive the event exactly once");
        Scorecard scorecard = scorecardObserver.getScorecard("M1");
        assertEquals(4, scorecard.getTotalRuns(), "ScorecardProjectionObserver must independently fold the event");
    }

    @Test
    @DisplayName("unsubscribe stops future notifications")
    void unsubscribe_stopsFutureNotifications() {
        MatchPublisher publisher = new MatchPublisher();
        AtomicInteger calls = new AtomicInteger(0);
        BallEventObserver observer = new BallEventObserver() {
            @Override
            public void onBallBowled(BallEvent event) {
                calls.incrementAndGet();
            }

            @Override
            public String getObserverName() {
                return "Counter";
            }
        };
        publisher.subscribe(observer);
        assertEquals(1, publisher.observerCount());

        Match match = matchWithOneBatsmanBowlerPair();
        Innings innings = Innings.builder().index(0).battingTeamId("T-A").bowlingTeamId("T-B").build();
        Ball ball = Ball.builder().id(1).build();

        publisher.publish(new BallEvent(match, innings, ball));
        assertEquals(1, calls.get());

        publisher.unsubscribe(observer);
        assertEquals(0, publisher.observerCount());

        publisher.publish(new BallEvent(match, innings, ball));
        assertEquals(1, calls.get(), "an unsubscribed observer must not receive further events");
    }

    @Test
    @DisplayName("subscribing the same observer twice does not duplicate it")
    void subscribe_isIdempotent() {
        MatchPublisher publisher = new MatchPublisher();
        BallEventObserver observer = new BallEventObserver() {
            @Override
            public void onBallBowled(BallEvent event) {
            }

            @Override
            public String getObserverName() {
                return "X";
            }
        };
        publisher.subscribe(observer);
        publisher.subscribe(observer);
        assertEquals(1, publisher.observerCount());
    }

    @Test
    @DisplayName("independent observers derive different views from the same event")
    void independentObservers_deriveDifferentViewsFromSameEvent() {
        MatchPublisher publisher = new MatchPublisher();
        ScorecardProjectionObserver scorecardObserver = new ScorecardProjectionObserver();
        CommentaryObserver commentaryObserver = new CommentaryObserver();
        PlayerCareerStatsObserver careerStatsObserver = new PlayerCareerStatsObserver();
        publisher.subscribe(scorecardObserver);
        publisher.subscribe(commentaryObserver);
        publisher.subscribe(careerStatsObserver);

        Match match = matchWithOneBatsmanBowlerPair();
        Innings innings = Innings.builder().index(0).battingTeamId("T-A").battingTeamName("A")
                .bowlingTeamId("T-B").bowlingTeamName("B")
                .strikerId("P1").nonStrikerId("P2").currentBowlerId("P3").build();
        match.getInnings().add(innings);
        Ball six = Ball.builder().id(1).inningsIndex(0).overNumber(0).ballInOver(1).legalDelivery(true)
                .strikerId("P1").nonStrikerId("P2").bowlerId("P3").runsOffBat(6).isSix(true).build();

        publisher.publish(new BallEvent(match, innings, six));

        assertEquals(6, scorecardObserver.getScorecard("M1").getTotalRuns());
        assertEquals(1, commentaryObserver.getCommentary("M1").size());
        assertTrue(commentaryObserver.getCommentary("M1").get(0).getText().contains("SIX"));
        Player striker = match.getTeamA().getPlayers().get(0);
        assertEquals(6, striker.getCareerStats().getTotalRuns(), "career stats observer must update independently too");
    }
}
