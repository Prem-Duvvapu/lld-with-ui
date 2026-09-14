package com.lld.splitwise.controller;

import com.lld.config.RequestFields;
import com.lld.splitwise.exception.InvalidSplitException;
import com.lld.splitwise.model.*;
import com.lld.splitwise.service.SplitwiseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/splitwise")
@CrossOrigin(origins = "*")
public class SplitwiseController {
    private final SplitwiseService splitwiseService;

    public SplitwiseController(SplitwiseService splitwiseService) {
        this.splitwiseService = splitwiseService;
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        User user = splitwiseService.createUser(RequestFields.requireString(body, "name"), RequestFields.requireString(body, "email"));
        return ResponseEntity.ok(user);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(splitwiseService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable long id) {
        return ResponseEntity.ok(splitwiseService.getUser(id));
    }

    @PostMapping("/groups")
    public ResponseEntity<Group> createGroup(@RequestBody Map<String, Object> body) {
        String name = RequestFields.requireString(body, "name");
        List<Number> memberIdsRaw = RequestFields.requireList(body, "memberIds");
        List<Long> memberIds = memberIdsRaw.stream().map(Number::longValue).toList();
        Group group = splitwiseService.createGroup(name, memberIds);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/groups")
    public ResponseEntity<List<Group>> getAllGroups() {
        return ResponseEntity.ok(splitwiseService.getAllGroups());
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<Group> getGroup(@PathVariable long id) {
        return ResponseEntity.ok(splitwiseService.getGroup(id));
    }

    @PutMapping("/groups/{groupId}/members/{userId}")
    public ResponseEntity<Group> addMemberToGroup(@PathVariable long groupId, @PathVariable long userId) {
        Group group = splitwiseService.addMemberToGroup(groupId, userId);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/expenses")
    public ResponseEntity<Expense> addExpense(@RequestBody Map<String, Object> body) {
        String description = RequestFields.requireString(body, "description");
        double amount = RequestFields.requireDouble(body, "amount");
        long paidBy = RequestFields.requireLong(body, "paidBy");
        long groupId = RequestFields.requireLong(body, "groupId");
        // `splits` stays optional: an EQUAL split is expressed by omitting it entirely.
        List<Map<String, Object>> splitsRaw = (List<Map<String, Object>>) body.get("splits");

        List<Split> splits = (splitsRaw == null) ? List.of() : splitsRaw.stream().map(s -> {
            Split split = new Split();
            User user = new User();
            user.setId(RequestFields.requireLong(s, "userId"));
            split.setUser(user);
            split.setAmount(s.get("amount") != null ? RequestFields.requireDouble(s, "amount") : 0);
            split.setPercentage(s.get("percentage") != null ? RequestFields.requireDouble(s, "percentage") : 0);
            split.setType(parseSplitType(s.get("type")));
            return split;
        }).toList();

        Expense expense = splitwiseService.addExpense(description, amount, paidBy, groupId, splits);
        return ResponseEntity.ok(expense);
    }

    @GetMapping("/groups/{groupId}/expenses")
    public ResponseEntity<List<Expense>> getGroupExpenses(@PathVariable long groupId) {
        return ResponseEntity.ok(splitwiseService.getGroupExpenses(groupId));
    }

    @GetMapping("/users/{userId}/balances")
    public ResponseEntity<Map<String, Double>> getBalances(@PathVariable long userId) {
        return ResponseEntity.ok(splitwiseService.getBalances(userId));
    }

    @PostMapping("/settle")
    public ResponseEntity<Settlement> settleUp(@RequestBody Map<String, Object> body) {
        long fromUserId = RequestFields.requireLong(body, "fromUserId");
        long toUserId = RequestFields.requireLong(body, "toUserId");
        long groupId = RequestFields.requireLong(body, "groupId");
        double amount = RequestFields.requireDouble(body, "amount");
        Settlement settlement = splitwiseService.settleUp(fromUserId, toUserId, groupId, amount);
        return ResponseEntity.ok(settlement);
    }

    @GetMapping("/users/{userId}/transactions")
    public ResponseEntity<List<Object>> getTransactionHistory(@PathVariable long userId) {
        return ResponseEntity.ok(splitwiseService.getTransactionHistory(userId));
    }

    @GetMapping("/groups/{groupId}/simplified-debts")
    public ResponseEntity<List<SuggestedSettlement>> getSimplifiedDebts(@PathVariable long groupId) {
        return ResponseEntity.ok(splitwiseService.getSimplifiedDebts(groupId));
    }

    @GetMapping("/events")
    public ResponseEntity<List<ExpenseEvent>> getEventLog() {
        return ResponseEntity.ok(splitwiseService.getEventLog());
    }

    // --- ISOLATED SIMULATION ENDPOINTS ---
    @PostMapping("/sim/reset")
    public ResponseEntity<Map<String, String>> simReset() {
        splitwiseService.simReset();
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/sim/users")
    public ResponseEntity<User> simCreateUser(@RequestBody Map<String, String> body) {
        User user = splitwiseService.simCreateUser(RequestFields.requireString(body, "name"), RequestFields.requireString(body, "email"));
        return ResponseEntity.ok(user);
    }

    @PostMapping("/sim/groups")
    public ResponseEntity<Group> simCreateGroup(@RequestBody Map<String, Object> body) {
        String name = RequestFields.requireString(body, "name");
        List<Number> memberIdsRaw = RequestFields.requireList(body, "memberIds");
        List<Long> memberIds = memberIdsRaw.stream().map(Number::longValue).toList();
        Group group = splitwiseService.simCreateGroup(name, memberIds);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/sim/expenses")
    public ResponseEntity<Expense> simAddExpense(@RequestBody Map<String, Object> body) {
        String description = RequestFields.requireString(body, "description");
        double amount = RequestFields.requireDouble(body, "amount");
        long paidBy = RequestFields.requireLong(body, "paidBy");
        long groupId = RequestFields.requireLong(body, "groupId");
        // `splits` stays optional: an EQUAL split is expressed by omitting it entirely.
        List<Map<String, Object>> splitsRaw = (List<Map<String, Object>>) body.get("splits");

        List<Split> splits = (splitsRaw == null) ? List.of() : splitsRaw.stream().map(s -> {
            Split split = new Split();
            User user = new User();
            user.setId(RequestFields.requireLong(s, "userId"));
            split.setUser(user);
            split.setAmount(s.get("amount") != null ? RequestFields.requireDouble(s, "amount") : 0);
            split.setPercentage(s.get("percentage") != null ? RequestFields.requireDouble(s, "percentage") : 0);
            split.setType(parseSplitType(s.get("type")));
            return split;
        }).toList();

        Expense expense = splitwiseService.simAddExpense(description, amount, paidBy, groupId, splits);
        return ResponseEntity.ok(expense);
    }

    @PostMapping("/sim/settle")
    public ResponseEntity<Settlement> simSettleUp(@RequestBody Map<String, Object> body) {
        long fromUserId = RequestFields.requireLong(body, "fromUserId");
        long toUserId = RequestFields.requireLong(body, "toUserId");
        long groupId = RequestFields.requireLong(body, "groupId");
        double amount = RequestFields.requireDouble(body, "amount");
        Settlement settlement = splitwiseService.simSettleUp(fromUserId, toUserId, groupId, amount);
        return ResponseEntity.ok(settlement);
    }

    @GetMapping("/sim/balances")
    public ResponseEntity<Map<String, Map<String, Double>>> simGetBalances() {
        return ResponseEntity.ok(splitwiseService.simGetAllBalances());
    }

    @GetMapping("/sim/events")
    public ResponseEntity<List<ExpenseEvent>> simGetEvents() {
        return ResponseEntity.ok(splitwiseService.simGetEvents());
    }

    @GetMapping("/sim/groups/{groupId}/simplified-debts")
    public ResponseEntity<List<SuggestedSettlement>> simGetSimplifiedDebts(@PathVariable long groupId) {
        return ResponseEntity.ok(splitwiseService.simGetSimplifiedDebts(groupId));
    }

    private SplitType parseSplitType(Object rawType) {
        if (!(rawType instanceof String value) || value.isBlank()) {
            throw new InvalidSplitException("Split type is required");
        }
        try {
            return SplitType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new InvalidSplitException("Unsupported split type: " + value);
        }
    }
}
