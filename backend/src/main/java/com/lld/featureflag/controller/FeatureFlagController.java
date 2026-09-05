package com.lld.featureflag.controller;

import com.lld.featureflag.condition.Condition;
import com.lld.featureflag.condition.ConditionTreeBuilder;
import com.lld.featureflag.condition.RuleNodeDto;
import com.lld.featureflag.model.EvaluationResult;
import com.lld.featureflag.model.FeatureFlag;
import com.lld.featureflag.model.SimEvent;
import com.lld.featureflag.model.UserContext;
import com.lld.featureflag.service.FeatureFlagService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Translates HTTP only — every call delegates straight to {@link FeatureFlagService}. */
@RestController
@RequestMapping("/api/featureflag")
@CrossOrigin(origins = "*")
public class FeatureFlagController {

    private final FeatureFlagService service;

    public FeatureFlagController(FeatureFlagService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @PostMapping("/flags")
    public ResponseEntity<FeatureFlag> createFlag(@RequestBody Map<String, String> body) {
        FeatureFlag flag = service.createFlag(body.get("key"), body.get("description"));
        return ResponseEntity.ok(flag);
    }

    @GetMapping("/flags")
    public ResponseEntity<List<FeatureFlag>> listFlags() {
        return ResponseEntity.ok(service.listFlags());
    }

    @GetMapping("/flags/{key}")
    public ResponseEntity<FeatureFlag> getFlag(@PathVariable String key) {
        return ResponseEntity.ok(service.getFlag(key));
    }

    @PutMapping("/flags/{key}/enabled")
    public ResponseEntity<FeatureFlag> setEnabled(@PathVariable String key, @RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        return ResponseEntity.ok(service.setEnabled(key, enabled));
    }

    @PutMapping("/flags/{key}/rules")
    public ResponseEntity<FeatureFlag> updateRules(@PathVariable String key, @RequestBody RuleNodeDto rule) {
        Condition root = ConditionTreeBuilder.build(rule);
        return ResponseEntity.ok(service.updateRules(key, root));
    }

    @PostMapping("/flags/{key}/evaluate")
    public ResponseEntity<EvaluationResult> evaluate(@PathVariable String key, @RequestBody UserContext ctx) {
        return ResponseEntity.ok(service.evaluate(key, ctx));
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<?> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @PostMapping("/sim/create")
    public ResponseEntity<?> simCreateFlag(@RequestBody Map<String, Object> body) {
        int step = ((Number) body.getOrDefault("step", 2)).intValue();
        return ResponseEntity.ok(service.simCreateFlag(step));
    }

    @PostMapping("/sim/enabled")
    public ResponseEntity<?> simSetEnabled(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        int step = ((Number) body.getOrDefault("step", 3)).intValue();
        return ResponseEntity.ok(service.simSetEnabled(enabled, step));
    }

    @PostMapping("/sim/rule")
    public ResponseEntity<?> simSetRule(@RequestBody SimRuleRequest body) {
        Condition condition = ConditionTreeBuilder.build(body.getRule());
        int step = body.getStep() == 0 ? 3 : body.getStep();
        return ResponseEntity.ok(service.simSetRule(condition, body.getLabel(), step));
    }

    @PostMapping("/sim/evaluate")
    public ResponseEntity<?> simEvaluate(@RequestBody SimEvaluateRequest body) {
        UserContext ctx = UserContext.builder()
                .userId(body.getUserId())
                .country(body.getCountry())
                .attributes(body.getAttributes() != null ? body.getAttributes() : Map.of())
                .build();
        int step = body.getStep() == 0 ? 5 : body.getStep();
        String userLabel = body.getUserLabel() != null ? body.getUserLabel() : "user";
        return ResponseEntity.ok(service.simEvaluate(userLabel, ctx, step));
    }

    @PostMapping("/sim/concurrent-demo")
    public ResponseEntity<?> simConcurrentUpdateDemo(@RequestBody Map<String, Object> body) {
        int step = ((Number) body.getOrDefault("step", 6)).intValue();
        return ResponseEntity.ok(service.simConcurrentUpdateDemo(step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    @GetMapping("/sim/snapshot")
    public ResponseEntity<?> simGetSnapshot() {
        return ResponseEntity.ok(service.simSnapshot());
    }
}
