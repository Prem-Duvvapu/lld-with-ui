package com.lld.atm.controller;

import com.lld.atm.dispenser.DispenseMode;
import com.lld.atm.exception.InvalidAtmRequestException;
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
    public ResponseEntity<Map<String, Object>> insertCard(@RequestBody Map<String, Object> request) {
        String cardNumber = stringField(request, "cardNumber");
        Map<String, Object> result = atmService.insertCard(cardNumber);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/authenticate")
    public ResponseEntity<Map<String, Object>> authenticate(@RequestBody Map<String, Object> request) {
        String cardNumber = stringField(request, "cardNumber");
        String pin = stringField(request, "pin");
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
                                                          @RequestBody Map<String, Object> request) {
        double amount = amountField(request);
        DispenseMode mode = modeField(request);
        WithdrawalTransaction transaction = atmService.withdraw(accountNumber, amount, mode);
        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/{accountNumber}/deposit")
    public ResponseEntity<DepositTransaction> deposit(@PathVariable String accountNumber,
                                                      @RequestBody Map<String, Object> request) {
        double amount = amountField(request);
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
        return ResponseEntity.ok(atmService.simReset());
    }

    @PostMapping("/sim/insert-card")
    public ResponseEntity<Map<String, Object>> simInsertCard(@RequestBody Map<String, Object> request) {
        Map<String, Object> res = atmService.simInsertCard(stringField(request, "cardNumber"));
        return ResponseEntity.ok(res);
    }

    @PostMapping("/sim/authenticate")
    public ResponseEntity<Map<String, Object>> simAuthenticate(@RequestBody Map<String, Object> request) {
        String cardNumber = stringField(request, "cardNumber");
        String pin = stringField(request, "pin");
        Map<String, Object> res = atmService.simAuthenticate(cardNumber, pin);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/sim/withdraw")
    public ResponseEntity<Map<String, Object>> simWithdraw(@RequestBody Map<String, Object> request) {
        String accountNumber = stringField(request, "accountNumber");
        double amount = amountField(request);
        DispenseMode mode = modeField(request);
        Map<String, Object> res = atmService.simWithdraw(accountNumber, amount, mode);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/sim/eject")
    public ResponseEntity<Map<String, Object>> simEject() {
        return ResponseEntity.ok(atmService.simEject());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<SimEvent>> simGetEvents() {
        return ResponseEntity.ok(atmService.getSimEvents());
    }

    @GetMapping("/sim/state")
    public ResponseEntity<Map<String, Object>> simGetState() {
        return ResponseEntity.ok(atmService.getSimSnapshots());
    }

    @GetMapping("/sim/snapshots")
    public ResponseEntity<Map<String, Object>> simGetSnapshots() {
        return ResponseEntity.ok(atmService.getSimSnapshots());
    }

    private static String stringField(Map<String, Object> request, String field) {
        if (request.get(field) instanceof String value && !value.isBlank()) return value;
        throw new InvalidAtmRequestException("'" + field + "' must be a nonblank string");
    }

    private static double amountField(Map<String, Object> request) {
        if (request.get("amount") instanceof Number value && Double.isFinite(value.doubleValue())) {
            return value.doubleValue();
        }
        throw new InvalidAtmRequestException("'amount' must be a finite JSON number");
    }

    private static DispenseMode modeField(Map<String, Object> request) {
        Object value = request.get("mode");
        if (value == null) return DispenseMode.MINIMIZE_NOTES;
        if (value instanceof String name) {
            try {
                return DispenseMode.valueOf(name);
            } catch (IllegalArgumentException ignored) {
                // Give invalid policy names the same typed request contract as invalid types.
            }
        }
        throw new InvalidAtmRequestException("'mode' must be MINIMIZE_NOTES or CONSERVE_LARGE_NOTES");
    }
}
