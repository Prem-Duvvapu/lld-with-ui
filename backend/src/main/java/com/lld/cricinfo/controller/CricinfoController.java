package com.lld.cricinfo.controller;

import com.lld.cricinfo.model.*;
import com.lld.cricinfo.service.BallRequest;
import com.lld.cricinfo.service.CricinfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cricinfo")
@CrossOrigin(origins = "*")
@Tag(name = "CricInfo API", description = "Ball-by-ball live cricket scoring with an Observer-driven scorecard projection")
public class CricinfoController {

    private final CricinfoService cricinfoService;

    public CricinfoController(CricinfoService cricinfoService) {
        this.cricinfoService = cricinfoService;
    }

    // --- Teams ---
    @GetMapping("/teams")
    @Operation(summary = "Get all teams")
    public ResponseEntity<List<Team>> getTeams() {
        return ResponseEntity.ok(cricinfoService.getTeams());
    }

    @GetMapping("/teams/{id}")
    @Operation(summary = "Get a team and its squad")
    public ResponseEntity<Team> getTeam(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.getTeam(id));
    }

    @PostMapping("/teams")
    @Operation(summary = "Register a new team")
    public ResponseEntity<Team> registerTeam(@RequestBody Team team) {
        return ResponseEntity.ok(cricinfoService.registerTeam(team));
    }

    // --- Matches ---
    public record CreateMatchRequest(String teamAId, String teamBId, String venue, String format, LocalDateTime date) {}

    @PostMapping("/matches")
    @Operation(summary = "Create a new match between two teams")
    public ResponseEntity<Match> createMatch(@RequestBody CreateMatchRequest request) {
        MatchFormat format = request.format() != null ? MatchFormat.valueOf(request.format().toUpperCase()) : MatchFormat.T20;
        return ResponseEntity.ok(cricinfoService.createMatch(
                request.teamAId(), request.teamBId(), request.venue(), format, request.date()));
    }

    @GetMapping("/matches")
    @Operation(summary = "Get all matches")
    public ResponseEntity<List<Match>> getMatches() {
        return ResponseEntity.ok(cricinfoService.getAllMatches());
    }

    @GetMapping("/matches/{id}")
    @Operation(summary = "Get a match by ID")
    public ResponseEntity<Match> getMatch(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.getMatch(id));
    }

    public record TossRequest(String winnerTeamId, String choice) {}

    @PutMapping("/matches/{id}/toss")
    @Operation(summary = "Record the toss result")
    public ResponseEntity<Match> performToss(@PathVariable String id, @RequestBody TossRequest request) {
        TossChoice choice = TossChoice.valueOf(request.choice().toUpperCase());
        return ResponseEntity.ok(cricinfoService.performToss(id, request.winnerTeamId(), choice));
    }

    @PutMapping("/matches/{id}/start")
    @Operation(summary = "Start the match and begin the first innings")
    public ResponseEntity<Match> startMatch(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.startMatch(id));
    }

    public record BallDto(String strikerId, String nonStrikerId, String bowlerId, int runsOffBat,
                           String extraType, int extraRuns, boolean wicket, String wicketType,
                           String dismissedPlayerId, String fielderId) {
        BallRequest toRequest() {
            return new BallRequest(
                    strikerId, nonStrikerId, bowlerId, runsOffBat,
                    extraType != null ? ExtraType.valueOf(extraType.toUpperCase()) : null,
                    extraRuns,
                    wicket,
                    wicketType != null ? WicketType.valueOf(wicketType.toUpperCase()) : null,
                    dismissedPlayerId, fielderId);
        }
    }

    @PostMapping("/matches/{id}/balls")
    @Operation(summary = "Record one ball — the core Observer publish point")
    public ResponseEntity<Ball> recordBall(@PathVariable String id, @RequestBody BallDto dto) {
        return ResponseEntity.ok(cricinfoService.recordBall(id, dto.toRequest()));
    }

    @PutMapping("/matches/{id}/next-innings")
    @Operation(summary = "Start the next innings after an innings break")
    public ResponseEntity<Innings> startNextInnings(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.startNextInnings(id));
    }

    @PutMapping("/matches/{id}/abandon")
    @Operation(summary = "Abandon a match")
    public ResponseEntity<Match> abandonMatch(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(cricinfoService.abandonMatch(id, reason));
    }

    // --- Projections ---
    @GetMapping("/matches/{id}/scorecard")
    @Operation(summary = "Get the live scorecard projection for a match")
    public ResponseEntity<Scorecard> getScorecard(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.getScorecard(id));
    }

    @GetMapping("/matches/{id}/commentary")
    @Operation(summary = "Get ball-by-ball commentary for a match")
    public ResponseEntity<List<CommentaryEntry>> getCommentary(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.getCommentary(id));
    }

    @GetMapping("/matches/{id}/events")
    @Operation(summary = "Get the audit event log for a match")
    public ResponseEntity<List<CricinfoEvent>> getEvents(@PathVariable String id) {
        return ResponseEntity.ok(cricinfoService.getEvents(id));
    }

    // --- Observer toggling ---
    @GetMapping("/observers")
    @Operation(summary = "Get subscribe/unsubscribe status of every ball-event observer")
    public ResponseEntity<List<Map<String, Object>>> getObservers() {
        return ResponseEntity.ok(cricinfoService.getObserverStatus());
    }

    @PutMapping("/observers/{name}")
    @Operation(summary = "Subscribe or unsubscribe an observer from the ball-event publisher")
    public ResponseEntity<List<Map<String, Object>>> toggleObserver(@PathVariable String name, @RequestBody Map<String, Boolean> body) {
        boolean enabled = body.getOrDefault("enabled", true);
        return ResponseEntity.ok(cricinfoService.toggleObserver(name, enabled));
    }

    // ==========================================
    // Simulation Sandbox Endpoints (/sim/*)
    // ==========================================

    @PostMapping("/sim/reset")
    @Operation(summary = "Reset the simulation sandbox to a fresh in-progress match")
    public ResponseEntity<Match> simReset() {
        cricinfoService.simReset();
        return ResponseEntity.ok(cricinfoService.simGetMatch());
    }

    @GetMapping("/sim/match")
    @Operation(summary = "Get the current simulation match state")
    public ResponseEntity<Match> simGetMatch() {
        return ResponseEntity.ok(cricinfoService.simGetMatch());
    }

    @GetMapping("/sim/scorecard")
    @Operation(summary = "Get the simulation's live scorecard projection")
    public ResponseEntity<Scorecard> simGetScorecard() {
        return ResponseEntity.ok(cricinfoService.simGetScorecard());
    }

    @GetMapping("/sim/commentary")
    @Operation(summary = "Get simulation commentary")
    public ResponseEntity<List<CommentaryEntry>> simGetCommentary() {
        return ResponseEntity.ok(cricinfoService.simGetCommentary());
    }

    @GetMapping("/sim/events")
    @Operation(summary = "Get simulation event audit log")
    public ResponseEntity<List<CricinfoEvent>> simGetEvents() {
        return ResponseEntity.ok(cricinfoService.simGetEvents());
    }

    public record SimBallRequest(int runsOffBat, String extraType, int extraRuns, boolean wicket, String wicketType) {}

    @PostMapping("/sim/bowl")
    @Operation(summary = "Bowl one ball in the simulation — each simulation step is exactly one ball")
    public ResponseEntity<Ball> simBowlBall(@RequestBody SimBallRequest request) {
        ExtraType extraType = request.extraType() != null && !request.extraType().isBlank()
                ? ExtraType.valueOf(request.extraType().toUpperCase()) : null;
        WicketType wicketType = request.wicketType() != null && !request.wicketType().isBlank()
                ? WicketType.valueOf(request.wicketType().toUpperCase()) : null;
        return ResponseEntity.ok(cricinfoService.simBowlBall(
                request.runsOffBat(), extraType, request.extraRuns(), request.wicket(), wicketType));
    }

    @GetMapping("/sim/telemetry")
    @Operation(summary = "Get simulation telemetry HUD metrics")
    public ResponseEntity<Map<String, Object>> simGetTelemetry() {
        return ResponseEntity.ok(cricinfoService.simGetTelemetry());
    }

    @GetMapping("/sim/observers")
    @Operation(summary = "Get simulation observer subscribe status")
    public ResponseEntity<List<Map<String, Object>>> simGetObservers() {
        return ResponseEntity.ok(cricinfoService.simGetObserverStatus());
    }

    @PutMapping("/sim/observers/{name}")
    @Operation(summary = "Subscribe or unsubscribe a simulation observer")
    public ResponseEntity<List<Map<String, Object>>> simToggleObserver(@PathVariable String name, @RequestBody Map<String, Boolean> body) {
        boolean enabled = body.getOrDefault("enabled", true);
        return ResponseEntity.ok(cricinfoService.simToggleObserver(name, enabled));
    }
}
