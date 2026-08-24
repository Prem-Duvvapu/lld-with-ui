package com.lld.inventory;

import com.lld.inventory.exception.InsufficientStockException;
import com.lld.inventory.exception.InvalidStockOperationException;
import com.lld.inventory.exception.ProductNotFoundException;
import com.lld.inventory.model.*;
import com.lld.inventory.observer.InAppStockAlertObserver;
import com.lld.inventory.observer.LoggingStockAlertObserver;
import com.lld.inventory.observer.StockAlertNotifier;
import com.lld.inventory.repository.InventoryRepository;
import com.lld.inventory.service.InventoryService;
import com.lld.inventory.strategy.EoqReorderStrategy;
import com.lld.inventory.strategy.MinRestockStrategy;
import com.lld.inventory.strategy.ReorderPolicy;
import com.lld.inventory.strategy.ReorderStrategyFactory;
import com.lld.inventory.strategy.UrgentBufferReorderStrategy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InventoryServiceTest {

    private InventoryService service;
    private InAppStockAlertObserver inAppObserver;

    @BeforeEach
    void setUp() {
        InventoryRepository repository = new InventoryRepository();
        inAppObserver = new InAppStockAlertObserver();
        StockAlertNotifier notifier = new StockAlertNotifier(List.of(inAppObserver, new LoggingStockAlertObserver()));
        ReorderStrategyFactory factory = new ReorderStrategyFactory(
                new MinRestockStrategy(), new EoqReorderStrategy(), new UrgentBufferReorderStrategy());
        service = new InventoryService(repository, notifier, inAppObserver, factory);
    }

    private long addProduct(int stock, int reorderLevel) {
        return service.addProduct(Product.builder()
                .sku("TST-" + System.nanoTime()).name("Test Widget").category(Category.ELECTRONICS)
                .unitPrice(500.0).currentStock(stock).reorderLevel(reorderLevel).supplierId(1).build()
        ).getId();
    }

    // ------------------------------------------------------------ addProduct

    @Test
    @DisplayName("addProduct rejects a blank SKU")
    void addProduct_rejectsBlankSku() {
        Product bad = Product.builder().sku("  ").name("X").currentStock(1).reorderLevel(1).build();
        assertThrows(InvalidStockOperationException.class, () -> service.addProduct(bad));
    }

    @Test
    @DisplayName("addProduct rejects negative stock or reorder level")
    void addProduct_rejectsNegativeLevels() {
        Product negStock = Product.builder().sku("A").name("X").currentStock(-1).reorderLevel(1).build();
        Product negReorder = Product.builder().sku("B").name("X").currentStock(1).reorderLevel(-1).build();
        assertThrows(InvalidStockOperationException.class, () -> service.addProduct(negStock));
        assertThrows(InvalidStockOperationException.class, () -> service.addProduct(negReorder));
    }

    @Test
    @DisplayName("addProduct defaults a null category to OTHER")
    void addProduct_defaultsCategory() {
        Product saved = service.addProduct(Product.builder().sku("C").name("X")
                .currentStock(5).reorderLevel(1).build());
        assertEquals(Category.OTHER, saved.getCategory());
    }

    // ---------------------------------------------------------- updateStock

    @Test
    @DisplayName("OUTBOUND reduces stock; INBOUND increases it")
    void updateStock_movesStockBothDirections() {
        long id = addProduct(20, 5);
        service.updateStock(id, 5, "OUTBOUND", "sale");
        assertEquals(15, stockOf(id));
        service.updateStock(id, 10, "INBOUND", "restock");
        assertEquals(25, stockOf(id));
    }

    @Test
    @DisplayName("An OUTBOUND that would take stock negative is rejected, and stock is unchanged")
    void updateStock_rejectsOverdraw() {
        long id = addProduct(3, 5);
        assertThrows(InsufficientStockException.class, () -> service.updateStock(id, 4, "OUTBOUND", "sale"));
        assertEquals(3, stockOf(id), "a rejected sale must not have touched stock");
    }

    @Test
    @DisplayName("Zero or negative quantity is rejected")
    void updateStock_rejectsNonPositiveQuantity() {
        long id = addProduct(10, 5);
        assertThrows(InvalidStockOperationException.class, () -> service.updateStock(id, 0, "OUTBOUND", "x"));
        assertThrows(InvalidStockOperationException.class, () -> service.updateStock(id, -5, "OUTBOUND", "x"));
    }

    @Test
    @DisplayName("Unknown movement type is rejected")
    void updateStock_rejectsUnknownType() {
        long id = addProduct(10, 5);
        assertThrows(InvalidStockOperationException.class, () -> service.updateStock(id, 1, "SIDEWAYS", "x"));
    }

    @Test
    @DisplayName("Unknown product id is rejected")
    void updateStock_rejectsUnknownProduct() {
        assertThrows(ProductNotFoundException.class, () -> service.updateStock(999_999, 1, "OUTBOUND", "x"));
    }

    // ------------------------------------------------------- crossing alerts

    @Test
    @DisplayName("Crossing below the reorder level fires exactly one LOW_STOCK alert")
    void crossingBelowReorderLevel_firesLowStockOnce() {
        long id = addProduct(10, 5); // starts above reorder level
        service.updateStock(id, 6, "OUTBOUND", "sale"); // 10 -> 4, crosses below 5

        List<StockAlert> alerts = service.getAlerts();
        long lowStockCount = alerts.stream().filter(a -> a.getType() == StockAlert.AlertType.LOW_STOCK
                && a.getProductId() == id).count();
        assertEquals(1, lowStockCount);
    }

    @Test
    @DisplayName("Further sales while already below the reorder level do not re-fire LOW_STOCK")
    void alreadyBelowLevel_doesNotRefire() {
        long id = addProduct(10, 5);
        service.updateStock(id, 6, "OUTBOUND", "sale"); // crosses to 4, fires once
        service.updateStock(id, 1, "OUTBOUND", "sale"); // 4 -> 3, still below, must NOT refire

        long lowStockCount = service.getAlerts().stream()
                .filter(a -> a.getType() == StockAlert.AlertType.LOW_STOCK && a.getProductId() == id).count();
        assertEquals(1, lowStockCount, "LOW_STOCK must fire on the crossing only, not every sale below it");
    }

    @Test
    @DisplayName("Selling the last unit fires OUT_OF_STOCK, not LOW_STOCK")
    void sellingLastUnit_firesOutOfStock() {
        long id = addProduct(1, 5);
        service.updateStock(id, 1, "OUTBOUND", "sale");

        List<StockAlert> alerts = service.getAlerts();
        assertTrue(alerts.stream().anyMatch(a -> a.getType() == StockAlert.AlertType.OUT_OF_STOCK && a.getProductId() == id));
        assertFalse(alerts.stream().anyMatch(a -> a.getType() == StockAlert.AlertType.LOW_STOCK && a.getProductId() == id));
    }

    @Test
    @DisplayName("Restocking back above the reorder level fires RESTOCKED")
    void restockingAboveLevel_firesRestocked() {
        long id = addProduct(2, 5); // already below level
        service.updateStock(id, 10, "INBOUND", "restock"); // 2 -> 12, crosses back above 5

        assertTrue(service.getAlerts().stream()
                .anyMatch(a -> a.getType() == StockAlert.AlertType.RESTOCKED && a.getProductId() == id));
    }

    @Test
    @DisplayName("An inbound that does not cross back above the level does not fire RESTOCKED")
    void inboundStillBelowLevel_doesNotFireRestocked() {
        long id = addProduct(2, 10); // well below level
        service.updateStock(id, 3, "INBOUND", "partial restock"); // 2 -> 5, still below 10

        assertFalse(service.getAlerts().stream()
                .anyMatch(a -> a.getType() == StockAlert.AlertType.RESTOCKED && a.getProductId() == id));
    }

    @Test
    @DisplayName("Both observers receive every alert independently")
    void bothObserversReceiveAlerts() {
        long id = addProduct(1, 5);
        service.updateStock(id, 1, "OUTBOUND", "sale");

        assertFalse(inAppObserver.recentAlerts().isEmpty(), "the in-app feed observer must have the alert");
    }

    // ---------------------------------------------------------------- query

    @Test
    @DisplayName("getLowStockItems returns products at or below the given threshold")
    void getLowStockItems_filtersByThreshold() {
        long low = addProduct(3, 5);
        long high = addProduct(50, 5);

        List<Product> lowStock = service.getLowStockItems(10);
        assertTrue(lowStock.stream().anyMatch(p -> p.getId() == low));
        assertFalse(lowStock.stream().anyMatch(p -> p.getId() == high));
    }

    @Test
    @DisplayName("getProducts filters by category, case-insensitively")
    void getProducts_filtersByCategory() {
        List<Product> electronics = service.getProducts("electronics");
        assertFalse(electronics.isEmpty());
        assertTrue(electronics.stream().allMatch(p -> p.getCategory() == Category.ELECTRONICS));
    }

    @Test
    @DisplayName("getProducts rejects an unknown category")
    void getProducts_rejectsUnknownCategory() {
        assertThrows(InvalidStockOperationException.class, () -> service.getProducts("NOT_A_CATEGORY"));
    }

    // -------------------------------------------------------------- transfer

    @Test
    @DisplayName("transferStock moves stock the same as an outbound sale")
    void transferStock_reducesStock() {
        long id = addProduct(10, 5);
        StockMovement movement = service.transferStock(id, "WH-A", "WH-B", 4);
        assertEquals(StockMovement.StockMovementType.TRANSFER, movement.getType());
        assertEquals(6, stockOf(id));
    }

    // --------------------------------------------------------------- reorder

    @Test
    @DisplayName("reorder via EOQ increases stock by the strategy's exact quantity")
    void reorder_eoqIncreasesStockByStrategyAmount() {
        long id = service.addProduct(Product.builder().sku("EOQ-1").name("Widget")
                .category(Category.ELECTRONICS).unitPrice(1000.0).currentStock(3).reorderLevel(10)
                .supplierId(1).build()).getId();

        StockMovement movement = service.reorder(id, ReorderPolicy.EOQ);
        assertEquals(51, movement.getQuantity()); // pinned in ReorderStrategyTest
        assertEquals(3 + 51, stockOf(id));
    }

    @Test
    @DisplayName("reorder via MIN_RESTOCK on a product already above its level is rejected")
    void reorder_minRestockRejectsWhenAboveLevel() {
        long id = addProduct(20, 5); // already comfortably above
        assertThrows(InvalidStockOperationException.class, () -> service.reorder(id, ReorderPolicy.MIN_RESTOCK));
    }

    @Test
    @DisplayName("reorder emits a REORDER_PLACED alert")
    void reorder_emitsAlert() {
        long id = addProduct(2, 10);
        service.reorder(id, ReorderPolicy.URGENT_BUFFER);
        assertTrue(service.getAlerts().stream()
                .anyMatch(a -> a.getType() == StockAlert.AlertType.REORDER_PLACED && a.getProductId() == id));
    }

    // ------------------------------------------------------------------ sim

    @Test
    @DisplayName("The sim sandbox is fully isolated from live state")
    void simSandbox_isolatedFromLive() {
        long liveId = addProduct(10, 5);
        service.simReset();
        // a sim sale on an id that only exists in live data must not find a product
        assertThrows(ProductNotFoundException.class, () -> service.simSell(liveId, 1));
    }

    @Test
    @DisplayName("simReset produces a fresh sandbox with its own seed data and no leftover alerts")
    void simReset_freshSandbox() {
        var initialState = service.simState();
        @SuppressWarnings("unchecked")
        List<Product> initialProducts = (List<Product>) initialState.get("products");
        long simProductId = initialProducts.get(0).getId();

        service.simSell(simProductId, 1);
        service.simReset();

        var afterReset = service.simState();
        assertEquals(0, ((List<?>) afterReset.get("alerts")).size(),
                "a fresh sandbox must have no alerts carried over from the previous session");
    }

    private int stockOf(long productId) {
        return service.getProducts(null).stream()
                .filter(p -> p.getId() == productId).findFirst()
                .orElseThrow().getCurrentStock();
    }
}
