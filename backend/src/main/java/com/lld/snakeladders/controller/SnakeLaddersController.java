package com.lld.snakeladders.controller;

import com.lld.snakeladders.model.Game;
import com.lld.snakeladders.model.SimEvent;
import com.lld.snakeladders.service.SnakeLaddersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link SnakeLaddersService}. */
@RestController
@RequestMapping("/api/snakeladders")
@CrossOrigin(origins = "*")
public class SnakeLaddersController {

    private final SnakeLaddersService service;

    public SnakeLaddersController(SnakeLaddersService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<Game> createGame(@RequestBody Map<String, List<String>> body) {
        return ResponseEntity.ok(service.createGame(body.get("players")));
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<Game> getGame(@PathVariable String id) {
        return ResponseEntity.ok(service.getGame(id));
    }

    @PostMapping("/games/{id}/roll")
    public ResponseEntity<Game> rollDice(@PathVariable String id) {
        return ResponseEntity.ok(service.rollDice(id));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/snakeladders/sim/*)
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

    @PostMapping("/sim/roll")
    public ResponseEntity<Game> simRoll() {
        return ResponseEntity.ok(service.simRoll());
    }
}
