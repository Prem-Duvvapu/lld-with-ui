package com.lld.splitwise.strategy;

import com.lld.splitwise.model.Group;
import com.lld.splitwise.model.Split;
import com.lld.splitwise.model.SplitType;
import com.lld.splitwise.model.User;
import com.lld.splitwise.repository.SplitwiseRepository;

import java.util.ArrayList;
import java.util.List;

public class EqualSplitStrategy implements SplitStrategy {
    @Override
    public List<Split> calculateSplits(double amount, Group group, List<Split> splitsInput, SplitwiseRepository repository) {
        List<User> members = group.getMembers();
        int totalMembers = members.size();
        if (totalMembers == 0) {
            throw new RuntimeException("Group has no members to split expense");
        }
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
}
