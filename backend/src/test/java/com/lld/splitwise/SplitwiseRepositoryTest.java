package com.lld.splitwise;

import com.lld.splitwise.model.*;
import com.lld.splitwise.repository.SplitwiseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Splitwise Repository Ledger & State Unit Tests")
public class SplitwiseRepositoryTest {

    private SplitwiseRepository repository;
    private User u1;
    private User u2;
    private User u3;

    @BeforeEach
    void setUp() {
        repository = new SplitwiseRepository();
        repository.clear();

        u1 = repository.saveUser(User.builder().name("Alice").email("alice@test.com").build());
        u2 = repository.saveUser(User.builder().name("Bob").email("bob@test.com").build());
        u3 = repository.saveUser(User.builder().name("Charlie").email("charlie@test.com").build());
    }

    @Test
    @DisplayName("User CRUD: Auto-increment ID and email lookup")
    void testUserCrud() {
        assertEquals(1L, u1.getId());
        assertEquals(2L, u2.getId());
        assertEquals(3L, u3.getId());

        assertEquals(3, repository.getAllUsers().size());
        assertEquals(u1, repository.getUser(1L));
        assertEquals(u1, repository.getUserByEmail("alice@test.com"));
        assertNull(repository.getUserByEmail("nonexistent@test.com"));
    }

    @Test
    @DisplayName("Group CRUD: Member addition and group storage")
    void testGroupCrud() {
        Group group = repository.saveGroup(Group.builder().name("Flatmates").members(List.of(u1, u2)).build());
        assertEquals(1L, group.getId());
        assertEquals(2, group.getMembers().size());

        repository.addMemberToGroup(group.getId(), u3);
        Group updatedGroup = repository.getGroup(group.getId());
        assertEquals(3, updatedGroup.getMembers().size());
    }

    @Test
    @DisplayName("Ledger Balance: Basic pairwise balance update and net balance calculation")
    void testBasicBalanceUpdate() {
        // Alice pays ₹500 for Bob (Bob owes Alice ₹500)
        repository.updateBalance(u1.getId(), u2.getId(), 500.0);

        Map<String, Double> aliceNet = repository.getNetBalance(u1.getId());
        assertEquals(500.0, aliceNet.get(String.valueOf(u2.getId())));

        Map<String, Double> bobNet = repository.getNetBalance(u2.getId());
        assertEquals(-500.0, bobNet.get(String.valueOf(u1.getId())));
    }

    @Test
    @DisplayName("Ledger Balance: Bidirectional balance normalization reduces debt")
    void testBidirectionalNormalization() {
        // Alice pays ₹500 for Bob (Bob owes Alice ₹500)
        repository.updateBalance(u1.getId(), u2.getId(), 500.0);

        // Later, Bob pays ₹200 for Alice (Alice owes Bob ₹200 -> reduces Bob's debt to ₹300)
        repository.updateBalance(u2.getId(), u1.getId(), 200.0);

        Map<String, Double> aliceNet = repository.getNetBalance(u1.getId());
        assertEquals(300.0, aliceNet.get(String.valueOf(u2.getId())));

        Map<String, Double> bobNet = repository.getNetBalance(u2.getId());
        assertEquals(-300.0, bobNet.get(String.valueOf(u1.getId())));
    }

    @Test
    @DisplayName("Ledger Balance: Balance sign flip when reverse payment exceeds debt")
    void testBalanceSignFlip() {
        // Alice pays ₹100 for Bob (Bob owes Alice ₹100)
        repository.updateBalance(u1.getId(), u2.getId(), 100.0);

        // Bob pays ₹250 for Alice (Bob paid more -> Alice now owes Bob ₹150)
        repository.updateBalance(u2.getId(), u1.getId(), 250.0);

        Map<String, Double> aliceNet = repository.getNetBalance(u1.getId());
        assertEquals(-150.0, aliceNet.get(String.valueOf(u2.getId())));

        Map<String, Double> bobNet = repository.getNetBalance(u2.getId());
        assertEquals(150.0, bobNet.get(String.valueOf(u1.getId())));
    }

    @Test
    @DisplayName("Ledger Balance: Zero balance is pruned from ledger map")
    void testZeroBalancePruning() {
        // Alice pays ₹300 for Bob
        repository.updateBalance(u1.getId(), u2.getId(), 300.0);
        // Bob pays ₹300 for Alice (debt completely settled)
        repository.updateBalance(u2.getId(), u1.getId(), 300.0);

        Map<String, Double> aliceNet = repository.getNetBalance(u1.getId());
        assertFalse(aliceNet.containsKey(String.valueOf(u2.getId())));
        assertTrue(aliceNet.isEmpty());
    }

    @Test
    @DisplayName("Settlement: Records settlement and updates ledger balances")
    void testSaveSettlement() {
        Group group = repository.saveGroup(Group.builder().name("Trip").members(List.of(u1, u2)).build());

        // Bob owes Alice ₹400
        repository.updateBalance(u1.getId(), u2.getId(), 400.0);

        // Bob settles ₹400 with Alice
        Settlement settlement = Settlement.builder()
                .fromUser(u2)
                .toUser(u1)
                .amount(400.0)
                .groupId(group.getId())
                .build();

        Settlement saved = repository.saveSettlement(settlement);
        assertNotNull(saved.getId());
        assertNotNull(saved.getTimestamp());

        // Balance should be zeroed out
        Map<String, Double> bobNet = repository.getNetBalance(u2.getId());
        assertTrue(bobNet.isEmpty());

        List<Settlement> groupSettlements = repository.getSettlements(group.getId());
        assertEquals(1, groupSettlements.size());
        assertEquals(400.0, groupSettlements.get(0).getAmount());
    }

    @Test
    @DisplayName("Repository Clear: Clears all maps and resets auto-increment sequences")
    void testRepositoryClear() {
        repository.clear();
        assertEquals(0, repository.getAllUsers().size());
        assertEquals(0, repository.getAllGroups().size());
        assertTrue(repository.getBalances().isEmpty());

        User freshUser = repository.saveUser(User.builder().name("First").email("first@test.com").build());
        assertEquals(1L, freshUser.getId(), "ID counter should reset to 1 after clear()");
    }
}
