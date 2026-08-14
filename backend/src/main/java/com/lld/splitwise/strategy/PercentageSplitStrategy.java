package com.lld.splitwise.strategy;

import com.lld.splitwise.model.Group;
import com.lld.splitwise.model.Split;
import com.lld.splitwise.model.SplitType;
import com.lld.splitwise.model.User;
import com.lld.splitwise.repository.SplitwiseRepository;

import java.util.ArrayList;
import java.util.List;

public class PercentageSplitStrategy implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository) {
        double totalPercentage = splitsInput.stream().mapToDouble(Split::getPercentage).sum();
        if (Math.abs(totalPercentage - 100.0) > 0.01) {
            throw new RuntimeException("Percentages must sum to 100, got: " + totalPercentage);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splitsInput) {
            double splitAmount = Math.round((amount * s.getPercentage() / 100.0) * 100.0) / 100.0;
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new RuntimeException("User not found: " + s.getUser().getId());
            Split split = new Split(splitId++, user, splitAmount, s.getPercentage(), SplitType.PERCENTAGE);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }
}
