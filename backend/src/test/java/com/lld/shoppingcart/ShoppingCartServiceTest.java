package com.lld.shoppingcart;

import com.lld.shoppingcart.exception.InsufficientStockException;
import com.lld.shoppingcart.exception.InvalidOrderStateException;
import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.payment.*;
import com.lld.shoppingcart.service.ShoppingCartService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

public class ShoppingCartServiceTest {

    private ShoppingCartService service;

    @BeforeEach
    public void setUp() {
        List<PaymentStrategy> strategies = List.of(
                new CreditCardPaymentStrategy(),
                new DebitCardPaymentStrategy(),
                new UpiPaymentStrategy(),
                new WalletPaymentStrategy()
        );
        ShoppingCartPaymentProcessor processor = new ShoppingCartPaymentProcessor(strategies);
        service = new ShoppingCartService(processor);
        service.addProduct(new Product("P1", "Gaming Laptop", Category.ELECTRONICS, 1000.0, 5));
        service.registerUser(new User("u1", "Alice", "alice@example.com", "Address 1"));
    }

    @Test
    public void testAddToCartAndUndoCommand() {
        service.addToCart("u1", "P1", 2);
        Cart cart = service.getCart("u1");
        assertEquals(1, cart.getItems().size());
        assertEquals(2, cart.getItems().get("P1").getQuantity());

        boolean undone = service.undoLastCartCommand("u1");
        assertTrue(undone);
        assertNull(cart.getItems().get("P1"));
    }

    @Test
    public void testSuccessfulOrderPlacement() {
        service.addToCart("u1", "P1", 2);
        Order order = service.placeOrder("u1", PaymentMethod.UPI, "IDEMP-123");

        assertNotNull(order);
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertEquals(2000.0, order.getTotalAmount());

        Product p = service.getProduct("P1");
        assertEquals(3, p.getStockQuantity()); // 5 - 2 = 3
    }

    @Test
    public void testIdempotencyKeyReturnsCachedOrder() {
        service.addToCart("u1", "P1", 1);
        Order order1 = service.placeOrder("u1", PaymentMethod.UPI, "IDEMP-RETRY-1");

        // Attempt order placement with same idempotency key
        Order order2 = service.placeOrder("u1", PaymentMethod.UPI, "IDEMP-RETRY-1");
        assertSame(order1, order2);
    }

    @Test
    public void testGuardedOrderStateTransitionsAndCancellation() {
        service.addToCart("u1", "P1", 1);
        Order order = service.placeOrder("u1", PaymentMethod.UPI, null);

        service.updateOrderStatus(order.getOrderId(), OrderStatus.PROCESSING);
        assertEquals(OrderStatus.PROCESSING, order.getStatus());

        service.updateOrderStatus(order.getOrderId(), OrderStatus.SHIPPED);
        assertEquals(OrderStatus.SHIPPED, order.getStatus());

        // Attempting to cancel a SHIPPED order must throw InvalidOrderStateException
        assertThrows(InvalidOrderStateException.class, () -> {
            service.cancelOrder(order.getOrderId());
        });
    }

    @Test
    public void test10ConcurrentCheckoutThreadsZeroOverselling() throws Exception {
        // Product P-HOT has only 2 units in stock
        service.addProduct(new Product("P-HOT", "PS5 Console", Category.ELECTRONICS, 500.0, 2));

        int numThreads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        // Pre-create 10 users and populate their carts with 1 unit of P-HOT
        for (int i = 0; i < numThreads; i++) {
            String uid = "user-" + i;
            service.registerUser(new User(uid, "User " + i, uid + "@test.com", "Addr"));
            service.addToCart(uid, "P-HOT", 1);
        }

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < numThreads; i++) {
            final String uid = "user-" + i;
            futures.add(executor.submit(() -> {
                try {
                    latch.await(); // Synchronize all 10 threads to fire checkout simultaneously
                    service.placeOrder(uid, PaymentMethod.UPI, null);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException e) {
                    failCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }));
        }

        // Release all 10 checkout threads simultaneously
        latch.countDown();

        for (Future<?> future : futures) {
            future.get(5, TimeUnit.SECONDS);
        }

        executor.shutdown();
        assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));

        // EXACTLY 2 orders must succeed and 8 must fail! Stock must be exactly 0!
        assertEquals(2, successCount.get(), "Exactly 2 orders should have succeeded!");
        assertEquals(8, failCount.get(), "Exactly 8 orders should have failed with InsufficientStockException!");
        assertEquals(0, service.getProduct("P-HOT").getStockQuantity(), "Stock quantity must be exactly 0 (no negative overselling)!");
    }
}
