package com.lld.vendingmachine;

import com.lld.vendingmachine.model.Product;
import com.lld.vendingmachine.model.Slot;
import com.lld.vendingmachine.repository.VendingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Vending Machine Repository Storage & Lookup")
class VendingRepositoryTest {

    private VendingRepository repository;

    @BeforeEach
    void setUp() {
        repository = new VendingRepository();
    }

    private Product product(String code) {
        return Product.builder().id(1L).code(code).name("Test Product " + code)
                .price(25.0).category("Snack").emoji("🍫").build();
    }

    private Slot slot(String code) {
        return Slot.builder().id(1L).code(code).row(0).col(0)
                .product(product(code)).capacity(10).currentStock(5).build();
    }

    @Test
    @DisplayName("Absent lookups return null rather than throwing")
    void absentLookupsReturnNull() {
        assertNull(repository.findProductByCode("NO-SUCH-PRODUCT"));
        assertNull(repository.findSlotByCode("NO-SUCH-SLOT"));
    }

    @Test
    @DisplayName("Empty collections are returned as empty lists, never null")
    void emptyCollectionsAreEmptyNotNull() {
        assertNotNull(repository.findAllProducts());
        assertTrue(repository.findAllProducts().isEmpty());
        assertNotNull(repository.findAllSlots());
        assertTrue(repository.findAllSlots().isEmpty());
    }

    @Test
    @DisplayName("Products round-trip through the store, keyed by code")
    void productsRoundTrip() {
        Product p = product("A1");
        repository.saveProduct(p);
        assertSame(p, repository.findProductByCode("A1"));
        assertEquals(1, repository.findAllProducts().size());
    }

    @Test
    @DisplayName("Saving a product with the same code overwrites the previous entry")
    void savingSameCodeOverwrites() {
        repository.saveProduct(product("A1"));
        Product replacement = product("A1");
        replacement.setName("Replacement Product");
        repository.saveProduct(replacement);

        assertEquals(1, repository.findAllProducts().size(), "the code is the key — no duplicate entries");
        assertEquals("Replacement Product", repository.findProductByCode("A1").getName());
    }

    @Test
    @DisplayName("Slots round-trip through the store, keyed by code")
    void slotsRoundTrip() {
        Slot s = slot("B2");
        repository.saveSlot(s);
        assertSame(s, repository.findSlotByCode("B2"));
        assertEquals(1, repository.findAllSlots().size());
    }

    @Test
    @DisplayName("Concurrent writes across many distinct slot codes are all visible — the store is genuinely concurrent")
    void concurrentSlotWritesAllLand() throws InterruptedException {
        int count = 300;
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(count);
        Set<String> observedCodes = ConcurrentHashMap.newKeySet();

        IntStream.range(0, count).forEach(i -> pool.submit(() -> {
            try {
                startLatch.await();
                String code = "S" + i;
                repository.saveSlot(slot(code));
                observedCodes.add(code);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        }));

        startLatch.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "writes did not finish");
        pool.shutdown();

        assertEquals(count, observedCodes.size());
        assertEquals(count, repository.findAllSlots().size(),
                "a non-concurrent map would have lost writes here");
    }
}
