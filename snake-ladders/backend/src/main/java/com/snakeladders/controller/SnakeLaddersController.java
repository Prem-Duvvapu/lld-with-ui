package com.snakeladders.controller;

import com.snakeladders.model.Game;
import com.snakeladders.service.SnakeLaddersService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/snakeladders")
@CrossOrigin(origins = "*")
public class SnakeLaddersController {

    private final SnakeLaddersService service;

    public SnakeLaddersController(SnakeLaddersService service) {
        this.service = service;
    }

    @PostMapping("/games")
    public ResponseEntity<?> createGame(@RequestBody Map<String, List<String>> body) {
        try {
            return ResponseEntity.ok(service.createGame(body.get("players")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/games/{id}")
    public ResponseEntity<?> getGame(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.getGame(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/games/{id}/roll")
    public ResponseEntity<?> rollDice(@PathVariable String id) {
        try {
            return ResponseEntity.ok(service.rollDice(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
