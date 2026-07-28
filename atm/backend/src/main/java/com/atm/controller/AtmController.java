package com.atm.controller;

import com.atm.model.Account;
import com.atm.model.Transaction;
import com.atm.service.AtmService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/atm")
public class AtmController {
    private final AtmService atmService;

    public AtmController(AtmService atmService) {
        this.atmService = atmService;
    }

    @PostMapping("/authenticate")
    public ResponseEntity<Map<String, Object>> authenticate(@RequestBody Map<String, String> request) {
        try {
            Account account = atmService.authenticate(request.get("cardNumber"), request.get("pin"));
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", account.getId());
            response.put("accountNumber", account.getAccountNumber());
            response.put("holderName", account.getHolderName());
            response.put("balance", account.getBalance());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{accountNumber}/balance")
    public ResponseEntity<Map<String, Double>> getBalance(@PathVariable String accountNumber) {
        try {
            double balance = atmService.getBalance(accountNumber);
            return ResponseEntity.ok(Map.of("balance", balance));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{accountNumber}/withdraw")
    public ResponseEntity<Transaction> withdraw(@PathVariable String accountNumber,
                                                 @RequestBody Map<String, Double> request) {
        Transaction transaction = atmService.withdraw(accountNumber, request.get("amount"));
        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/{accountNumber}/deposit")
    public ResponseEntity<Transaction> deposit(@PathVariable String accountNumber,
                                                @RequestBody Map<String, Double> request) {
        Transaction transaction = atmService.deposit(accountNumber, request.get("amount"));
        return ResponseEntity.ok(transaction);
    }

    @GetMapping("/{accountNumber}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable String accountNumber) {
        try {
            List<Transaction> transactions = atmService.getTransactions(accountNumber);
            return ResponseEntity.ok(transactions);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
