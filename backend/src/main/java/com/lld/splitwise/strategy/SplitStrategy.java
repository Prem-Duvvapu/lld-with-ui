package com.lld.splitwise.strategy;

import com.lld.splitwise.model.Group;
import com.lld.splitwise.model.Split;
import com.lld.splitwise.repository.SplitwiseRepository;

import java.util.List;

public interface SplitStrategy {
    List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository);
}
