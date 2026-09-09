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

public class ExactSplitStrategy implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository) {
        if (splitsInput == null || splitsInput.isEmpty()) {
            throw new InvalidSplitException("Exact split requires at least one participant");
        }
        Set<Long> participantIds = new HashSet<>();
        for (Split split : splitsInput) {
            if (split == null || split.getUser() == null) {
                throw new InvalidSplitException("Every exact split requires a user");
            }
            if (split.getType() != SplitType.EXACT) {
                throw new InvalidSplitException("Exact split contains a non-exact entry");
            }
            if (!participantIds.add(split.getUser().getId())) {
                throw new InvalidSplitException("A user can appear only once in a split definition");
            }
            if (!Double.isFinite(split.getAmount()) || split.getAmount() < 0) {
                throw new InvalidSplitException("Exact split amounts must be finite and non-negative");
            }
        }
        double totalAmount = splitsInput.stream().mapToDouble(Split::getAmount).sum();
        if (Math.abs(totalAmount - amount) > 0.01) {
            throw new InvalidSplitException("Exact amounts must sum to total amount, got: " + totalAmount + " expected: " + amount);
        }
        List<Split> resolvedSplits = new ArrayList<>();
        long splitId = 1;
        for (Split s : splitsInput) {
            User user = repository.getUser(s.getUser().getId());
            if (user == null) throw new UserNotFoundException(s.getUser().getId());
            if (group.getMembers().stream().noneMatch(member -> member.getId() == user.getId())) {
                throw new InvalidSplitException("User " + user.getId() + " is not a member of group " + group.getId());
            }
            Split split = new Split(splitId++, user, s.getAmount(), 0, SplitType.EXACT);
            resolvedSplits.add(split);
        }
        return resolvedSplits;
    }
}
