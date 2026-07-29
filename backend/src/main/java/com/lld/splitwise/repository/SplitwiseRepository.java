package com.lld.splitwise.repository;

import com.lld.splitwise.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class SplitwiseRepository {
    private final Map<Long, User> users = new ConcurrentHashMap<>();
    private final Map<Long, Group> groups = new ConcurrentHashMap<>();
    private final Map<Long, Expense> expenses = new ConcurrentHashMap<>();
    private final Map<Long, List<Settlement>> settlementsByGroup = new ConcurrentHashMap<>();
    private final Map<String, List<Expense>> expensesByGroup = new ConcurrentHashMap<>();
    private final Map<String, Double> balances = new ConcurrentHashMap<>();
    private final AtomicLong userIdCounter = new AtomicLong(1);
    private final AtomicLong groupIdCounter = new AtomicLong(1);
    private final AtomicLong expenseIdCounter = new AtomicLong(1);
    private final AtomicLong settlementIdCounter = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public SplitwiseRepository() {
        User alice = new User(userIdCounter.getAndIncrement(), "Alice", "alice@email.com");
        User bob = new User(userIdCounter.getAndIncrement(), "Bob", "bob@email.com");
        User charlie = new User(userIdCounter.getAndIncrement(), "Charlie", "charlie@email.com");
        User diana = new User(userIdCounter.getAndIncrement(), "Diana", "diana@email.com");
        users.put(alice.getId(), alice);
        users.put(bob.getId(), bob);
        users.put(charlie.getId(), charlie);
        users.put(diana.getId(), diana);
    }

    public User saveUser(User user) {
        lock.lock();
        try {
            user.setId(userIdCounter.getAndIncrement());
            users.put(user.getId(), user);
            return user;
        } finally {
            lock.unlock();
        }
    }

    public User getUser(long id) {
        return users.get(id);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    public Group saveGroup(Group group) {
        lock.lock();
        try {
            group.setId(groupIdCounter.getAndIncrement());
            groups.put(group.getId(), group);
            return group;
        } finally {
            lock.unlock();
        }
    }

    public Group getGroup(long id) {
        return groups.get(id);
    }

    public List<Group> getAllGroups() {
        return new ArrayList<>(groups.values());
    }

    public void addMemberToGroup(long groupId, User user) {
        lock.lock();
        try {
            Group group = groups.get(groupId);
            if (group != null) {
                List<User> members = new ArrayList<>(group.getMembers());
                members.add(user);
                group.setMembers(members);
            }
        } finally {
            lock.unlock();
        }
    }

    public Expense saveExpense(Expense expense) {
        lock.lock();
        try {
            expense.setId(expenseIdCounter.getAndIncrement());
            expense.setCreatedAt(java.time.LocalDateTime.now());
            expenses.put(expense.getId(), expense);

            String groupKey = String.valueOf(expense.getGroupId());
            expensesByGroup.computeIfAbsent(groupKey, k -> new ArrayList<>()).add(expense);

            return expense;
        } finally {
            lock.unlock();
        }
    }

    public Expense getExpense(long id) {
        return expenses.get(id);
    }

    public void updateBalance(long userId1, long userId2, double amount) {
        String key1 = userId1 + ":" + userId2;
        String key2 = userId2 + ":" + userId1;
        lock.lock();
        try {
            Double existing1 = balances.get(key1);
            Double existing2 = balances.get(key2);
            if (existing1 != null) {
                balances.put(key1, existing1 + amount);
            } else if (existing2 != null) {
                double newVal = existing2 - amount;
                if (newVal >= 0) {
                    balances.put(key2, newVal);
                } else {
                    balances.remove(key2);
                    balances.put(key1, -newVal);
                }
            } else {
                if (amount >= 0) {
                    balances.put(key1, amount);
                } else {
                    balances.put(key2, -amount);
                }
            }
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Double> getNetBalance(long userId) {
        Map<String, Double> result = new HashMap<>();
        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            String key = entry.getKey();
            String[] parts = key.split(":");
            long u1 = Long.parseLong(parts[0]);
            long u2 = Long.parseLong(parts[1]);
            if (u1 == userId) {
                result.put(String.valueOf(u2), entry.getValue());
            } else if (u2 == userId) {
                result.put(String.valueOf(u1), -entry.getValue());
            }
        }
        return result;
    }

    public Settlement saveSettlement(Settlement settlement) {
        lock.lock();
        try {
            settlement.setId(settlementIdCounter.getAndIncrement());
            settlement.setTimestamp(java.time.LocalDateTime.now());

            settlementsByGroup.computeIfAbsent(settlement.getGroupId(), k -> new ArrayList<>()).add(settlement);

            updateBalance(settlement.getFromUser().getId(), settlement.getToUser().getId(), -settlement.getAmount());

            return settlement;
        } finally {
            lock.unlock();
        }
    }

    public List<Settlement> getSettlements(long groupId) {
        return settlementsByGroup.getOrDefault(groupId, new ArrayList<>());
    }

    public List<Object> getTransactionHistory(long userId) {
        List<Object> transactions = new ArrayList<>();
        for (Expense expense : expenses.values()) {
            if (expense.getPaidBy().getId() == userId) {
                Map<String, Object> txn = new HashMap<>();
                txn.put("type", "EXPENSE");
                txn.put("description", expense.getDescription());
                txn.put("amount", expense.getAmount());
                txn.put("timestamp", expense.getCreatedAt());
                txn.put("groupId", expense.getGroupId());
                transactions.add(txn);
            } else {
                for (Split split : expense.getSplits()) {
                    if (split.getUser().getId() == userId) {
                        Map<String, Object> txn = new HashMap<>();
                        txn.put("type", "EXPENSE_SHARE");
                        txn.put("description", expense.getDescription());
                        txn.put("amount", split.getAmount());
                        txn.put("timestamp", expense.getCreatedAt());
                        txn.put("groupId", expense.getGroupId());
                        transactions.add(txn);
                        break;
                    }
                }
            }
        }
        for (List<Settlement> settleList : settlementsByGroup.values()) {
            for (Settlement settlement : settleList) {
                if (settlement.getFromUser().getId() == userId || settlement.getToUser().getId() == userId) {
                    Map<String, Object> txn = new HashMap<>();
                    txn.put("type", "SETTLEMENT");
                    txn.put("fromUser", settlement.getFromUser().getName());
                    txn.put("toUser", settlement.getToUser().getName());
                    txn.put("amount", settlement.getAmount());
                    txn.put("timestamp", settlement.getTimestamp());
                    txn.put("groupId", settlement.getGroupId());
                    transactions.add(txn);
                }
            }
        }
        transactions.sort((a, b) -> {
            Map<String, Object> m1 = (Map<String, Object>) a;
            Map<String, Object> m2 = (Map<String, Object>) b;
            Comparable ts1 = (Comparable) m1.get("timestamp");
            Comparable ts2 = (Comparable) m2.get("timestamp");
            if (ts1 == null && ts2 == null) return 0;
            if (ts1 == null) return 1;
            if (ts2 == null) return -1;
            return ts2.compareTo(ts1);
        });
        return transactions;
    }

    public List<Expense> getExpensesByGroup(long groupId) {
        return expensesByGroup.getOrDefault(String.valueOf(groupId), new ArrayList<>());
    }

    public Map<String, Double> getBalances() {
        return new HashMap<>(balances);
    }

    public User getUserByEmail(String email) {
        for (User user : users.values()) {
            if (user.getEmail().equals(email)) return user;
        }
        return null;
    }
}
