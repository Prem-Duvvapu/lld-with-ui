package com.lld.tictactoe.controller;

import com.lld.config.ErrorResponse;

import com.lld.tictactoe.service.TicTacToeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tictactoe")
@CrossOrigin(origins = "*")
public class TicTacToeController {

    private final TicTacToeService service;

    public TicTacToeController(TicTacToeService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<?> createGame(@RequestBody Map<String, Object> body) {
        try {
            String p1 = (String) body.getOrDefault("player1", "Player X");
            String p2 = (String) body.getOrDefault("player2", "Player O");
            return ResponseEntity.ok(service.createGame(p1, p2));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<?> getGame(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getGame(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<?> makeMove(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            int row = ((Number) body.get("row")).intValue();
            int col = ((Number) body.get("col")).intValue();
            String playerName = (String) body.get("playerName");
            return ResponseEntity.ok(service.makeMove(id, row, col, playerName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/games/{id}/undo")
    public ResponseEntity<?> undoMove(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.undoLastMove(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/games/{id}/reset")
    public ResponseEntity<?> resetGame(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.resetGame(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }
}
