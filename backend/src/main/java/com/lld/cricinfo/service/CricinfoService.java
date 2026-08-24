package com.lld.cricinfo.service;

import com.lld.cricinfo.exception.*;
import com.lld.cricinfo.model.*;
import com.lld.cricinfo.observer.*;
import com.lld.cricinfo.repository.CricinfoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Facade the controller talks to wholesale. Owns match lifecycle
 * orchestration (the MatchStatus state machine) and wires the Observer
 * fan-out; the atomic-per-match ball recording itself is delegated to
 * {@link BallRecordingEngine} so this class stays free of lock code.
 *
 * <p>Runs two parallel worlds — the live repository/publisher/engine this
 * constructor is injected with, and an isolated sim* sandbox with its own
 * repository, publisher, engine and observer instances — so the interactive
 * simulation tab can never corrupt real match state (see SplitwiseService's
 * simRepository for the model this copies).
 */
@Service
public class CricinfoService {

    private final CricinfoRepository repository;
    private final MatchPublisher publisher;
    private final BallRecordingEngine engine;
    private final ScorecardProjectionObserver scorecardObserver;
    private final PlayerCareerStatsObserver careerStatsObserver;
    private final CommentaryObserver commentaryObserver;
    private final BallEventAuditObserver auditObserver;

    private final CricinfoRepository simRepository = new CricinfoRepository();
    private final MatchPublisher simPublisher = new MatchPublisher();
    private final BallRecordingEngine simEngine;
    private final ScorecardProjectionObserver simScorecardObserver = new ScorecardProjectionObserver();
    private final PlayerCareerStatsObserver simCareerStatsObserver = new PlayerCareerStatsObserver();
    private final CommentaryObserver simCommentaryObserver = new CommentaryObserver();
    private final BallEventAuditObserver simAuditObserver = new BallEventAuditObserver();
    private String simMatchId;

    public CricinfoService(CricinfoRepository repository,
                            MatchPublisher publisher,
                            ScorecardProjectionObserver scorecardObserver,
                            PlayerCareerStatsObserver careerStatsObserver,
                            CommentaryObserver commentaryObserver,
                            BallEventAuditObserver auditObserver) {
        this.repository = repository;
        this.publisher = publisher;
        this.scorecardObserver = scorecardObserver;
        this.careerStatsObserver = careerStatsObserver;
        this.commentaryObserver = commentaryObserver;
        this.auditObserver = auditObserver;
        this.engine = new BallRecordingEngine(repository, publisher);

        publisher.subscribe(scorecardObserver);
        publisher.subscribe(careerStatsObserver);
        publisher.subscribe(commentaryObserver);
        publisher.subscribe(auditObserver);

        this.simEngine = new BallRecordingEngine(simRepository, simPublisher);
        simPublisher.subscribe(simScorecardObserver);
        simPublisher.subscribe(simCareerStatsObserver);
        simPublisher.subscribe(simCommentaryObserver);
        simPublisher.subscribe(simAuditObserver);

        seedSandbox();
    }

    // =========================================================================
    // Teams
    // =========================================================================

    public List<Team> getTeams() {
        return repository.getAllTeams();
    }

    public Team getTeam(String teamId) {
        Team team = repository.getTeam(teamId);
        if (team == null) throw new TeamNotFoundException("Team not found: " + teamId);
        return team;
    }

    public Team registerTeam(Team team) {
        if (team.getId() == null) {
            team.setId("TEAM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        repository.saveTeam(team);
        return team;
    }

    // =========================================================================
    // Match lifecycle
    // =========================================================================

    public Match createMatch(String teamAId, String teamBId, String venue, MatchFormat format, LocalDateTime date) {
        Team teamA = getTeam(teamAId);
        Team teamB = getTeam(teamBId);
        if (teamAId.equals(teamBId)) {
            throw new InvalidMatchStateException("A team cannot play itself");
        }
        Match match = Match.builder()
                .id(repository.generateMatchId())
                .teamA(teamA)
                .teamB(teamB)
                .venue(venue)
                .matchDate(date != null ? date : LocalDateTime.now())
                .format(format != null ? format : MatchFormat.T20)
                .status(MatchStatus.UPCOMING)
                .build();
        repository.saveMatch(match);
        return match;
    }

    public Match performToss(String matchId, String winnerTeamId, TossChoice choice) {
        Match match = getMatch(matchId);
        if (match.getStatus() != MatchStatus.UPCOMING) {
            throw new InvalidMatchStateException("Toss can only be performed before the match starts");
        }
        if (!winnerTeamId.equals(match.getTeamA().getId()) && !winnerTeamId.equals(match.getTeamB().getId())) {
            throw new TeamNotFoundException("Team " + winnerTeamId + " is not playing in match " + matchId);
        }
        match.setTossWinnerTeamId(winnerTeamId);
        match.setTossChoice(choice);
        repository.saveMatch(match);
        return match;
    }

    public Match startMatch(String matchId) {
        return startMatch(matchId, repository);
    }

    private Match startMatch(String matchId, CricinfoRepository repo) {
        Match match = repo.getMatch(matchId);
        if (match == null) throw new MatchNotFoundException("Match not found: " + matchId);
        if (match.getTossWinnerTeamId() == null) {
            throw new InvalidMatchStateException("Toss must be performed before starting the match");
        }
        transition(match, MatchStatus.LIVE);

        boolean tossWinnerBats = match.getTossChoice() == TossChoice.BAT;
        boolean teamABats = tossWinnerBats == match.getTossWinnerTeamId().equals(match.getTeamA().getId());
        Team battingTeam = teamABats ? match.getTeamA() : match.getTeamB();
        Team bowlingTeam = teamABats ? match.getTeamB() : match.getTeamA();

        Innings innings = Innings.builder()
                .index(0)
                .battingTeamId(battingTeam.getId())
                .battingTeamName(battingTeam.getName())
                .bowlingTeamId(bowlingTeam.getId())
                .bowlingTeamName(bowlingTeam.getName())
                .build();
        match.getInnings().add(innings);
        match.setCurrentInningsIndex(0);
        repo.saveMatch(match);
        return match;
    }

    public Ball recordBall(String matchId, BallRequest request) {
        Ball ball = engine.recordBall(matchId, request);
        advanceIfInningsComplete(repository.getMatch(matchId), repository);
        return ball;
    }

    public Innings startNextInnings(String matchId) {
        return startNextInnings(matchId, repository);
    }

    private Innings startNextInnings(String matchId, CricinfoRepository repo) {
        Match match = repo.getMatch(matchId);
        if (match == null) throw new MatchNotFoundException("Match not found: " + matchId);
        if (match.getStatus() != MatchStatus.INNINGS_BREAK) {
            throw new InvalidMatchStateException("Match must be in INNINGS_BREAK to start the next innings");
        }
        Innings previous = match.currentInnings();
        Team battingTeam = resolveTeam(match, previous.getBowlingTeamId());
        Team bowlingTeam = resolveTeam(match, previous.getBattingTeamId());

        Innings next = Innings.builder()
                .index(match.getInnings().size())
                .battingTeamId(battingTeam.getId())
                .battingTeamName(battingTeam.getName())
                .bowlingTeamId(bowlingTeam.getId())
                .bowlingTeamName(bowlingTeam.getName())
                .targetRuns(previous.getTotalRuns() + 1)
                .build();
        match.getInnings().add(next);
        match.setCurrentInningsIndex(next.getIndex());
        transition(match, MatchStatus.LIVE);
        repo.saveMatch(match);
        return next;
    }

    public Match abandonMatch(String matchId, String reason) {
        Match match = getMatch(matchId);
        transition(match, MatchStatus.ABANDONED);
        match.setResult(MatchResult.builder()
                .resultType(ResultType.ABANDONED)
                .summary("Match abandoned" + (reason != null ? ": " + reason : ""))
                .build());
        repository.saveMatch(match);
        return match;
    }

    public Match getMatch(String matchId) {
        Match match = repository.getMatch(matchId);
        if (match == null) throw new MatchNotFoundException("Match not found: " + matchId);
        return match;
    }

    public List<Match> getAllMatches() {
        return repository.getAllMatches();
    }

    // =========================================================================
    // Projections (Observer read-side)
    // =========================================================================

    public Scorecard getScorecard(String matchId) {
        getMatch(matchId); // 404s if unknown
        return scorecardObserver.getScorecard(matchId);
    }

    public List<CommentaryEntry> getCommentary(String matchId) {
        getMatch(matchId);
        return commentaryObserver.getCommentary(matchId);
    }

    public List<CricinfoEvent> getEvents(String matchId) {
        getMatch(matchId);
        return auditObserver.getEventsForMatch(matchId);
    }

    public List<Map<String, Object>> getObserverStatus() {
        return observerStatus(publisher, scorecardObserver, careerStatsObserver, commentaryObserver, auditObserver);
    }

    public List<Map<String, Object>> toggleObserver(String name, boolean enabled) {
        toggle(publisher, name, enabled, careerStatsObserver, commentaryObserver, auditObserver);
        return getObserverStatus();
    }

    // =========================================================================
    // Shared orchestration helpers (used by both live and sim paths)
    // =========================================================================

    private void transition(Match match, MatchStatus next) {
        if (!match.getStatus().canTransitionTo(next)) {
            throw new InvalidMatchStateException(
                    "Cannot transition match " + match.getId() + " from " + match.getStatus() + " to " + next);
        }
        match.setStatus(next);
    }

    private void advanceIfInningsComplete(Match match, CricinfoRepository repo) {
        Innings current = match.currentInnings();
        if (current == null || !current.isCompleted()) return;

        int inningsSoFar = match.getCurrentInningsIndex() + 1;
        if (inningsSoFar >= match.getFormat().getTotalInnings()) {
            match.setResult(computeResult(match));
            transition(match, MatchStatus.COMPLETED);
        } else {
            transition(match, MatchStatus.INNINGS_BREAK);
        }
        repo.saveMatch(match);
    }

    private MatchResult computeResult(Match match) {
        Innings last = match.getInnings().get(match.getInnings().size() - 1);
        String teamAId = match.getTeamA().getId();
        String teamBId = match.getTeamB().getId();
        int teamATotal = match.teamTotalRuns(teamAId);
        int teamBTotal = match.teamTotalRuns(teamBId);

        String chasingTeamId = last.getBattingTeamId();
        boolean chasingIsA = chasingTeamId.equals(teamAId);
        int chasingTotal = chasingIsA ? teamATotal : teamBTotal;
        int defendingTotal = chasingIsA ? teamBTotal : teamATotal;
        String defendingTeamId = chasingIsA ? teamBId : teamAId;

        if (chasingTotal > defendingTotal) {
            int wicketsInHand = Math.max(0, 10 - last.getWickets());
            String name = resolveTeam(match, chasingTeamId).getName();
            return MatchResult.builder()
                    .resultType(ResultType.WON_BY_WICKETS)
                    .winningTeamId(chasingTeamId)
                    .winningTeamName(name)
                    .margin(wicketsInHand)
                    .summary(name + " won by " + wicketsInHand + " wicket(s)")
                    .build();
        }
        if (defendingTotal > chasingTotal) {
            int margin = defendingTotal - chasingTotal;
            String name = resolveTeam(match, defendingTeamId).getName();
            return MatchResult.builder()
                    .resultType(ResultType.WON_BY_RUNS)
                    .winningTeamId(defendingTeamId)
                    .winningTeamName(name)
                    .margin(margin)
                    .summary(name + " won by " + margin + " run(s)")
                    .build();
        }
        return MatchResult.builder().resultType(ResultType.TIE).summary("Match tied").build();
    }

    private Team resolveTeam(Match match, String teamId) {
        if (match.getTeamA().getId().equals(teamId)) return match.getTeamA();
        if (match.getTeamB().getId().equals(teamId)) return match.getTeamB();
        throw new TeamNotFoundException("Team " + teamId + " is not part of match " + match.getId());
    }

    private List<Map<String, Object>> observerStatus(MatchPublisher pub, BallEventObserver core,
                                                       BallEventObserver... optional) {
        List<BallEventObserver> active = pub.getObservers();
        List<Map<String, Object>> result = new ArrayList<>();
        result.add(Map.of("name", core.getObserverName(), "subscribed", active.contains(core), "protected", true));
        for (BallEventObserver o : optional) {
            result.add(Map.of("name", o.getObserverName(), "subscribed", active.contains(o), "protected", false));
        }
        return result;
    }

    private void toggle(MatchPublisher pub, String name, boolean enabled, BallEventObserver... optional) {
        for (BallEventObserver o : optional) {
            if (o.getObserverName().equalsIgnoreCase(name)) {
                if (enabled) pub.subscribe(o); else pub.unsubscribe(o);
                return;
            }
        }
        throw new IllegalArgumentException("Unknown or protected observer: " + name);
    }

    // =========================================================================
    // Demo data (called by CricinfoInitializer)
    // =========================================================================

    public void seedInitialMatch() {
        Team kings = repository.getTeam("TEAM-KNG") == null ? registerTeam(DemoData.coastalKings()) : repository.getTeam("TEAM-KNG");
        Team titans = repository.getTeam("TEAM-TTN") == null ? registerTeam(DemoData.northernTitans()) : repository.getTeam("TEAM-TTN");

        Match live = createMatch(kings.getId(), titans.getId(), "Marina Bay Stadium", MatchFormat.T20, LocalDateTime.now());
        performToss(live.getId(), kings.getId(), TossChoice.BAT);
        startMatch(live.getId());
        DemoData.bowlOpeningOvers(this, live.getId(), kings, titans);

        Match upcoming = createMatch(titans.getId(), kings.getId(), "City Oval", MatchFormat.ODI, LocalDateTime.now().plusDays(2));
        // left UPCOMING deliberately, to show match-list variety before a toss happens
        repository.saveMatch(upcoming);
    }

    private void seedSandbox() {
        Team kings = DemoData.coastalKings();
        Team titans = DemoData.northernTitans();
        simRepository.saveTeam(kings);
        simRepository.saveTeam(titans);

        Match match = Match.builder()
                .id(simRepository.generateMatchId())
                .teamA(kings)
                .teamB(titans)
                .venue("Simulation Arena")
                .matchDate(LocalDateTime.now())
                .format(MatchFormat.T20)
                .status(MatchStatus.UPCOMING)
                .build();
        simRepository.saveMatch(match);
        simMatchId = match.getId();

        performToss(simMatchId, kings.getId(), TossChoice.BAT, simRepository);
        startMatch(simMatchId, simRepository);
    }

    private Match performToss(String matchId, String winnerTeamId, TossChoice choice, CricinfoRepository repo) {
        Match match = repo.getMatch(matchId);
        match.setTossWinnerTeamId(winnerTeamId);
        match.setTossChoice(choice);
        repo.saveMatch(match);
        return match;
    }

    // =========================================================================
    // Simulation sandbox — one call per ball, isolated from live state
    // =========================================================================

    public void simReset() {
        simRepository.clear();
        simScorecardObserver.clear(simMatchId);
        simCommentaryObserver.clear(simMatchId);
        simAuditObserver.clear();
        seedSandbox();
    }

    public Match simGetMatch() {
        return simRepository.getMatch(simMatchId);
    }

    public Scorecard simGetScorecard() {
        return simScorecardObserver.getScorecard(simMatchId);
    }

    public List<CommentaryEntry> simGetCommentary() {
        return simCommentaryObserver.getCommentary(simMatchId);
    }

    public List<CricinfoEvent> simGetEvents() {
        return simAuditObserver.getEventsForMatch(simMatchId);
    }

    public Ball simBowlBall(int runsOffBat, ExtraType extraType, int extraRuns, boolean wicket, WicketType wicketType) {
        Match match = simRepository.getMatch(simMatchId);
        if (match.getStatus() == MatchStatus.INNINGS_BREAK) {
            startNextInnings(simMatchId, simRepository);
            match = simRepository.getMatch(simMatchId);
        }
        Innings innings = match.currentInnings();

        String bowlerId = innings.getCurrentBowlerId();
        if (bowlerId == null) {
            bowlerId = DemoData.pickNextBowler(resolveTeam(match, innings.getBowlingTeamId()), innings.getPreviousOverBowlerId());
        }
        String fielderId = null;
        if (wicket && wicketType != null && wicketType != WicketType.BOWLED
                && wicketType != WicketType.LBW && wicketType != WicketType.HIT_WICKET) {
            fielderId = DemoData.pickFielder(resolveTeam(match, innings.getBowlingTeamId()), bowlerId);
        }
        String dismissedPlayerId = wicket ? innings.getStrikerId() : null;

        BallRequest request = new BallRequest(
                innings.getStrikerId(), innings.getNonStrikerId(), bowlerId,
                runsOffBat, extraType, extraRuns, wicket, wicketType, dismissedPlayerId, fielderId);

        Ball ball = simEngine.recordBall(simMatchId, request);
        Match after = simRepository.getMatch(simMatchId);
        advanceIfInningsComplete(after, simRepository);

        Innings currentInnings = after.currentInnings();
        if (wicket && currentInnings != null && !currentInnings.isCompleted()
                && currentInnings.getIndex() == innings.getIndex()) {
            String nextBatsman = DemoData.pickNextBatsman(
                    resolveTeam(after, currentInnings.getBattingTeamId()), currentInnings.getBattingStats().keySet());
            if (nextBatsman != null) {
                currentInnings.setStrikerId(nextBatsman);
                simRepository.saveMatch(after);
            }
        }
        return ball;
    }

    public List<Map<String, Object>> simGetObserverStatus() {
        return observerStatus(simPublisher, simScorecardObserver, simCareerStatsObserver, simCommentaryObserver, simAuditObserver);
    }

    public List<Map<String, Object>> simToggleObserver(String name, boolean enabled) {
        toggle(simPublisher, name, enabled, simCareerStatsObserver, simCommentaryObserver, simAuditObserver);
        return simGetObserverStatus();
    }

    public Map<String, Object> simGetTelemetry() {
        Match match = simRepository.getMatch(simMatchId);
        Innings innings = match.currentInnings();
        Map<String, Object> telemetry = new LinkedHashMap<>();
        telemetry.put("matchId", simMatchId);
        telemetry.put("status", match.getStatus());
        telemetry.put("ballsBowled", innings != null ? innings.getBalls().size() : 0);
        telemetry.put("legalBallsBowled", innings != null ? innings.getLegalBallsBowled() : 0);
        telemetry.put("totalEvents", simAuditObserver.getEventsForMatch(simMatchId).size());
        telemetry.put("observers", simGetObserverStatus());
        return telemetry;
    }
}
