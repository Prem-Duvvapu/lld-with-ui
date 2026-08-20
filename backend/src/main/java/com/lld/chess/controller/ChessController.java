package com.lld.chess.controller;

import com.lld.config.ErrorResponse;

import com.lld.chess.service.ChessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chess")
@CrossOrigin(origins = "*")
public class ChessController {
    private final ChessService service;

    public ChessController(ChessService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<?> createGame(@RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(service.createGame(body.get("playerWhite"), body.get("playerBlack")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<?> getGame(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.getGame(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<?> makeMove(@PathVariable long id, @RequestBody Map<String, Object> body) {
        try {
            int fromRow = ((Number) body.get("fromRow")).intValue();
            int fromCol = ((Number) body.get("fromCol")).intValue();
            int toRow = ((Number) body.get("toRow")).intValue();
            int toCol = ((Number) body.get("toCol")).intValue();
            return ResponseEntity.ok(service.makeMove(id, fromRow, fromCol, toRow, toCol));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping("/games/{id}/valid-moves")
    public ResponseEntity<?> getValidMoves(@PathVariable long id, @RequestParam int row, @RequestParam int col) {
        try {
            return ResponseEntity.ok(service.getValidMoves(id, row, col));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }
}