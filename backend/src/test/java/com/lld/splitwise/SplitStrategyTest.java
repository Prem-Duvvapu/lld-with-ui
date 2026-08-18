package com.lld.splitwise;

import com.lld.splitwise.model.*;
import com.lld.splitwise.repository.SplitwiseRepository;
import com.lld.splitwise.strategy.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Splitwise Split Strategy Unit Tests")
public class SplitStrategyTest {

    private SplitwiseRepository repository;
    private SplitStrategyFactory factory;
    private User u1;
    private User u2;
    private User u3;
    private Group group;

    @BeforeEach
    void setUp() {
        repository = new SplitwiseRepository();
        factory = new SplitStrategyFactory();

        u1 = repository.saveUser(User.builder().name("Alice").email("alice@test.com").build());
        u2 = repository.saveUser(User.builder().name("Bob").email("bob@test.com").build());
        u3 = repository.saveUser(User.builder().name("Charlie").email("charlie@test.com").build());

        group = repository.saveGroup(Group.builder().name("Goa Trip").members(List.of(u1, u2, u3)).build());
    }

    @Test
    @DisplayName("Factory should return corresponding strategy for each SplitType")
    void testStrategyFactoryResolution() {
        assertInstanceOf(EqualSplitStrategy.class, factory.getStrategy(SplitType.EQUAL));
        assertInstanceOf(PercentageSplitStrategy.class, factory.getStrategy(SplitType.PERCENTAGE));
        assertInstanceOf(ExactSplitStrategy.class, factory.getStrategy(SplitType.EXACT));
    }

    @Test
    @DisplayName("EqualSplitStrategy: Evenly divisible amount distributes equally")
    void testEqualSplitEvenly() {
        EqualSplitStrategy strategy = new EqualSplitStrategy();
        List<Split> splits = strategy.calculateSplits(300.0, group, List.of(), repository);

        assertEquals(3, splits.size());
        for (Split s : splits) {
            assertEquals(100.0, s.getAmount(), 0.001);
            assertEquals(SplitType.EQUAL, s.getType());
        }
    }

    @Test
    @DisplayName("EqualSplitStrategy: Uneven amount handles remainder precision so sum equals total exactly")
    void testEqualSplitUnevenPrecision() {
        EqualSplitStrategy strategy = new EqualSplitStrategy();
        // ₹100 split 3 ways -> 33.34 (1st user) + 33.33 + 33.33 = 100.00
        List<Split> splits = strategy.calculateSplits(100.0, group, List.of(), repository);

        assertEquals(3, splits.size());
        assertEquals(33.34, splits.get(0).getAmount(), 0.001);
        assertEquals(33.33, splits.get(1).getAmount(), 0.001);
        assertEquals(33.33, splits.get(2).getAmount(), 0.001);

        double totalCalculated = splits.stream().mapToDouble(Split::getAmount).sum();
        assertEquals(100.0, totalCalculated, 0.001, "Sum of splits must equal original total amount!");
    }

    @Test
    @DisplayName("EqualSplitStrategy: Empty group throws RuntimeException")
    void testEqualSplitEmptyGroup() {
        EqualSplitStrategy strategy = new EqualSplitStrategy();
        Group emptyGroup = Group.builder().name("Empty").members(List.of()).build();

        assertThrows(RuntimeException.class, () -> strategy.calculateSplits(100.0, emptyGroup, List.of(), repository));
    }

    @Test
    @DisplayName("PercentageSplitStrategy: Valid 100% percentages calculate correct shares")
    void testPercentageSplitValid() {
        PercentageSplitStrategy strategy = new PercentageSplitStrategy();
        List<Split> input = List.of(
            Split.builder().user(u1).percentage(50.0).type(SplitType.PERCENTAGE).build(),
            Split.builder().user(u2).percentage(30.0).type(SplitType.PERCENTAGE).build(),
            Split.builder().user(u3).percentage(20.0).type(SplitType.PERCENTAGE).build()
        );

        List<Split> splits = strategy.calculateSplits(1000.0, group, input, repository);

        assertEquals(3, splits.size());
        assertEquals(500.0, splits.get(0).getAmount(), 0.001);
        assertEquals(300.0, splits.get(1).getAmount(), 0.001);
        assertEquals(200.0, splits.get(2).getAmount(), 0.001);
    }

    @Test
    @DisplayName("PercentageSplitStrategy: Percentages not summing to 100% throws RuntimeException")
    void testPercentageSplitInvalidSum() {
        PercentageSplitStrategy strategy = new PercentageSplitStrategy();
        List<Split> input = List.of(
            Split.builder().user(u1).percentage(40.0).type(SplitType.PERCENTAGE).build(),
            Split.builder().user(u2).percentage(40.0).type(SplitType.PERCENTAGE).build()
            // sum is 80%, not 100%
        );

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
            strategy.calculateSplits(1000.0, group, input, repository)
        );
        assertTrue(ex.getMessage().contains("Percentages must sum to 100"));
    }

    @Test
    @DisplayName("ExactSplitStrategy: Valid exact amounts matching total")
    void testExactSplitValid() {
        ExactSplitStrategy strategy = new ExactSplitStrategy();
        List<Split> input = List.of(
            Split.builder().user(u1).amount(450.0).type(SplitType.EXACT).build(),
            Split.builder().user(u2).amount(350.0).type(SplitType.EXACT).build(),
            Split.builder().user(u3).amount(200.0).type(SplitType.EXACT).build()
        );

        List<Split> splits = strategy.calculateSplits(1000.0, group, input, repository);

        assertEquals(3, splits.size());
        assertEquals(450.0, splits.get(0).getAmount(), 0.001);
        assertEquals(350.0, splits.get(1).getAmount(), 0.001);
        assertEquals(200.0, splits.get(2).getAmount(), 0.001);
    }

    @Test
    @DisplayName("ExactSplitStrategy: Exact amounts mismatching total throws RuntimeException")
    void testExactSplitMismatchSum() {
        ExactSplitStrategy strategy = new ExactSplitStrategy();
        List<Split> input = List.of(
            Split.builder().user(u1).amount(400.0).type(SplitType.EXACT).build(),
            Split.builder().user(u2).amount(300.0).type(SplitType.EXACT).build()
            // sum is 700, but amount is 1000
        );

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
            strategy.calculateSplits(1000.0, group, input, repository)
        );
        assertTrue(ex.getMessage().contains("Exact amounts must sum to total amount"));
    }
}
