package com.lld.minesweeper.controller;

import com.lld.minesweeper.service.MinesweeperService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/minesweeper")
@CrossOrigin(origins = "*")
public class MinesweeperController {
    private final MinesweeperService service;

    public MinesweeperController(MinesweeperService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<?> createGame(@RequestBody Map<String, Object> body) {
        try {
            int rows = ((Number) body.getOrDefault("rows", 9)).intValue();
            int cols = ((Number) body.getOrDefault("cols", 9)).intValue();
            int mines = ((Number) body.getOrDefault("mines", 10)).intValue();
            return ResponseEntity.ok(service.createGame(rows, cols, mines));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<?> getGame(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.getGame(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/games/{id}/reveal")
    public ResponseEntity<?> revealCell(@PathVariable long id, @RequestBody Map<String, Object> body) {
        try {
            int row = ((Number) body.get("row")).intValue();
            int col = ((Number) body.get("col")).intValue();
            return ResponseEntity.ok(service.revealCell(id, row, col));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/games/{id}/flag")
    public ResponseEntity<?> flagCell(@PathVariable long id, @RequestBody Map<String, Object> body) {
        try {
            int row = ((Number) body.get("row")).intValue();
            int col = ((Number) body.get("col")).intValue();
            return ResponseEntity.ok(service.flagCell(id, row, col));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
