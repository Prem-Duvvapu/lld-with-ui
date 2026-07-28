package com.splitwise.service;

import com.splitwise.model.*;
import com.splitwise.repository.SplitwiseRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class SplitwiseService {
    private final SplitwiseRepository repository;
    private final ReentrantLock lock = new ReentrantLock();

    public SplitwiseService(SplitwiseRepository repository) {
        this.repository = repository;
    }

    public User createUser(String name, String email) {
        lock.lock();
        try {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            return repository.saveUser(user);
        } finally {
            lock.unlock();
        }
    }

    public Group createGroup(String name, List<Long> memberIds) {
        lock.lock();
        try {
            List<User> members = memberIds.stream()
                    .map(repository::getUser)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            Group group = new Group();
            group.setName(name);
            group.setMembers(members);
            return repository.saveGroup(group);
        } finally {
            lock.unlock();
        }
    }

    public Group addMemberToGroup(long groupId, long userId) {
        lock.lock();
        try {
            User user = repository.getUser(userId);
            if (user == null) throw new RuntimeException("User not found: " + userId);
            Group group = repository.getGroup(groupId);
            if (group == null) throw new RuntimeException("Group not found: " + groupId);
            repository.addMemberToGroup(groupId, user);
            return repository.getGroup(groupId);
        } finally {
            lock.unlock();
        }
    }

    public Expense addExpense(String description, double amount, Long paidByUserId, Long groupId, List<Split> splits) {
        lock.lock();
        try {
            User paidBy = repository.getUser(paidByUserId);
            if (paidBy == null) throw new RuntimeException("User not found: " + paidByUserId);
            Group group = repository.getGroup(groupId);
            if (group == null) throw new RuntimeException("Group not found: " + groupId);

            SplitType splitType = splits.isEmpty() ? SplitType.EQUAL : splits.get(0).getType();
            List<Split> resolvedSplits;

            if (splitType == SplitType.EQUAL) {
                resolvedSplits = handleEqualSplit(amount, group);
            } else if (splitType == SplitType.PERCENTAGE) {
                resolvedSplits = handlePercentageSplit(amount, splits, group);
            } else if (splitType == SplitType.EXACT) {
                resolvedSplits = handleExactSplit(amount, splits);
            } else {
                throw new RuntimeException("Invalid split type");
            }

            Expense expense = new Expense();
            expense.setDescription(description);
            expense.setAmount(amount);
            expense.setPaidBy(paidBy);
            expense.setGroupId(groupId);
            expense.setSplits(resolvedSplits);
            expense = repository.saveExpense(expense);

            for (Split split : resolvedSplits) {
                if (split.getUser().getId() != paidByUserId) {
                    repository.updateBalance(paidByUserId, split.getUser().getId(), split.getAmount());
                }
            }

            return expense;
        } finally {
            lock.unlock();
        }
    }

    private List<Split> handleEqualSplit(double amount, Group group) {
        List<User> members = group.getMembers();
        int totalMembers = members.size();
        double share = Math.round((amount / totalMembers) * 100.0) / 100.0;
        double remainder = Math.round((amount - share * totalMembers) * 100.0) / 100.0;
        List<Split> splits = new ArrayList<>();
        long splitId = 1;
        for (int i = 0; i < totalMembers; i++) {
            double splitAmount = share;
            if (i == 0) splitAmount = Math.round((share + remainder) * 100.0) / 100.0;
            Split split = new Split(splitId++, members.get(i), splitAmount, 0, SplitType.EQUAL);
            splits.add(split);
        }
        return splits;
    }

    private List<Split> handlePercentageSplit(double amount, List<Split> splits, Group group) {
        double totalPercentage = splits.stream().mapToDouble(Split::getPercentage).sum();
        if (Math.abs(totalPercentage - 100.0) > 0.01) {
            throw new RuntimeException("Percentages must sum to 100, got: " + totalPercentage);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splits) {
            double splitAmount = Math.round((amount * s.getPercentage() / 100.0) * 100.0) / 100.0;
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new RuntimeException("User not found: " + s.getUser().getId());
            Split split = new Split(splitId++, user, splitAmount, s.getPercentage(), SplitType.PERCENTAGE);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }

    private List<Split> handleExactSplit(double amount, List<Split> splits) {
        double totalAmount = splits.stream().mapToDouble(Split::getAmount).sum();
        if (Math.abs(totalAmount - amount) > 0.01) {
            throw new RuntimeException("Exact amounts must sum to total amount, got: " + totalAmount + " expected: " + amount);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splits) {
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new RuntimeException("User not found: " + s.getUser().getId());
            Split split = new Split(splitId++, user, s.getAmount(), 0, SplitType.EXACT);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }

    public Map<String, Double> getBalances(long userId) {
        Map<String, Double> netBalance = repository.getNetBalance(userId);
        Map<String, Double> result = new HashMap<>();
        for (Map.Entry<String, Double> entry : netBalance.entrySet()) {
            long otherId = Long.parseLong(entry.getKey());
            User otherUser = repository.getUser(otherId);
            if (otherUser != null) {
                result.put(otherUser.getName(), entry.getValue());
            }
        }
        return result;
    }

    public Settlement settleUp(long fromUserId, long toUserId, long groupId, double amount) {
        lock.lock();
        try {
            User fromUser = repository.getUser(fromUserId);
            User toUser = repository.getUser(toUserId);
            if (fromUser == null) throw new RuntimeException("User not found: " + fromUserId);
            if (toUser == null) throw new RuntimeException("User not found: " + toUserId);

            Settlement settlement = new Settlement();
            settlement.setFromUser(fromUser);
            settlement.setToUser(toUser);
            settlement.setAmount(amount);
            settlement.setGroupId(groupId);
            settlement.setTimestamp(LocalDateTime.now());

            return repository.saveSettlement(settlement);
        } finally {
            lock.unlock();
        }
    }

    public List<Object> getTransactionHistory(long userId) {
        return repository.getTransactionHistory(userId);
    }

    public List<Expense> getGroupExpenses(long groupId) {
        return repository.getExpensesByGroup(groupId);
    }

    public User getUser(long id) {
        return repository.getUser(id);
    }

    public List<User> getAllUsers() {
        return repository.getAllUsers();
    }

    public Group getGroup(long id) {
        return repository.getGroup(id);
    }

    public List<Group> getAllGroups() {
        return repository.getAllGroups();
    }
}