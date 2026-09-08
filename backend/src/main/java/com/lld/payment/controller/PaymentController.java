package com.lld.payment.controller;

import com.lld.payment.model.Payment;
import com.lld.payment.model.PaymentMethodType;
import com.lld.payment.model.SimEvent;
import com.lld.payment.service.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping("/charge")
    public Payment charge(@RequestBody Map<String, Object> body) {
        String idempotencyKey = body.get("idempotencyKey") == null ? null : body.get("idempotencyKey").toString();
        String payerId = body.get("payerId").toString();
        double amount = Double.parseDouble(body.get("amount").toString());
        PaymentMethodType method = PaymentMethodType.valueOf(body.get("method").toString());
        return service.charge(idempotencyKey, payerId, amount, method);
    }

    @GetMapping("/{paymentId}")
    public Payment getPayment(@PathVariable String paymentId) {
        return service.getPayment(paymentId);
    }

    @PostMapping("/{paymentId}/refund")
    public Payment refund(@PathVariable String paymentId) {
        return service.refund(paymentId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @PostMapping("/sim/charge")
    public Map<String, Object> simCharge(@RequestBody Map<String, Object> body) {
        String idempotencyKey = body.get("idempotencyKey") == null ? null : body.get("idempotencyKey").toString();
        String payerId = body.get("payerId").toString();
        double amount = Double.parseDouble(body.get("amount").toString());
        PaymentMethodType method = PaymentMethodType.valueOf(body.get("method").toString());
        return service.simCharge(idempotencyKey, payerId, amount, method);
    }

    @PostMapping("/sim/{paymentId}/refund")
    public Map<String, Object> simRefund(@PathVariable String paymentId) {
        return service.simRefund(paymentId);
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        String idempotencyKey = body.get("idempotencyKey").toString();
        String payerId = body.get("payerId").toString();
        double amount = Double.parseDouble(body.get("amount").toString());
        PaymentMethodType method = PaymentMethodType.valueOf(body.get("method").toString());
        int attempts = Integer.parseInt(body.getOrDefault("attempts", "6").toString());
        return service.simDoubleSubmitRace(idempotencyKey, payerId, amount, method, attempts);
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
