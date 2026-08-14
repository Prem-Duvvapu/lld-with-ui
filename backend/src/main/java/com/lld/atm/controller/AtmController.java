package com.lld.atm.controller;

import com.lld.atm.model.*;
import com.lld.atm.service.AtmService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/atm")
@CrossOrigin(origins = "*")
public class AtmController {

    private final AtmService atmService;

    public AtmController(AtmService atmService) {
        this.atmService = atmService;
    }

    @PostMapping("/insert-card")
    public ResponseEntity<Map<String, Object>> insertCard(@RequestBody Map<String, String> request) {
        String cardNumber = request.get("cardNumber");
        Map<String, Object> result = atmService.insertCard(cardNumber);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/authenticate")
    public ResponseEntity<Map<String, Object>> authenticate(@RequestBody Map<String, String> request) {
        String cardNumber = request.get("cardNumber");
        String pin = request.get("pin");
        Account account = atmService.authenticate(cardNumber, pin);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", account.getId());
        response.put("accountNumber", account.getAccountNumber());
        response.put("holderName", account.getHolderName());
        response.put("balance", account.getBalance());
        response.put("state", atmService.getCurrentState());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{accountNumber}/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@PathVariable String accountNumber) {
        double balance = atmService.getBalance(accountNumber);
        return ResponseEntity.ok(Map.of("accountNumber", accountNumber, "balance", balance));
    }

    @PostMapping("/{accountNumber}/withdraw")
    public ResponseEntity<WithdrawalTransaction> withdraw(@PathVariable String accountNumber,
                                                          @RequestBody Map<String, Double> request) {
        double amount = request.get("amount");
        WithdrawalTransaction transaction = atmService.withdraw(accountNumber, amount);
        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/{accountNumber}/deposit")
    public ResponseEntity<DepositTransaction> deposit(@PathVariable String accountNumber,
                                                      @RequestBody Map<String, Object> request) {
        double amount = Double.parseDouble(request.get("amount").toString());
        DepositTransaction transaction = atmService.deposit(accountNumber, amount, null);
        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/eject")
    public ResponseEntity<Map<String, Object>> ejectCard() {
        Map<String, Object> res = atmService.ejectCard();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{accountNumber}/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@PathVariable String accountNumber) {
        List<Transaction> transactions = atmService.getTransactions(accountNumber);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/dispenser")
    public ResponseEntity<Map<String, Object>> getDispenserStatus() {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalCash", atmService.getCashDispenser().getTotalCashAvailable());
        res.put("inventory", atmService.getCashDispenser().getInventory());
        return ResponseEntity.ok(res);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, Object>> simReset() {
        atmService.initSimState();
        return ResponseEntity.ok(atmService.getSimSnapshots());
    }

    @PostMapping("/sim/authenticate")
    public ResponseEntity<Map<String, Object>> simAuthenticate(@RequestBody Map<String, String> request) {
        String cardNumber = request.get("cardNumber");
        String pin = request.get("pin");
        Map<String, Object> res = atmService.simAuthenticate(cardNumber, pin);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/sim/withdraw")
    public ResponseEntity<Map<String, Object>> simWithdraw(@RequestBody Map<String, Object> request) {
        String accountNumber = request.get("accountNumber").toString();
        double amount = Double.parseDouble(request.get("amount").toString());
        Map<String, Object> res = atmService.simWithdraw(accountNumber, amount);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(atmService.getSimEvents());
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(atmService.getSimSnapshots());
    }
}
