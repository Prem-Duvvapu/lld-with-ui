package com.lld.splitwise.service;

import com.lld.splitwise.model.*;
import com.lld.splitwise.repository.SplitwiseRepository;
import com.lld.splitwise.strategy.SplitStrategy;
import com.lld.splitwise.strategy.SplitStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class SplitwiseService {
    public static final ZoneId ZONE_IST = ZoneId.of("Asia/Kolkata");
    private final SplitwiseRepository repository;
    private final SplitwiseRepository simRepository;
    private final SplitStrategyFactory strategyFactory;
    private final List<ExpenseEvent> eventLog = new CopyOnWriteArrayList<>();
    private final List<ExpenseEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong eventIdCounter = new AtomicLong(1);
    private final AtomicLong simEventIdCounter = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public SplitwiseService(SplitwiseRepository repository, SplitStrategyFactory strategyFactory) {
        this.repository = repository;
        this.simRepository = new SplitwiseRepository();
        this.strategyFactory = strategyFactory;
    }

    public void reset() {
        lock.lock();
        try {
            repository.clear();
            eventLog.clear();
            eventIdCounter.set(1);
        } finally {
            lock.unlock();
        }
    }

    public User createUser(String name, String email) {
        lock.lock();
        try {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            User saved = repository.saveUser(user);
            logEvent(eventLog, eventIdCounter, ExpenseEventType.USER_CREATED, saved.getName(), "User created: " + saved.getName(), Map.of("userId", saved.getId(), "name", saved.getName()), repository);
            return saved;
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
            Group saved = repository.saveGroup(group);
            logEvent(eventLog, eventIdCounter, ExpenseEventType.GROUP_CREATED, "System", "Group created: " + saved.getName() + " with " + members.size() + " members", Map.of("groupId", saved.getId(), "name", saved.getName()), repository);
            return saved;
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
            Group updated = repository.getGroup(groupId);
            logEvent(eventLog, eventIdCounter, ExpenseEventType.MEMBER_ADDED, user.getName(), "Added " + user.getName() + " to group " + group.getName(), Map.of("groupId", groupId, "userId", userId), repository);
            return updated;
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

            SplitType splitType = (splits == null || splits.isEmpty()) ? SplitType.EQUAL : splits.get(0).getType();
            SplitStrategy strategy = strategyFactory.getStrategy(splitType);
            List<Split> resolvedSplits = strategy.calculateSplits(amount, group, splits, repository);

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

            logEvent(eventLog, eventIdCounter, ExpenseEventType.EXPENSE_ADDED, paidBy.getName(), paidBy.getName() + " paid ₹" + String.format("%.2f", amount) + " for " + description + " (" + splitType + " split)", Map.of("expenseId", expense.getId(), "amount", amount, "splitType", splitType.name(), "description", description), repository);

            return expense;
        } finally {
            lock.unlock();
        }
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
            settlement.setTimestamp(LocalDateTime.now(ZONE_IST));

            Settlement saved = repository.saveSettlement(settlement);
            logEvent(eventLog, eventIdCounter, ExpenseEventType.SETTLEMENT, fromUser.getName(), fromUser.getName() + " paid ₹" + String.format("%.2f", amount) + " to " + toUser.getName(), Map.of("fromUserId", fromUserId, "toUserId", toUserId, "amount", amount), repository);

            return saved;
        } finally {
            lock.unlock();
        }
    }

    public List<SuggestedSettlement> getSimplifiedDebts(long groupId) {
        return calculateSimplifiedDebts(groupId, repository);
    }

    public List<ExpenseEvent> getEventLog() {
        return new ArrayList<>(eventLog);
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

    // --- ISOLATED SIMULATION ENGINE ---
    public void simReset() {
        lock.lock();
        try {
            simRepository.clear();
            simEventLog.clear();
            simEventIdCounter.set(1);
        } finally {
            lock.unlock();
        }
    }

    public User simCreateUser(String name, String email) {
        lock.lock();
        try {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            User saved = simRepository.saveUser(user);
            logEvent(simEventLog, simEventIdCounter, ExpenseEventType.USER_CREATED, saved.getName(), "Sim User created: " + saved.getName(), Map.of("userId", saved.getId(), "name", saved.getName()), simRepository);
            return saved;
        } finally {
            lock.unlock();
        }
    }

    public Group simCreateGroup(String name, List<Long> memberIds) {
        lock.lock();
        try {
            List<User> members = memberIds.stream()
                    .map(simRepository::getUser)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            Group group = new Group();
            group.setName(name);
            group.setMembers(members);
            Group saved = simRepository.saveGroup(group);
            logEvent(simEventLog, simEventIdCounter, ExpenseEventType.GROUP_CREATED, "System", "Sim Group created: " + saved.getName(), Map.of("groupId", saved.getId(), "name", saved.getName()), simRepository);
            return saved;
        } finally {
            lock.unlock();
        }
    }

    public Expense simAddExpense(String description, double amount, Long paidByUserId, Long groupId, List<Split> splits) {
        lock.lock();
        try {
            User paidBy = simRepository.getUser(paidByUserId);
            if (paidBy == null) throw new RuntimeException("User not found: " + paidByUserId);
            Group group = simRepository.getGroup(groupId);
            if (group == null) throw new RuntimeException("Group not found: " + groupId);

            SplitType splitType = (splits == null || splits.isEmpty()) ? SplitType.EQUAL : splits.get(0).getType();
            SplitStrategy strategy = strategyFactory.getStrategy(splitType);
            List<Split> resolvedSplits = strategy.calculateSplits(amount, group, splits, simRepository);

            Expense expense = new Expense();
            expense.setDescription(description);
            expense.setAmount(amount);
            expense.setPaidBy(paidBy);
            expense.setGroupId(groupId);
            expense.setSplits(resolvedSplits);
            expense = simRepository.saveExpense(expense);

            for (Split split : resolvedSplits) {
                if (split.getUser().getId() != paidByUserId) {
                    simRepository.updateBalance(paidByUserId, split.getUser().getId(), split.getAmount());
                }
            }

            logEvent(simEventLog, simEventIdCounter, ExpenseEventType.EXPENSE_ADDED, paidBy.getName(), paidBy.getName() + " paid ₹" + String.format("%.2f", amount) + " for " + description + " (" + splitType + " split)", Map.of("expenseId", expense.getId(), "amount", amount, "splitType", splitType.name(), "description", description), simRepository);

            return expense;
        } finally {
            lock.unlock();
        }
    }

    public Settlement simSettleUp(long fromUserId, long toUserId, long groupId, double amount) {
        lock.lock();
        try {
            User fromUser = simRepository.getUser(fromUserId);
            User toUser = simRepository.getUser(toUserId);
            if (fromUser == null) throw new RuntimeException("User not found: " + fromUserId);
            if (toUser == null) throw new RuntimeException("User not found: " + toUserId);

            Settlement settlement = new Settlement();
            settlement.setFromUser(fromUser);
            settlement.setToUser(toUser);
            settlement.setAmount(amount);
            settlement.setGroupId(groupId);
            settlement.setTimestamp(LocalDateTime.now(ZONE_IST));

            Settlement saved = simRepository.saveSettlement(settlement);
            logEvent(simEventLog, simEventIdCounter, ExpenseEventType.SETTLEMENT, fromUser.getName(), fromUser.getName() + " paid ₹" + String.format("%.2f", amount) + " to " + toUser.getName(), Map.of("fromUserId", fromUserId, "toUserId", toUserId, "amount", amount), simRepository);

            return saved;
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Map<String, Double>> simGetAllBalances() {
        Map<String, Map<String, Double>> result = new HashMap<>();
        for (User user : simRepository.getAllUsers()) {
            Map<String, Double> userBalances = new HashMap<>();
            Map<String, Double> rawNets = simRepository.getNetBalance(user.getId());
            for (Map.Entry<String, Double> entry : rawNets.entrySet()) {
                User other = simRepository.getUser(Long.parseLong(entry.getKey()));
                if (other != null) {
                    userBalances.put(other.getName(), entry.getValue());
                }
            }
            result.put(user.getName(), userBalances);
        }
        return result;
    }

    public List<ExpenseEvent> simGetEvents() {
        return new ArrayList<>(simEventLog);
    }

    public List<SuggestedSettlement> simGetSimplifiedDebts(long groupId) {
        return calculateSimplifiedDebts(groupId, simRepository);
    }

    private List<SuggestedSettlement> calculateSimplifiedDebts(long groupId, SplitwiseRepository targetRepo) {
        Group group = targetRepo.getGroup(groupId);
        if (group == null) return List.of();

        List<User> members = group.getMembers();
        Map<Long, Double> netBalances = new HashMap<>();
        for (User member : members) {
            netBalances.put(member.getId(), 0.0);
        }

        Map<String, Double> allBalances = targetRepo.getBalances();
        for (Map.Entry<String, Double> entry : allBalances.entrySet()) {
            String[] parts = entry.getKey().split(":");
            long u1 = Long.parseLong(parts[0]);
            long u2 = Long.parseLong(parts[1]);
            double amt = entry.getValue();

            if (netBalances.containsKey(u1)) {
                netBalances.put(u1, netBalances.get(u1) + amt);
            }
            if (netBalances.containsKey(u2)) {
                netBalances.put(u2, netBalances.get(u2) - amt);
            }
        }

        List<Map.Entry<Long, Double>> creditors = new ArrayList<>();
        List<Map.Entry<Long, Double>> debtors = new ArrayList<>();

        for (Map.Entry<Long, Double> entry : netBalances.entrySet()) {
            double net = Math.round(entry.getValue() * 100.0) / 100.0;
            if (net > 0.01) {
                creditors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), net));
            } else if (net < -0.01) {
                debtors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), -net));
            }
        }

        creditors.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));
        debtors.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));

        List<SuggestedSettlement> suggested = new ArrayList<>();
        int i = 0, j = 0;
        while (i < debtors.size() && j < creditors.size()) {
            Map.Entry<Long, Double> debtor = debtors.get(i);
            Map.Entry<Long, Double> creditor = creditors.get(j);

            double minAmount = Math.min(debtor.getValue(), creditor.getValue());
            minAmount = Math.round(minAmount * 100.0) / 100.0;

            if (minAmount > 0) {
                User from = targetRepo.getUser(debtor.getKey());
                User to = targetRepo.getUser(creditor.getKey());
                if (from != null && to != null) {
                    suggested.add(new SuggestedSettlement(from, to, minAmount));
                }
            }

            debtor.setValue(debtor.getValue() - minAmount);
            creditor.setValue(creditor.getValue() - minAmount);

            if (debtor.getValue() <= 0.01) i++;
            if (creditor.getValue() <= 0.01) j++;
        }

        return suggested;
    }

    private void logEvent(List<ExpenseEvent> targetLog, AtomicLong counter, ExpenseEventType type, String actor, String description, Map<String, Object> data, SplitwiseRepository targetRepo) {
        Map<String, Double> balanceSnapshot = new HashMap<>();
        for (User user : targetRepo.getAllUsers()) {
            Map<String, Double> net = targetRepo.getNetBalance(user.getId());
            double totalNet = net.values().stream().mapToDouble(Double::doubleValue).sum();
            balanceSnapshot.put(user.getName(), Math.round(totalNet * 100.0) / 100.0);
        }
        ExpenseEvent event = new ExpenseEvent(counter.getAndIncrement(), type, actor, description, data, balanceSnapshot, LocalDateTime.now(ZONE_IST));
        targetLog.add(event);
    }
}
