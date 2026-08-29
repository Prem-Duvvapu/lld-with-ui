package com.lld.shoppingcart;

import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.payment.*;
import com.lld.shoppingcart.service.ShoppingCartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the isolated {@code /sim/*} sandbox is a genuinely separate set of state from the live
 * catalog/carts/orders -- mutating the sandbox must never leak into (or read from) live data, and
 * {@code initSimState()} must reset the sandbox to its known seed every time.
 */
public class ShoppingCartSimEngineTest {

    private ShoppingCartService service;

    @BeforeEach
    public void setUp() {
        List<PaymentStrategy> strategies = List.of(
                new CreditCardPaymentStrategy(),
                new DebitCardPaymentStrategy(),
                new UpiPaymentStrategy(),
                new WalletPaymentStrategy()
        );
        service = new ShoppingCartService(new ShoppingCartPaymentProcessor(strategies));
    }

    @Test
    public void simSeedIsIndependentFromLiveCatalog() {
        // Live catalog starts empty in this unit test (no ShoppingCartInitializer here); the sim
        // sandbox seeds its own 4 products regardless.
        assertTrue(service.getAllProducts().isEmpty(), "Live catalog must start empty in this test");

        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Product> simProducts = (List<Product>) snapshot.get("products");
        assertEquals(4, simProducts.size(), "Sim sandbox seeds its own 4-product catalog independent of live state");
    }

    @Test
    public void simCheckoutNeverMutatesLiveProductsCartsOrOrders() {
        service.addProduct(new Product("LIVE-1", "Live Product", Category.ELECTRONICS, 500.0, 5));
        service.registerUser(new User("live-user", "Live User", "live@test.com", "Addr"));
        service.addToCart("live-user", "LIVE-1", 1);

        // Drive several sim actions -- these must be fully isolated from the live product above.
        service.simAddToCart("Sim_User", "P101", 1);
        service.simPlaceOrder("Sim_User", PaymentMethod.UPI);

        // Live state must be completely untouched by the sim actions.
        assertEquals(5, service.getProduct("LIVE-1").getStockQuantity(), "Live product stock must be untouched by sim checkout");
        assertEquals(1, service.getCart("live-user").getItems().size(), "Live cart must be untouched by sim actions");
        assertTrue(service.getAllOrders().isEmpty(), "Sim orders must never appear in the live order list");

        // Sim product P101 (seeded with stock 2 for the low-stock demo scenario) must have been
        // decremented by the sim checkout above, proving the sim engine's own state DID change.
        Map<String, Object> snapshot = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Product> simProducts = (List<Product>) snapshot.get("products");
        Product simP101 = simProducts.stream().filter(p -> p.getId().equals("P101")).findFirst().orElseThrow();
        assertEquals(1, simP101.getStockQuantity(), "Sim P101 stock (seeded at 2) must be decremented by 1 by the sim checkout");
    }

    @Test
    public void simResetRestoresTheKnownSeedEveryTime() {
        service.simAddToCart("Sim_User", "P101", 1);
        service.simPlaceOrder("Sim_User", PaymentMethod.UPI);

        Map<String, Object> beforeReset = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Product> beforeProducts = (List<Product>) beforeReset.get("products");
        assertEquals(1, beforeProducts.stream().filter(p -> p.getId().equals("P101")).findFirst().orElseThrow().getStockQuantity());

        service.initSimState();

        Map<String, Object> afterReset = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Product> afterProducts = (List<Product>) afterReset.get("products");
        assertEquals(2, afterProducts.stream().filter(p -> p.getId().equals("P101")).findFirst().orElseThrow().getStockQuantity(),
                "simReset must restore P101's seeded stock of 2");
        @SuppressWarnings("unchecked")
        List<Order> afterOrders = (List<Order>) afterReset.get("orders");
        assertTrue(afterOrders.isEmpty(), "simReset must clear all sim orders");
        @SuppressWarnings("unchecked")
        List<SimEvent> afterEvents = (List<SimEvent>) afterReset.get("events");
        assertEquals(1, afterEvents.size(), "simReset clears the event log and logs exactly one SIM_RESET event");
        assertEquals("SIM_RESET", afterEvents.get(0).getType());
    }

    @Test
    public void simPlaceOrderLogsAscendingLockAcquisitionOrderWhenMultipleProductsInvolved() {
        service.simAddToCart("Sim_User", "P104", 1); // Clean Code Book
        service.simAddToCart("Sim_User", "P102", 1); // Wireless Headphones -- inserted SECOND but has the lower id
        service.simPlaceOrder("Sim_User", PaymentMethod.UPI);

        List<SimEvent> events = service.getSimEvents();
        SimEvent lockOrderEvent = events.stream().filter(e -> "LOCK_ORDER".equals(e.getType())).findFirst()
                .orElseThrow(() -> new AssertionError("Expected a LOCK_ORDER event for a multi-product checkout"));

        @SuppressWarnings("unchecked")
        List<String> lockOrder = (List<String>) lockOrderEvent.getDetails().get("lockAcquisitionOrder");
        assertEquals(List.of("P102", "P104"), lockOrder, "Lock order must be ascending by product id (P102 < P104), not cart-insertion order (P104 then P102)");
    }
}
