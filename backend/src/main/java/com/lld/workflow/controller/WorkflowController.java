package com.lld.workflow.controller;

import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.SimEvent;
import com.lld.workflow.model.WorkflowInstance;
import com.lld.workflow.service.WorkflowService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
@CrossOrigin(origins = "*")
public class WorkflowController {

    private final WorkflowService service;

    public WorkflowController(WorkflowService service) {
        this.service = service;
    }

    @PostMapping
    public WorkflowInstance submit(@RequestBody Map<String, Object> body) {
        String requester = body.get("requester").toString();
        double amount = Double.parseDouble(body.get("amount").toString());
        EscalationStrategyType strategyType = EscalationStrategyType.valueOf(
                body.getOrDefault("escalationStrategyType", "AUTO_ESCALATE").toString());
        return service.submit(requester, amount, strategyType);
    }

    @GetMapping("/{id}")
    public WorkflowInstance getWorkflow(@PathVariable String id) {
        return service.getWorkflow(id);
    }

    @GetMapping
    public List<WorkflowInstance> getAllWorkflows() {
        return service.getAllWorkflows();
    }

    @PostMapping("/{id}/approve")
    public WorkflowInstance approve(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String approverId = body.get("approverId").toString();
        ApproverRole role = ApproverRole.valueOf(body.get("role").toString());
        return service.approve(id, approverId, role);
    }

    @PostMapping("/{id}/reject")
    public WorkflowInstance reject(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String approverId = body.get("approverId").toString();
        ApproverRole role = ApproverRole.valueOf(body.get("role").toString());
        String reason = body.get("reason") != null ? body.get("reason").toString() : null;
        return service.reject(id, approverId, role, reason);
    }

    @PostMapping("/{id}/escalate")
    public WorkflowInstance escalate(@PathVariable String id, @RequestBody Map<String, Object> body) {
        int stepIndex = Integer.parseInt(body.get("stepIndex").toString());
        return service.triggerEscalation(id, stepIndex);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/submit")
    public Map<String, Object> simSubmit(@RequestBody Map<String, Object> body) {
        String requester = body.get("requester").toString();
        double amount = Double.parseDouble(body.get("amount").toString());
        EscalationStrategyType strategyType = EscalationStrategyType.valueOf(
                body.getOrDefault("escalationStrategyType", "AUTO_ESCALATE").toString());
        return service.simSubmit(requester, amount, strategyType);
    }

    @PostMapping("/sim/{id}/approve")
    public Map<String, Object> simApprove(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String approverId = body.get("approverId").toString();
        ApproverRole role = ApproverRole.valueOf(body.get("role").toString());
        return service.simApprove(id, approverId, role);
    }

    @PostMapping("/sim/{id}/reject")
    public Map<String, Object> simReject(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String approverId = body.get("approverId").toString();
        ApproverRole role = ApproverRole.valueOf(body.get("role").toString());
        String reason = body.get("reason") != null ? body.get("reason").toString() : null;
        return service.simReject(id, approverId, role, reason);
    }

    @PostMapping("/sim/{id}/race")
    public Map<String, Object> simRace(@PathVariable String id, @RequestBody Map<String, Object> body) throws InterruptedException {
        String approverId = body.getOrDefault("approverId", "RaceApprover").toString();
        return service.simRace(id, approverId);
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
