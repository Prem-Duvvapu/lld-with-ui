package com.lld.inventory;

import com.lld.inventory.exception.InvalidStockOperationException;
import com.lld.inventory.model.Category;
import com.lld.inventory.model.Product;
import com.lld.inventory.strategy.EoqReorderStrategy;
import com.lld.inventory.strategy.MinRestockStrategy;
import com.lld.inventory.strategy.ReorderPolicy;
import com.lld.inventory.strategy.ReorderStrategy;
import com.lld.inventory.strategy.ReorderStrategyFactory;
import com.lld.inventory.strategy.UrgentBufferReorderStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Pins the exact reorder-quantity arithmetic for each {@link ReorderStrategy}. */
class ReorderStrategyTest {

    private Product product(int stock, int reorderLevel, double unitPrice) {
        return Product.builder().id(1).sku("SKU-1").name("Test Product")
                .category(Category.ELECTRONICS).unitPrice(unitPrice)
                .currentStock(stock).reorderLevel(reorderLevel).supplierId(1).build();
    }

    // ---------------------------------------------------------- MinRestock

    @Test
    @DisplayName("MinRestock orders exactly enough to reach the reorder level")
    void minRestock_ordersExactShortfall() {
        MinRestockStrategy strategy = new MinRestockStrategy();
        assertEquals(7, strategy.reorderQuantity(product(3, 10, 100.0)));
        assertEquals(1, strategy.reorderQuantity(product(9, 10, 100.0)));
    }

    @Test
    @DisplayName("MinRestock rejects a product already at or above its reorder level")
    void minRestock_rejectsWhenNotNeeded() {
        MinRestockStrategy strategy = new MinRestockStrategy();
        assertThrows(InvalidStockOperationException.class, () -> strategy.reorderQuantity(product(10, 10, 100.0)));
        assertThrows(InvalidStockOperationException.class, () -> strategy.reorderQuantity(product(15, 10, 100.0)));
    }

    // ---------------------------------------------------------------- EOQ

    @Test
    @DisplayName("EOQ follows the Harris lot-size formula exactly: ceil(sqrt(2DS/H))")
    void eoq_matchesHarrisFormula() {
        EoqReorderStrategy strategy = new EoqReorderStrategy();
        // reorderLevel=10 -> D=260; unitPrice=1000 -> H=100; sqrt(2*260*500/100)=sqrt(2600)=50.99.. -> 51
        assertEquals(51, strategy.reorderQuantity(product(3, 10, 1000.0)));
    }

    @Test
    @DisplayName("EOQ is independent of current stock — only reorder level and price drive it")
    void eoq_ignoresCurrentStock() {
        EoqReorderStrategy strategy = new EoqReorderStrategy();
        int fromNearlyEmpty = strategy.reorderQuantity(product(1, 10, 1000.0));
        int fromHalfFull = strategy.reorderQuantity(product(9, 10, 1000.0));
        assertEquals(fromNearlyEmpty, fromHalfFull);
    }

    @Test
    @DisplayName("EOQ falls back to reorderLevel (min 1) when unit price is non-positive")
    void eoq_fallsBackOnZeroPrice() {
        EoqReorderStrategy strategy = new EoqReorderStrategy();
        assertEquals(10, strategy.reorderQuantity(product(3, 10, 0.0)));
        assertEquals(1, strategy.reorderQuantity(product(0, 0, 0.0)));
    }

    // --------------------------------------------------------- UrgentBuffer

    @Test
    @DisplayName("UrgentBuffer targets 5x reorder level on a true stock-out")
    void urgentBuffer_stockoutTargetsFiveX() {
        UrgentBufferReorderStrategy strategy = new UrgentBufferReorderStrategy();
        // stock=0, reorderLevel=10 -> target=50, order 50-0=50
        assertEquals(50, strategy.reorderQuantity(product(0, 10, 100.0)));
    }

    @Test
    @DisplayName("UrgentBuffer targets 3x reorder level when merely low, not stocked out")
    void urgentBuffer_lowStockTargetsThreeX() {
        UrgentBufferReorderStrategy strategy = new UrgentBufferReorderStrategy();
        // stock=5, reorderLevel=10 -> target=30, order 30-5=25
        assertEquals(25, strategy.reorderQuantity(product(5, 10, 100.0)));
    }

    @Test
    @DisplayName("UrgentBuffer never returns less than 1 unit")
    void urgentBuffer_neverReturnsZeroOrNegative() {
        UrgentBufferReorderStrategy strategy = new UrgentBufferReorderStrategy();
        assertEquals(1, strategy.reorderQuantity(product(100, 10, 100.0)));
    }

    // ------------------------------------------------------------- Factory

    @Test
    @DisplayName("Factory resolves every declared policy to its matching strategy")
    void factory_resolvesEveryPolicy() {
        ReorderStrategyFactory factory = new ReorderStrategyFactory(
                new MinRestockStrategy(), new EoqReorderStrategy(), new UrgentBufferReorderStrategy());

        assertInstanceOf(MinRestockStrategy.class, factory.forPolicy(ReorderPolicy.MIN_RESTOCK));
        assertInstanceOf(EoqReorderStrategy.class, factory.forPolicy(ReorderPolicy.EOQ));
        assertInstanceOf(UrgentBufferReorderStrategy.class, factory.forPolicy(ReorderPolicy.URGENT_BUFFER));
    }
}
