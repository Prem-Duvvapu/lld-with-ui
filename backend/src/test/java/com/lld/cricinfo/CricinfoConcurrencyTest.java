package com.lld.cricinfo;

import com.lld.cricinfo.model.*;
import com.lld.cricinfo.observer.*;
import com.lld.cricinfo.repository.CricinfoRepository;
import com.lld.cricinfo.service.BallRequest;
import com.lld.cricinfo.service.CricinfoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards the compound operation this module's thread safety is built
 * around: "append this ball, then fold it into the live scorecard" must be
 * atomic per match. Two ball events for the same match racing each other
 * must never interleave (lost update) or double-apply.
 *
 * <p>Section verification: removing the {@code lock.lock()/unlock()} pair in
 * {@code BallRecordingEngine.recordBall} (or otherwise letting two threads
 * read-then-write Innings concurrently) makes
 * {@code concurrentBalls_sameMatch_noLostOrDoubleCountedRuns} fail with a
 * final total strictly less than N — see RCA.md for the captured output.
 */
@DisplayName("Cricinfo Concurrency — atomic per-match ball recording and safe observer fan-out")
class CricinfoConcurrencyTest {

    private CricinfoService newService() {
        CricinfoRepository repository = new CricinfoRepository();
        MatchPublisher publisher = new MatchPublisher();
        return new CricinfoService(repository, publisher,
                new ScorecardProjectionObserver(), new PlayerCareerStatsObserver(),
                new CommentaryObserver(), new BallEventAuditObserver());
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

    /**
     * The correctness invariant: N concurrent wides (each worth exactly 1
     * extra run) fired at the SAME match must total exactly
     * (1 priming run + N) runs, and the raw ball log must contain exactly
     * (1 + N) entries — not one fewer (lost update) and not one more
     * (double count). Wides are used for the racing deliveries specifically
     * because a WIDE never completes an over (see ExtraType#isLegalDelivery),
     * so no racing thread ever needs to supply a fresh bowlerId for a new
     * over — every racing call is identical and interchangeable. The
     * concurrent outcome is compared against a strictly sequential run of
     * the identical deliveries against a fresh, identically-seeded match.
     */
    @Test
    @DisplayName("N concurrent wides on one match total exactly N extra runs — matches strictly sequential application")
    void concurrentBalls_sameMatch_noLostOrDoubleCountedRuns() throws InterruptedException {
        int n = 100;

        // --- Sequential reference run ---
        CricinfoService sequential = newService();
        Team seqA = sequential.registerTeam(team("SEQ-A", "Seq A", "SA-1", "SA-2"));
        Team seqB = sequential.registerTeam(team("SEQ-B", "Seq B", "SB-1"));
        Match seqMatch = sequential.createMatch(seqA.getId(), seqB.getId(), "Ground", MatchFormat.T20, null);
        sequential.performToss(seqMatch.getId(), seqA.getId(), TossChoice.BAT);
        sequential.startMatch(seqMatch.getId());
        sequential.recordBall(seqMatch.getId(),
                new BallRequest("SA-1", "SA-2", "SB-1", 1, null, 0, false, null, null, null));
        for (int i = 0; i < n; i++) {
            sequential.recordBall(seqMatch.getId(),
                    new BallRequest(null, null, null, 0, ExtraType.WIDE, 1, false, null, null, null));
        }
        Scorecard sequentialScorecard = sequential.getScorecard(seqMatch.getId());
        int sequentialBallLogSize = sequential.getMatch(seqMatch.getId()).currentInnings().getBalls().size();

        // --- Concurrent run against a fresh, identically-shaped match ---
        CricinfoService concurrent = newService();
        Team conA = concurrent.registerTeam(team("CON-A", "Con A", "CA-1", "CA-2"));
        Team conB = concurrent.registerTeam(team("CON-B", "Con B", "CB-1"));
        Match conMatch = concurrent.createMatch(conA.getId(), conB.getId(), "Ground", MatchFormat.T20, null);
        concurrent.performToss(conMatch.getId(), conA.getId(), TossChoice.BAT);
        concurrent.startMatch(conMatch.getId());
        // Prime striker/non-striker/bowler with one legal ball outside the race so every
        // racing thread can omit identity fields and hit the exact same "continue" path.
        concurrent.recordBall(conMatch.getId(),
                new BallRequest("CA-1", "CA-2", "CB-1", 1, null, 0, false, null, null, null));

        ExecutorService pool = Executors.newFixedThreadPool(20);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        AtomicInteger failures = new AtomicInteger(0);

        for (int i = 0; i < n; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    concurrent.recordBall(conMatch.getId(),
                            new BallRequest(null, null, null, 0, ExtraType.WIDE, 1, false, null, null, null));
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "concurrent ball recording did not finish in time");
        pool.shutdown();

        assertEquals(0, failures.get(), "no recordBall call should throw under contention");

        Scorecard concurrentScorecard = concurrent.getScorecard(conMatch.getId());
        int concurrentBallLogSize = concurrent.getMatch(conMatch.getId()).currentInnings().getBalls().size();

        assertEquals(1 + n, concurrentScorecard.getTotalRuns(), "lost or double-counted runs under concurrent recording");
        assertEquals(sequentialScorecard.getTotalRuns(), concurrentScorecard.getTotalRuns(),
                "concurrent total must equal the strictly sequential reference total");
        assertEquals(1 + n, concurrentBallLogSize, "every ball event must be appended exactly once — no lost or duplicated event");
        assertEquals(sequentialBallLogSize, concurrentBallLogSize,
                "concurrent ball log length must equal the strictly sequential reference length");
    }

    @Test
    @DisplayName("Concurrent subscribe/unsubscribe never throws while ball events are being published")
    void concurrentSubscribeUnsubscribe_duringPublish_neverThrows() throws Exception {
        MatchPublisher publisher = new MatchPublisher();
        ScorecardProjectionObserver core = new ScorecardProjectionObserver();
        publisher.subscribe(core);

        Match match = Match.builder().id("M-SAFE")
                .teamA(team("T-A", "A", "P1", "P2")).teamB(team("T-B", "B", "P3"))
                .format(MatchFormat.T20).status(MatchStatus.LIVE).build();
        Innings innings = Innings.builder().index(0).battingTeamId("T-A").battingTeamName("A")
                .bowlingTeamId("T-B").bowlingTeamName("B")
                .strikerId("P1").nonStrikerId("P2").currentBowlerId("P3").build();
        match.getInnings().add(innings);

        int rounds = 500;
        ExecutorService pool = Executors.newFixedThreadPool(3);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger errors = new AtomicInteger(0);

        BallEventObserver toggled = new BallEventObserver() {
            @Override
            public void onBallBowled(BallEvent event) {
            }

            @Override
            public String getObserverName() {
                return "Toggled";
            }
        };

        Future<?> publisherTask = pool.submit(() -> {
            try {
                start.await();
                for (int i = 0; i < rounds; i++) {
                    Ball ball = Ball.builder().id(i).inningsIndex(0).overNumber(0).ballInOver(1).legalDelivery(true)
                            .strikerId("P1").nonStrikerId("P2").bowlerId("P3").runsOffBat(0).build();
                    publisher.publish(new BallEvent(match, innings, ball));
                }
            } catch (Exception e) {
                errors.incrementAndGet();
            }
        });
        Future<?> subscribeTask = pool.submit(() -> {
            try {
                start.await();
                for (int i = 0; i < rounds; i++) publisher.subscribe(toggled);
            } catch (Exception e) {
                errors.incrementAndGet();
            }
        });
        Future<?> unsubscribeTask = pool.submit(() -> {
            try {
                start.await();
                for (int i = 0; i < rounds; i++) publisher.unsubscribe(toggled);
            } catch (Exception e) {
                errors.incrementAndGet();
            }
        });

        start.countDown();
        publisherTask.get(10, TimeUnit.SECONDS);
        subscribeTask.get(10, TimeUnit.SECONDS);
        unsubscribeTask.get(10, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(0, errors.get(), "publish/subscribe/unsubscribe must never throw when racing each other");
    }

    @Test
    @DisplayName("Disjoint matches are scored concurrently without interference")
    void disjointMatches_scoreIndependentlyUnderConcurrency() throws InterruptedException {
        CricinfoService service = newService();
        int matchCount = 6;
        List<String> matchIds = new ArrayList<>();
        for (int m = 0; m < matchCount; m++) {
            Team a = service.registerTeam(team("M" + m + "-A", "A" + m, "PA" + m + "-1", "PA" + m + "-2"));
            Team b = service.registerTeam(team("M" + m + "-B", "B" + m, "PB" + m + "-1"));
            Match match = service.createMatch(a.getId(), b.getId(), "Ground", MatchFormat.T20, null);
            service.performToss(match.getId(), a.getId(), TossChoice.BAT);
            service.startMatch(match.getId());
            service.recordBall(match.getId(), new BallRequest(
                    "PA" + m + "-1", "PA" + m + "-2", "PB" + m + "-1", 1, null, 0, false, null, null, null));
            matchIds.add(match.getId());
        }

        int ballsPerMatch = 20;
        ExecutorService pool = Executors.newFixedThreadPool(matchCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(matchCount);

        for (String matchId : matchIds) {
            pool.submit(() -> {
                try {
                    start.await();
                    // Wides never complete an over, so a fixed bowler can keep bowling
                    // indefinitely without tripping the "no consecutive overs" rule.
                    for (int i = 0; i < ballsPerMatch; i++) {
                        service.recordBall(matchId, new BallRequest(null, null, null, 0, ExtraType.WIDE, 1, false, null, null, null));
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        for (String matchId : matchIds) {
            Scorecard scorecard = service.getScorecard(matchId);
            assertEquals(1 + ballsPerMatch, scorecard.getTotalRuns(), "each match must independently total its own runs");
        }
    }
}
