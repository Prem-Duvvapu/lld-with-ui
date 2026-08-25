package com.lld.minesweeper.controller;

import com.lld.minesweeper.model.Game;
import com.lld.minesweeper.model.SimEvent;
import com.lld.minesweeper.service.MinesweeperService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link MinesweeperService}. */
@RestController
@RequestMapping("/api/minesweeper")
@CrossOrigin(origins = "*")
public class MinesweeperController {
    private final MinesweeperService service;

    public MinesweeperController(MinesweeperService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<Game> createGame(@RequestBody Map<String, Object> body) {
        int rows = ((Number) body.getOrDefault("rows", 9)).intValue();
        int cols = ((Number) body.getOrDefault("cols", 9)).intValue();
        int mines = ((Number) body.getOrDefault("mines", 10)).intValue();
        return ResponseEntity.ok(service.createGame(rows, cols, mines));
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<Game> getGame(@PathVariable long id) {
        return ResponseEntity.ok(service.getGame(id));
    }

    @PostMapping("/games/{id}/reveal")
    public ResponseEntity<Game> revealCell(@PathVariable long id, @RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        return ResponseEntity.ok(service.revealCell(id, row, col));
    }

    @PostMapping("/games/{id}/flag")
    public ResponseEntity<Game> flagCell(@PathVariable long id, @RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        return ResponseEntity.ok(service.flagCell(id, row, col));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/minesweeper/sim/*)
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

    @PostMapping("/sim/reveal")
    public ResponseEntity<Game> simReveal(@RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        return ResponseEntity.ok(service.simReveal(row, col));
    }

    @PostMapping("/sim/flag")
    public ResponseEntity<Game> simFlag(@RequestBody Map<String, Object> body) {
        int row = ((Number) body.get("row")).intValue();
        int col = ((Number) body.get("col")).intValue();
        return ResponseEntity.ok(service.simFlag(row, col));
    }
}
