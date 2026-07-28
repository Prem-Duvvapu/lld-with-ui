package com.splitwise.controller;

import com.splitwise.model.*;
import com.splitwise.service.SplitwiseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/splitwise")
public class SplitwiseController {
    private final SplitwiseService splitwiseService;

    public SplitwiseController(SplitwiseService splitwiseService) {
        this.splitwiseService = splitwiseService;
    }

    @PostMapping("/users")
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> body) {
        User user = splitwiseService.createUser(body.get("name"), body.get("email"));
        return ResponseEntity.ok(user);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(splitwiseService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable long id) {
        User user = splitwiseService.getUser(id);
        if (user == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(user);
    }

    @PostMapping("/groups")
    public ResponseEntity<Group> createGroup(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        List<Integer> memberIdsRaw = (List<Integer>) body.get("memberIds");
        List<Long> memberIds = memberIdsRaw.stream().map(Integer::longValue).toList();
        Group group = splitwiseService.createGroup(name, memberIds);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/groups")
    public ResponseEntity<List<Group>> getAllGroups() {
        return ResponseEntity.ok(splitwiseService.getAllGroups());
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<Group> getGroup(@PathVariable long id) {
        Group group = splitwiseService.getGroup(id);
        if (group == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(group);
    }

    @PutMapping("/groups/{groupId}/members/{userId}")
    public ResponseEntity<Group> addMemberToGroup(@PathVariable long groupId, @PathVariable long userId) {
        Group group = splitwiseService.addMemberToGroup(groupId, userId);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/expenses")
    public ResponseEntity<Expense> addExpense(@RequestBody Map<String, Object> body) {
        String description = (String) body.get("description");
        double amount = ((Number) body.get("amount")).doubleValue();
        Long paidBy = ((Number) body.get("paidBy")).longValue();
        Long groupId = ((Number) body.get("groupId")).longValue();
        List<Map<String, Object>> splitsRaw = (List<Map<String, Object>>) body.get("splits");

        List<Split> splits = splitsRaw.stream().map(s -> {
            Split split = new Split();
            User user = new User();
            user.setId(((Number) s.get("userId")).longValue());
            split.setUser(user);
            split.setAmount(s.get("amount") != null ? ((Number) s.get("amount")).doubleValue() : 0);
            split.setPercentage(s.get("percentage") != null ? ((Number) s.get("percentage")).doubleValue() : 0);
            split.setType(SplitType.valueOf((String) s.get("type")));
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
        long fromUserId = ((Number) body.get("fromUserId")).longValue();
        long toUserId = ((Number) body.get("toUserId")).longValue();
        long groupId = ((Number) body.get("groupId")).longValue();
        double amount = ((Number) body.get("amount")).doubleValue();
        Settlement settlement = splitwiseService.settleUp(fromUserId, toUserId, groupId, amount);
        return ResponseEntity.ok(settlement);
    }

    @GetMapping("/users/{userId}/transactions")
    public ResponseEntity<List<Object>> getTransactionHistory(@PathVariable long userId) {
        return ResponseEntity.ok(splitwiseService.getTransactionHistory(userId));
    }
}