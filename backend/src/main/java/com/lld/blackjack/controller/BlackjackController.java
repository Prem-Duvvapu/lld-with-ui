package com.lld.blackjack.controller;

import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.SimEvent;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.service.BlackjackService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blackjack")
@CrossOrigin(origins = "*")
public class BlackjackController {

    private final BlackjackService service;

    public BlackjackController(BlackjackService service) {
        this.service = service;
    }

    @PostMapping("/tables")
    public Table createTable(@RequestBody Map<String, Object> body) {
        DealerStrategyType type = DealerStrategyType.valueOf(body.getOrDefault("dealerStrategyType", "HIT_ON_SOFT_17").toString());
        return service.createTable(type);
    }

    @GetMapping("/tables")
    public List<Table> getAllTables() {
        return service.getAllTables();
    }

    @GetMapping("/{tableId}")
    public Table getTable(@PathVariable String tableId) {
        return service.getTable(tableId);
    }

    @PostMapping("/{tableId}/deal")
    public Table deal(@PathVariable String tableId) {
        return service.deal(tableId);
    }

    @PostMapping("/{tableId}/hit")
    public Table hit(@PathVariable String tableId) {
        return service.hit(tableId);
    }

    @PostMapping("/{tableId}/stand")
    public Table stand(@PathVariable String tableId) {
        return service.stand(tableId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/tables")
    public Map<String, Object> simCreateTable(@RequestBody Map<String, Object> body) {
        DealerStrategyType type = DealerStrategyType.valueOf(body.getOrDefault("dealerStrategyType", "HIT_ON_SOFT_17").toString());
        return service.simCreateTable(type);
    }

    @PostMapping("/sim/{tableId}/deal")
    public Map<String, Object> simDeal(@PathVariable String tableId) {
        return service.simDeal(tableId);
    }

    @PostMapping("/sim/{tableId}/hit")
    public Map<String, Object> simHit(@PathVariable String tableId) {
        return service.simHit(tableId);
    }

    @PostMapping("/sim/{tableId}/stand")
    public Map<String, Object> simStand(@PathVariable String tableId) {
        return service.simStand(tableId);
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        int tableCount = Integer.parseInt(body.getOrDefault("tableCount", "15").toString());
        return service.simRace(tableCount);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }
}
