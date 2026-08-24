package com.lld.inventory;

import com.lld.inventory.model.Category;
import com.lld.inventory.model.InventoryEvent;
import com.lld.inventory.model.Product;
import com.lld.inventory.model.StockMovement;
import com.lld.inventory.repository.InventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InventoryRepositoryTest {

    private InventoryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InventoryRepository();
    }

    @Test
    @DisplayName("Seeds 8 products and 3 suppliers on construction")
    void seedsDemoData() {
        assertEquals(8, repository.findAllProducts().size());
        assertEquals(3, repository.findAllSuppliers().size());
    }

    @Test
    @DisplayName("Product, movement and event ids are generated atomically and never repeat")
    void idsAreAtomicAndUnique() {
        long p1 = repository.nextProductId();
        long p2 = repository.nextProductId();
        assertNotEquals(p1, p2);

        long m1 = repository.nextMovementId();
        long m2 = repository.nextMovementId();
        assertNotEquals(m1, m2);

        long e1 = repository.nextEventId();
        long e2 = repository.nextEventId();
        assertNotEquals(e1, e2);
    }

    @Test
    @DisplayName("saveProduct overwrites the stored product for that id")
    void saveProductOverwrites() {
        Product original = repository.findProductById(1);
        assertNotNull(original);
        original.setCurrentStock(999);
        repository.saveProduct(original);

        assertEquals(999, repository.findProductById(1).getCurrentStock());
    }

    @Test
    @DisplayName("findProductsByCategory returns only that category, sorted by id")
    void findByCategoryFilters() {
        List<Product> electronics = repository.findProductsByCategory(Category.ELECTRONICS);
        assertFalse(electronics.isEmpty());
        assertTrue(electronics.stream().allMatch(p -> p.getCategory() == Category.ELECTRONICS));
        for (int i = 1; i < electronics.size(); i++) {
            assertTrue(electronics.get(i - 1).getId() < electronics.get(i).getId());
        }
    }

    @Test
    @DisplayName("Movements are tracked per product and returned in insertion order")
    void movementsTrackedPerProduct() {
        long productId = 1;
        StockMovement m1 = StockMovement.builder().id(repository.nextMovementId()).productId(productId)
                .type(StockMovement.StockMovementType.INBOUND).quantity(10).timestamp(LocalDateTime.now())
                .reason("test").referenceId("R1").build();
        StockMovement m2 = StockMovement.builder().id(repository.nextMovementId()).productId(productId)
                .type(StockMovement.StockMovementType.OUTBOUND).quantity(3).timestamp(LocalDateTime.now())
                .reason("test").referenceId("R2").build();
        repository.addMovement(m1);
        repository.addMovement(m2);

        List<StockMovement> movements = repository.findMovementsByProductId(productId);
        assertEquals(2, movements.size());
        assertEquals(m1.getId(), movements.get(0).getId());
        assertEquals(m2.getId(), movements.get(1).getId());
        assertEquals(2, repository.countMovements());
    }

    @Test
    @DisplayName("findMovementsByProductId returns empty, not null, for an untouched product")
    void movementsForUntouchedProductIsEmpty() {
        assertTrue(repository.findMovementsByProductId(999).isEmpty());
    }

    @Test
    @DisplayName("Event log is capped at 200 entries, dropping the oldest first")
    void eventLogCapsAt200() {
        for (int i = 0; i < 210; i++) {
            repository.addEvent(InventoryEvent.builder().id(repository.nextEventId())
                    .type(InventoryEvent.EventType.STOCK_MOVED)
                    .message("event " + i).timestamp(LocalDateTime.now()).build());
        }
        List<InventoryEvent> events = repository.findAllEvents();
        assertEquals(200, events.size());
        // the oldest 10 (event 0..9) must have been evicted; the log must end with the newest
        assertEquals("event 209", events.get(events.size() - 1).getMessage());
        assertEquals("event 10", events.get(0).getMessage());
    }
}
