package com.lld.tictactoe.controller;

import com.lld.tictactoe.model.Game;
import com.lld.tictactoe.model.SimEvent;
import com.lld.tictactoe.service.TicTacToeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link TicTacToeService}. */
@RestController
@RequestMapping("/api/tictactoe")
@CrossOrigin(origins = "*")
public class TicTacToeController {

    private final TicTacToeService service;

    public TicTacToeController(TicTacToeService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<Game> createGame(@RequestBody Map<String, Object> body) {
        String p1 = (String) body.getOrDefault("player1", "Player X");
        String p2 = (String) body.getOrDefault("player2", "Player O");
        return ResponseEntity.ok(service.createGame(p1, p2));
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<Game> getGame(@PathVariable String id) {
        return ResponseEntity.ok(service.getGame(id));
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<Game> makeMove(@PathVariable String id, @RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        String playerName = (String) body.get("playerName");
        return ResponseEntity.ok(service.makeMove(id, row, col, playerName));
    }

    @PostMapping("/games/{id}/undo")
    public ResponseEntity<Game> undoMove(@PathVariable String id) {
        return ResponseEntity.ok(service.undoLastMove(id));
    }

    @PostMapping("/games/{id}/reset")
    public ResponseEntity<Game> resetGame(@PathVariable String id) {
        return ResponseEntity.ok(service.resetGame(id));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/tictactoe/sim/*)
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Game> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @GetMapping("/sim/game")
    public ResponseEntity<Game> simGetGame() {
        return ResponseEntity.ok(service.simGetGame());
    }

    @GetMapping("/sim/log")
    public ResponseEntity<List<SimEvent>> simGetEventLog() {
        return ResponseEntity.ok(service.simGetEventLog());
    }

    @PostMapping("/sim/move")
    public ResponseEntity<Game> simMove(@RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        String description = String.valueOf(body.getOrDefault("description", ""));
        return ResponseEntity.ok(service.simMove(row, col, description));
    }

    @PostMapping("/sim/undo")
    public ResponseEntity<Game> simUndo() {
        return ResponseEntity.ok(service.simUndo());
    }
}
