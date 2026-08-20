package com.lld.ludo.controller;

import com.lld.config.ErrorResponse;

import com.lld.ludo.service.LudoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ludo")
@CrossOrigin(origins = "*")
public class LudoController {
    private final LudoService service;

    public LudoController(LudoService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<?> createGame(@RequestBody Map<String, String[]> body) {
        try {
            return ResponseEntity.ok(service.createGame(body.get("players")));
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

    @PostMapping("/games/{id}/roll")
    public ResponseEntity<?> rollDice(@PathVariable long id) {
        try {
            return ResponseEntity.ok(service.rollDice(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/games/{id}/move")
    public ResponseEntity<?> moveToken(@PathVariable long id, @RequestBody Map<String, Object> body) {
        try {
            int playerIndex = ((Number) body.get("playerIndex")).intValue();
            int tokenIndex = ((Number) body.get("tokenIndex")).intValue();
            return ResponseEntity.ok(service.moveToken(id, playerIndex, tokenIndex));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }
}