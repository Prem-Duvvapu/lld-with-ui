package com.lld.coffeemachine;

import com.lld.coffeemachine.exception.InsufficientIngredientException;
import com.lld.coffeemachine.model.IngredientType;
import com.lld.coffeemachine.store.IngredientStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit + repository-flavour tests for the ingredient hopper store: the shared mutable state
 * every concurrent brew reads and writes.
 */
@DisplayName("Coffee Machine Ingredient Store")
class IngredientStoreTest {

    private IngredientStore store;

    @BeforeEach
    void setUp() {
        store = new IngredientStore();
        store.initIngredient(IngredientType.WATER, 1000, 3000, 200);
        store.initIngredient(IngredientType.COFFEE_BEANS, 500, 1000, 100);
    }

    @Test
    @DisplayName("Freshly constructed store starts every ingredient at zero")
    void freshStoreStartsAtZero() {
        IngredientStore fresh = new IngredientStore();
        for (IngredientType type : IngredientType.values()) {
            assertEquals(0, fresh.getStock(type));
        }
    }

    @Test
    @DisplayName("initIngredient sets stock, capacity and threshold")
    void initIngredientSetsAllThree() {
        assertEquals(1000, store.getStock(IngredientType.WATER));
        assertEquals(3000, store.getCapacities().get(IngredientType.WATER));
        assertEquals(200, store.getLowStockThresholds().get(IngredientType.WATER));
    }

    @Test
    @DisplayName("refill adds stock but never exceeds capacity")
    void refillCapsAtCapacity() {
        store.refill(IngredientType.WATER, 500);
        assertEquals(1500, store.getStock(IngredientType.WATER));

        store.refill(IngredientType.WATER, 5000);
        assertEquals(3000, store.getStock(IngredientType.WATER), "must cap at capacity, never overflow");
    }

    @Test
    @DisplayName("getLowStockAlerts flags ingredients below their threshold")
    void lowStockAlertsFlagBelowThreshold() {
        store.initIngredient(IngredientType.MILK, 50, 2000, 100);
        assertTrue(store.getLowStockAlerts().contains(IngredientType.MILK));
        assertFalse(store.getLowStockAlerts().contains(IngredientType.WATER));
    }

    @Test
    @DisplayName("checkAvailability is read-only and never mutates stock")
    void checkAvailabilityDoesNotMutate() {
        Map<IngredientType, Integer> req = new EnumMap<>(IngredientType.class);
        req.put(IngredientType.WATER, 100);

        assertTrue(store.checkAvailability(req));
        assertEquals(1000, store.getStock(IngredientType.WATER), "check must not deduct");

        req.put(IngredientType.WATER, 5000);
        assertFalse(store.checkAvailability(req));
    }

    @Test
    @DisplayName("checkAndDeductIngredients atomically deducts every ingredient on success")
    void checkAndDeductSucceedsAtomically() {
        Map<IngredientType, Integer> req = new EnumMap<>(IngredientType.class);
        req.put(IngredientType.WATER, 100);
        req.put(IngredientType.COFFEE_BEANS, 50);

        assertTrue(store.checkAndDeductIngredients(req));
        assertEquals(900, store.getStock(IngredientType.WATER));
        assertEquals(450, store.getStock(IngredientType.COFFEE_BEANS));
    }

    @Test
    @DisplayName("checkAndDeductIngredients throws and deducts nothing when any single ingredient is short")
    void checkAndDeductFailsAtomically_noPartialDeduction() {
        Map<IngredientType, Integer> req = new EnumMap<>(IngredientType.class);
        req.put(IngredientType.WATER, 100); // plenty
        req.put(IngredientType.COFFEE_BEANS, 5000); // far more than available

        assertThrows(InsufficientIngredientException.class, () -> store.checkAndDeductIngredients(req));

        // Neither ingredient should have been touched — the water leg must not have landed
        // while the beans leg failed.
        assertEquals(1000, store.getStock(IngredientType.WATER), "no partial deduction on failure");
        assertEquals(500, store.getStock(IngredientType.COFFEE_BEANS), "no partial deduction on failure");
    }

    @Test
    @DisplayName("An empty or null requirement map is trivially satisfied")
    void emptyRequirementIsTriviallySatisfied() {
        assertTrue(store.checkAndDeductIngredients(null));
        assertTrue(store.checkAndDeductIngredients(new EnumMap<>(IngredientType.class)));
    }
}
