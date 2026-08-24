package com.lld.chess.controller;

import com.lld.chess.model.Color;
import com.lld.chess.model.Game;
import com.lld.chess.model.PieceType;
import com.lld.chess.model.SimEvent;
import com.lld.chess.service.ChessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link ChessService}. */
@RestController
@RequestMapping("/api/chess")
@CrossOrigin(origins = "*")
public class ChessController {
    private final ChessService service;

    public ChessController(ChessService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<Game> createGame(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.createGame(body.get("playerWhite"), body.get("playerBlack")));
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<Game> getGame(@PathVariable long id) {
        return ResponseEntity.ok(service.getGame(id));
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<Game> makeMove(@PathVariable long id, @RequestBody Map<String, Object> body) {
        int fromRow = ((Number) body.get("fromRow")).intValue();
        int fromCol = ((Number) body.get("fromCol")).intValue();
        int toRow = ((Number) body.get("toRow")).intValue();
        int toCol = ((Number) body.get("toCol")).intValue();
        PieceType promotion = body.get("promotion") != null ? PieceType.valueOf(body.get("promotion").toString()) : null;
        return ResponseEntity.ok(service.makeMove(id, fromRow, fromCol, toRow, toCol, promotion));
    }

    @GetMapping("/games/{id}/valid-moves")
    public ResponseEntity<List<int[]>> getValidMoves(@PathVariable long id, @RequestParam int row, @RequestParam int col) {
        return ResponseEntity.ok(service.getValidMoves(id, row, col));
    }

    @PostMapping("/games/{id}/resign")
    public ResponseEntity<Game> resign(@PathVariable long id, @RequestBody Map<String, String> body) {
        Color color = Color.valueOf(body.get("color"));
        return ResponseEntity.ok(service.resign(id, color));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/chess/sim/*)
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
        int fromRow = ((Number) body.get("fromRow")).intValue();
        int fromCol = ((Number) body.get("fromCol")).intValue();
        int toRow = ((Number) body.get("toRow")).intValue();
        int toCol = ((Number) body.get("toCol")).intValue();
        String description = String.valueOf(body.getOrDefault("description", ""));
        return ResponseEntity.ok(service.simMove(fromRow, fromCol, toRow, toCol, description));
    }
}
