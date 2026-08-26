package com.lld.ludo.controller;

import com.lld.ludo.model.Game;
import com.lld.ludo.model.SimEvent;
import com.lld.ludo.service.LudoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link LudoService}. */
@RestController
@RequestMapping("/api/ludo")
@CrossOrigin(origins = "*")
public class LudoController {
    private final LudoService service;

    public LudoController(LudoService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<Game> createGame(@RequestBody Map<String, List<String>> body) {
        return ResponseEntity.ok(service.createGame(body.get("players")));
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<Game> getGame(@PathVariable long id) {
        return ResponseEntity.ok(service.getGame(id));
    }

    @PostMapping("/games/{id}/roll")
    public ResponseEntity<Game> rollDice(@PathVariable long id) {
        return ResponseEntity.ok(service.rollDice(id));
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<Game> moveToken(@PathVariable long id, @RequestBody Map<String, Object> body) {
        int playerIndex = ((Number) body.get("playerIndex")).intValue();
        int tokenIndex = ((Number) body.get("tokenIndex")).intValue();
        return ResponseEntity.ok(service.moveToken(id, playerIndex, tokenIndex));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS (/api/ludo/sim/*)
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

    @PostMapping("/sim/move")
    public ResponseEntity<Game> simMove(@RequestBody Map<String, Object> body) {
        int playerIndex = ((Number) body.get("playerIndex")).intValue();
        int tokenIndex = ((Number) body.get("tokenIndex")).intValue();
        return ResponseEntity.ok(service.simMove(playerIndex, tokenIndex));
    }
}
