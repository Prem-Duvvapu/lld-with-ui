package com.lld.splitwise.strategy;

import com.lld.splitwise.model.Group;
import com.lld.splitwise.model.Split;
import com.lld.splitwise.model.SplitType;
import com.lld.splitwise.model.User;
import com.lld.splitwise.repository.SplitwiseRepository;

import java.util.ArrayList;
import java.util.List;

public class ExactSplitStrategy implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository) {
        double totalAmount = splitsInput.stream().mapToDouble(Split::getAmount).sum();
        if (Math.abs(totalAmount - amount) > 0.01) {
            throw new RuntimeException("Exact amounts must sum to total amount, got: " + totalAmount + " expected: " + amount);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splitsInput) {
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new RuntimeException("User not found: " + s.getUser().getId());
            Split split = new Split(splitId++, user, s.getAmount(), 0, SplitType.EXACT);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }
}
