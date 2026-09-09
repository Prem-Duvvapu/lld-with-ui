package com.lld.splitwise.strategy;

import com.lld.splitwise.exception.InvalidSplitException;
import com.lld.splitwise.exception.UserNotFoundException;
import com.lld.splitwise.model.Group;
import com.lld.splitwise.model.Split;
import com.lld.splitwise.model.SplitType;
import com.lld.splitwise.model.User;
import com.lld.splitwise.repository.SplitwiseRepository;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class PercentageSplitStrategy implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository) {
        if (splitsInput == null || splitsInput.isEmpty()) {
            throw new InvalidSplitException("Percentage split requires at least one participant");
        }
        Set<Long> participantIds = new HashSet<>();
        for (Split split : splitsInput) {
            if (split == null || split.getUser() == null) {
                throw new InvalidSplitException("Every percentage split requires a user");
            }
            if (split.getType() != SplitType.PERCENTAGE) {
                throw new InvalidSplitException("Percentage split contains a non-percentage entry");
            }
            if (!participantIds.add(split.getUser().getId())) {
                throw new InvalidSplitException("A user can appear only once in a split definition");
            }
            if (!Double.isFinite(split.getPercentage()) || split.getPercentage() < 0) {
                throw new InvalidSplitException("Percentages must be finite and non-negative");
            }
        }
        double totalPercentage = splitsInput.stream().mapToDouble(Split::getPercentage).sum();
        if (Math.abs(totalPercentage - 100.0) > 0.01) {
            throw new InvalidSplitException("Percentages must sum to 100, got: " + totalPercentage);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splitsInput) {
            double splitAmount = Math.round((amount * s.getPercentage() / 100.0) * 100.0) / 100.0;
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new UserNotFoundException(s.getUser().getId());
            if (group.getMembers().stream().noneMatch(member -> member.getId() == user.getId())) {
                throw new InvalidSplitException("User " + user.getId() + " is not a member of group " + group.getId());
            }
            Split split = new Split(splitId++, user, splitAmount, s.getPercentage(), SplitType.PERCENTAGE);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }
}
