package com.lld.digitalwallet.controller;

import com.lld.config.ErrorResponse;

import com.lld.digitalwallet.model.Transaction;
import com.lld.digitalwallet.model.Wallet;
import com.lld.digitalwallet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
@CrossOrigin(origins = "*")
public class WalletController {
    private final WalletService service;

    public WalletController(WalletService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createWallet(@RequestBody Map<String, String> request) {
        try {
            Wallet wallet = service.createWallet(request.get("userId"), request.get("userName"));
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping
    public List<Wallet> getAllWallets() {
        return service.getAllWallets();
    }

    @GetMapping("/{walletId}")
    public ResponseEntity<?> getWallet(@PathVariable Long walletId) {
        try {
            Wallet wallet = service.getWallet(walletId);
            if (wallet == null) return ResponseEntity.badRequest().body(Map.of("error", "Wallet not found"));
            return ResponseEntity.ok(wallet);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping("/{walletId}/balance")
    public ResponseEntity<?> getBalance(@PathVariable Long walletId) {
        try {
            double balance = service.getBalance(walletId);
            return ResponseEntity.ok(Map.of("balance", balance));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/{walletId}/add-funds")
    public ResponseEntity<?> addFunds(@PathVariable Long walletId, @RequestBody Map<String, Object> request) {
        try {
            double amount = ((Number) request.get("amount")).doubleValue();
            String paymentMethod = (String) request.getOrDefault("paymentMethod", "CARD");
            return ResponseEntity.ok(service.addFunds(walletId, amount, paymentMethod));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendMoney(@RequestBody Map<String, Object> request) {
        try {
            Long fromWalletId = ((Number) request.get("fromWalletId")).longValue();
            Long toWalletId = ((Number) request.get("toWalletId")).longValue();
            double amount = ((Number) request.get("amount")).doubleValue();
            String description = (String) request.getOrDefault("description", "Transfer");
            return ResponseEntity.ok(service.sendMoney(fromWalletId, toWalletId, amount, description));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }

    @GetMapping("/{walletId}/transactions")
    public ResponseEntity<?> getTransactions(@PathVariable Long walletId) {
        try {
            List<Transaction> transactions = service.getTransactions(walletId);
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ErrorResponse.of(e));
        }
    }
}