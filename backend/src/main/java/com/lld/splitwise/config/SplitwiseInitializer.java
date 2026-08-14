package com.lld.splitwise.config;

import com.lld.splitwise.model.*;
import com.lld.splitwise.service.SplitwiseService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SplitwiseInitializer {
    private final SplitwiseService splitwiseService;

    public SplitwiseInitializer(SplitwiseService splitwiseService) {
        this.splitwiseService = splitwiseService;
    }

    @PostConstruct
    public void init() {
        splitwiseService.reset();

        User alice = splitwiseService.createUser("Alice", "alice@email.com");
        User bob = splitwiseService.createUser("Bob", "bob@email.com");
        User charlie = splitwiseService.createUser("Charlie", "charlie@email.com");
        User diana = splitwiseService.createUser("Diana", "diana@email.com");

        List<Long> goaTripMembers = List.of(alice.getId(), bob.getId(), charlie.getId(), diana.getId());
        Group goaTrip = splitwiseService.createGroup("Trip to Goa", goaTripMembers);

        List<Long> flatmatesMembers = List.of(alice.getId(), bob.getId());
        Group flatmates = splitwiseService.createGroup("Flatmates", flatmatesMembers);

        // Expense 1: Hotel Booking ₹4000 by Alice (EQUAL)
        splitwiseService.addExpense("Hotel Booking", 4000.0, alice.getId(), goaTrip.getId(), List.of());

        // Expense 2: Dinner ₹1200 by Bob (PERCENTAGE)
        List<Split> percentageSplits = List.of(
            new Split(1, alice, 0, 20.0, SplitType.PERCENTAGE),
            new Split(2, bob, 0, 40.0, SplitType.PERCENTAGE),
            new Split(3, charlie, 0, 20.0, SplitType.PERCENTAGE),
            new Split(4, diana, 0, 20.0, SplitType.PERCENTAGE)
        );
        splitwiseService.addExpense("Dinner", 1200.0, bob.getId(), goaTrip.getId(), percentageSplits);

        // Expense 3: Electricity Bill ₹600 by Alice (EQUAL)
        splitwiseService.addExpense("Electricity Bill", 600.0, alice.getId(), flatmates.getId(), List.of());
    }
}
