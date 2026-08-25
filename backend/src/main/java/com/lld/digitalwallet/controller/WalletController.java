package com.lld.digitalwallet.controller;

import com.lld.digitalwallet.exception.InvalidAmountException;
import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.model.WalletSimEvent;
import com.lld.digitalwallet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Translates HTTP only — every call delegates straight to {@link WalletService}. Validation and
 * error mapping live in the service/command layer and {@code GlobalExceptionHandler}; this class
 * never catches an exception itself.
 */
@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "*")
public class WalletController {
    private final WalletService service;

    public WalletController(WalletService service) {
        this.service = service;
    }

    // =========================================================================
    // PRODUCTION REST ENDPOINTS
    // =========================================================================

    @PostMapping("/create")
    public ResponseEntity<Wallet> createWallet(@RequestBody Map<String, String> request) {
        Wallet wallet = service.createWallet(request.get("userId"), request.get("userName"));
        return ResponseEntity.ok(wallet);
    }

    @GetMapping
    public List<Wallet> getAllWallets() {
        return service.getAllWallets();
    }

    @GetMapping("/{walletId}")
    public ResponseEntity<Wallet> getWallet(@PathVariable long walletId) {
        return ResponseEntity.ok(service.getWallet(walletId));
    }

    @GetMapping("/{walletId}/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@PathVariable long walletId) {
        return ResponseEntity.ok(Map.of("balance", service.getBalance(walletId)));
    }

    @PostMapping("/{walletId}/add-funds")
    public ResponseEntity<Map<String, Object>> addFunds(@PathVariable long walletId, @RequestBody Map<String, Object> request) {
        double amount = numberOf(request.get("amount"));
        String paymentMethod = (String) request.getOrDefault("paymentMethod", "CARD");
        return ResponseEntity.ok(service.addFunds(walletId, amount, paymentMethod));
    }

    @PostMapping("/{walletId}/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(@PathVariable long walletId, @RequestBody Map<String, Object> request) {
        double amount = numberOf(request.get("amount"));
        String description = (String) request.getOrDefault("description", "Withdrawal");
        return ResponseEntity.ok(service.withdrawFunds(walletId, amount, description));
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMoney(@RequestBody Map<String, Object> request) {
        long fromWalletId = (long) numberOf(request.get("fromWalletId"));
        long toWalletId = (long) numberOf(request.get("toWalletId"));
        double amount = numberOf(request.get("amount"));
        String description = (String) request.getOrDefault("description", "Transfer");
        return ResponseEntity.ok(service.sendMoney(fromWalletId, toWalletId, amount, description));
    }

    @GetMapping("/{walletId}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable long walletId) {
        return ResponseEntity.ok(service.getTransactions(walletId));
    }

    /** The Command pattern's execution log — every credit/debit/transfer that has run, in order. */
    @GetMapping("/command-log")
    public ResponseEntity<List<String>> getCommandLog() {
        return ResponseEntity.ok(service.getCommandLog());
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        return ResponseEntity.ok(service.simReset());
    }

    @GetMapping("/sim/state")
    public ResponseEntity<Map<String, Object>> simState() {
        return ResponseEntity.ok(service.getSimSnapshot());
    }

    @PostMapping("/sim/credit")
    public ResponseEntity<Map<String, Object>> simCredit(@RequestBody Map<String, Object> body) {
        long walletId = (long) numberOf(body.get("walletId"));
        double amount = numberOf(body.get("amount"));
        String paymentMethod = (String) body.getOrDefault("paymentMethod", "CARD");
        int step = (int) numberOf(body.getOrDefault("step", 3));
        return ResponseEntity.ok(service.simCredit(walletId, amount, paymentMethod, step));
    }

    @PostMapping("/sim/debit")
    public ResponseEntity<Map<String, Object>> simDebit(@RequestBody Map<String, Object> body) {
        long walletId = (long) numberOf(body.get("walletId"));
        double amount = numberOf(body.get("amount"));
        int step = (int) numberOf(body.getOrDefault("step", 4));
        return ResponseEntity.ok(service.simDebit(walletId, amount, step));
    }

    @PostMapping("/sim/transfer")
    public ResponseEntity<Map<String, Object>> simTransfer(@RequestBody Map<String, Object> body) {
        long fromWalletId = (long) numberOf(body.get("fromWalletId"));
        long toWalletId = (long) numberOf(body.get("toWalletId"));
        double amount = numberOf(body.get("amount"));
        String description = (String) body.getOrDefault("description", "Simulated transfer");
        int step = (int) numberOf(body.getOrDefault("step", 6));
        return ResponseEntity.ok(service.simTransfer(fromWalletId, toWalletId, amount, description, step));
    }

    @PostMapping("/sim/race")
    public ResponseEntity<Map<String, Object>> simRace(@RequestBody Map<String, Object> body) {
        long walletAId = (long) numberOf(body.get("walletAId"));
        long walletBId = (long) numberOf(body.get("walletBId"));
        int transfers = body.get("transfers") == null ? 10 : (int) numberOf(body.get("transfers"));
        double amountEach = body.get("amountEach") == null ? 1.0 : numberOf(body.get("amountEach"));
        int step = (int) numberOf(body.getOrDefault("step", 8));
        return ResponseEntity.ok(service.simRace(walletAId, walletBId, transfers, amountEach, step));
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<WalletSimEvent>> simGetEvents() {
        return ResponseEntity.ok(service.simGetEvents());
    }

    // ------------------------------------------------------------ helpers

    private static double numberOf(Object value) {
        if (!(value instanceof Number n)) {
            throw new InvalidAmountException("A numeric value is required.");
        }
        return n.doubleValue();
    }
}
