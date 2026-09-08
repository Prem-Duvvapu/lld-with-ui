package com.lld.blackjack.repository;

import com.lld.blackjack.exception.TableNotFoundException;
import com.lld.blackjack.model.DealerStrategyType;
import com.lld.blackjack.model.Table;
import com.lld.blackjack.shoe.Deck;
import com.lld.blackjack.shoe.Shoe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class BlackjackRepositoryTest {

    private BlackjackRepository repository;

    @BeforeEach
    void setUp() {
        repository = new BlackjackRepository();
    }

    @Test
    void unknownTableIdThrowsTableNotFoundException() {
        assertThrows(TableNotFoundException.class, () -> repository.getTable("nope"));
    }

    @Test
    void addAndGetTableRoundTrips() {
        Table table = new Table("T1", DealerStrategyType.HIT_ON_SOFT_17);
        repository.addTable(table);
        assertSame(table, repository.getTable("T1"));
    }

    @Test
    void getAllTablesReturnsEverySavedTable() {
        repository.addTable(new Table("T1", DealerStrategyType.HIT_ON_SOFT_17));
        repository.addTable(new Table("T2", DealerStrategyType.STAND_ON_SOFT_17));
        assertEquals(2, repository.getAllTables().size());
    }

    @Test
    void shoeIsHeldAndReturnedAsSet() {
        Shoe shoe = Deck.of(1);
        repository.setShoe(shoe);
        assertSame(shoe, repository.getShoe());
    }

    @Test
    void resetWipesTablesAndShoe() {
        repository.addTable(new Table("T1", DealerStrategyType.HIT_ON_SOFT_17));
        repository.setShoe(Deck.of(1));

        repository.reset();

        assertTrue(repository.getAllTables().isEmpty());
        assertNull(repository.getShoe());
    }
}
