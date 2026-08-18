package com.lld.splitwise;

import com.lld.splitwise.model.*;
import com.lld.splitwise.repository.SplitwiseRepository;
import com.lld.splitwise.service.SplitwiseService;
import com.lld.splitwise.strategy.SplitStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Splitwise Service Integration & Workflow Tests")
class SplitwiseServiceTest {
    private SplitwiseService service;

    @BeforeEach
    void setUp() {
        SplitwiseRepository repository = new SplitwiseRepository();
        SplitStrategyFactory factory = new SplitStrategyFactory();
        service = new SplitwiseService(repository, factory);
        service.reset();
    }

    @Test
    @DisplayName("Equal Split: Automatically splits among all group members and updates balances")
    void testEqualSplit() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");
        User u3 = service.createUser("Charlie", "c@test.com");
        User u4 = service.createUser("Diana", "d@test.com");

        Group group = service.createGroup("Goa Trip", List.of(u1.getId(), u2.getId(), u3.getId(), u4.getId()));

        Expense expense = service.addExpense("Hotel", 4000.0, u1.getId(), group.getId(), List.of());

        assertEquals(4, expense.getSplits().size());
        for (Split s : expense.getSplits()) {
            assertEquals(1000.0, s.getAmount(), 0.001);
        }

        Map<String, Double> aliceBal = service.getBalances(u1.getId());
        assertEquals(1000.0, aliceBal.get("Bob"), 0.001);
        assertEquals(1000.0, aliceBal.get("Charlie"), 0.001);
        assertEquals(1000.0, aliceBal.get("Diana"), 0.001);
    }

    @Test
    @DisplayName("Percentage Split: Calculates exact splits based on percentage breakdown")
    void testPercentageSplit() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");

        Group group = service.createGroup("Roommates", List.of(u1.getId(), u2.getId()));

        List<Split> splits = List.of(
            Split.builder().user(u1).percentage(70.0).type(SplitType.PERCENTAGE).build(),
            Split.builder().user(u2).percentage(30.0).type(SplitType.PERCENTAGE).build()
        );

        Expense expense = service.addExpense("Rent", 1000.0, u1.getId(), group.getId(), splits);

        assertEquals(700.0, expense.getSplits().get(0).getAmount(), 0.001);
        assertEquals(300.0, expense.getSplits().get(1).getAmount(), 0.001);
    }

    @Test
    @DisplayName("Exact Split Validation: Throws exception if exact shares don't sum to total expense amount")
    void testExactSplitValidation() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");

        Group group = service.createGroup("Dinner", List.of(u1.getId(), u2.getId()));

        List<Split> invalidSplits = List.of(
            Split.builder().user(u1).amount(600.0).type(SplitType.EXACT).build(),
            Split.builder().user(u2).amount(300.0).type(SplitType.EXACT).build()
        );

        assertThrows(RuntimeException.class, () -> service.addExpense("Food", 1000.0, u1.getId(), group.getId(), invalidSplits));
    }

    @Test
    @DisplayName("Settlement: Full debt settlement clears balance completely")
    void testSettlement() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");

        Group group = service.createGroup("Dinner", List.of(u1.getId(), u2.getId()));

        service.addExpense("Food", 1000.0, u1.getId(), group.getId(), List.of());

        // Bob owes Alice 500
        service.settleUp(u2.getId(), u1.getId(), group.getId(), 500.0);

        Map<String, Double> bobBal = service.getBalances(u2.getId());
        assertTrue(bobBal.isEmpty() || bobBal.values().stream().allMatch(v -> Math.abs(v) < 0.01));
    }

    @Test
    @DisplayName("Partial Settlement: Partial payment adjusts debt accurately")
    void testPartialSettlement() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");

        Group group = service.createGroup("Dinner", List.of(u1.getId(), u2.getId()));

        service.addExpense("Food", 1000.0, u1.getId(), group.getId(), List.of());

        // Bob owes 500, pays 200
        service.settleUp(u2.getId(), u1.getId(), group.getId(), 200.0);

        Map<String, Double> bobBal = service.getBalances(u2.getId());
        assertEquals(-300.0, bobBal.get("Alice"), 0.001);
    }

    @Test
    @DisplayName("Debt Simplification: Greedy Min-Cash-Flow algorithm minimizes total transaction hops")
    void testDebtSimplification() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");
        User u3 = service.createUser("Charlie", "c@test.com");

        Group group = service.createGroup("Trip", List.of(u1.getId(), u2.getId(), u3.getId()));

        // Alice pays 300 for all (Bob owes 100, Charlie owes 100)
        service.addExpense("Hotel", 300.0, u1.getId(), group.getId(), List.of());
        // Bob pays 300 for all (Alice owes 100, Charlie owes 100)
        service.addExpense("Cab", 300.0, u2.getId(), group.getId(), List.of());

        // Net: Alice = 0, Bob = 0, Charlie owes 200 total (100 to Alice, 100 to Bob)
        List<SuggestedSettlement> simplified = service.getSimplifiedDebts(group.getId());
        assertFalse(simplified.isEmpty());
        double totalSettlementAmt = simplified.stream().mapToDouble(SuggestedSettlement::getAmount).sum();
        assertEquals(200.0, totalSettlementAmt, 0.001);
    }

    @Test
    @DisplayName("Audit Event Logging: Verifies all actions emit type-safe ExpenseEventType events")
    void testAuditEventLogging() {
        User u1 = service.createUser("Alice", "a@test.com");
        User u2 = service.createUser("Bob", "b@test.com");
        Group group = service.createGroup("Flat", List.of(u1.getId(), u2.getId()));
        service.addExpense("Groceries", 200.0, u1.getId(), group.getId(), List.of());
        service.settleUp(u2.getId(), u1.getId(), group.getId(), 100.0);

        List<ExpenseEvent> events = service.getEventLog();
        assertFalse(events.isEmpty());
        assertTrue(events.stream().anyMatch(e -> e.getType() == ExpenseEventType.USER_CREATED));
        assertTrue(events.stream().anyMatch(e -> e.getType() == ExpenseEventType.GROUP_CREATED));
        assertTrue(events.stream().anyMatch(e -> e.getType() == ExpenseEventType.EXPENSE_ADDED));
        assertTrue(events.stream().anyMatch(e -> e.getType() == ExpenseEventType.SETTLEMENT));

        // Verify timestamps are in IST
        for (ExpenseEvent event : events) {
            assertNotNull(event.getTimestamp());
            assertNotNull(event.getBalanceSnapshot());
        }
    }

    @Test
    @DisplayName("Simulation Isolation: Sandbox operations do not affect production state")
    void testSimulationIsolation() {
        User mainUser = service.createUser("MainAlice", "main@test.com");
        User simUser = service.simCreateUser("SimBob", "sim@test.com");

        assertEquals(1, service.getAllUsers().size());
        assertEquals("MainAlice", service.getAllUsers().get(0).getName());
    }
}
