package com.lld.shoppingcart.service;

import com.lld.shoppingcart.command.*;
import com.lld.shoppingcart.exception.*;
import com.lld.shoppingcart.model.*;
import com.lld.shoppingcart.payment.ShoppingCartPaymentProcessor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class ShoppingCartService {

    private final ConcurrentHashMap<String, Product> products = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, User> users = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Cart> carts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Order> orders = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Stack<CartCommand>> userCommandHistory = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Order> idempotencyCache = new ConcurrentHashMap<>();
    // One lock object per idempotency key, lazily created -- makes the "check cache, do the work,
    // populate cache" sequence in placeOrder() atomic per key, so two concurrent retries sharing
    // the SAME key can never both slip past the cache-miss check (see RCA-031's companion fix:
    // without this, both would decrement stock and charge payment separately, and the cache would
    // silently keep only the last writer's Order). Different keys never contend with each other.
    private final ConcurrentHashMap<String, Object> idempotencyKeyLocks = new ConcurrentHashMap<>();

    private final ShoppingCartPaymentProcessor paymentProcessor;
    private final AtomicLong orderIdGen = new AtomicLong(100);

    // Isolated Simulation Engine State
    private final ConcurrentHashMap<String, Product> simProducts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Cart> simCarts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Order> simOrders = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    public ShoppingCartService(ShoppingCartPaymentProcessor paymentProcessor) {
        this.paymentProcessor = paymentProcessor;
        initSimState();
    }

    public void addProduct(Product product) {
        products.put(product.getId(), product);
    }

    public Product getProduct(String id) {
        Product p = products.get(id);
        if (p == null) {
            throw new ProductNotFoundException("Product not found with id: " + id);
        }
        return p;
    }

    public List<Product> getAllProducts() {
        return new ArrayList<>(products.values());
    }

    public List<Product> searchProducts(String query, Category category, Double minPrice, Double maxPrice) {
        return products.values().stream()
                .filter(p -> (query == null || p.getName().toLowerCase().contains(query.toLowerCase())))
                .filter(p -> (category == null || p.getCategory() == category))
                .filter(p -> (minPrice == null || p.getPrice() >= minPrice))
                .filter(p -> (maxPrice == null || p.getPrice() <= maxPrice))
                .collect(Collectors.toList());
    }

    public void registerUser(User user) {
        users.put(user.getId(), user);
    }

    public User getUser(String id) {
        return users.get(id);
    }

    public List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    public Cart getCart(String userId) {
        return carts.computeIfAbsent(userId, Cart::new);
    }

    public void addToCart(String userId, String productId, int quantity) {
        Product product = getProduct(productId);
        Cart cart = getCart(userId);
        CartCommand cmd = new AddItemCommand(cart, product, quantity);
        executeCommand(userId, cmd);
    }

    public void removeFromCart(String userId, String productId) {
        Cart cart = getCart(userId);
        CartItem item = cart.getItems().get(productId);
        if (item != null) {
            CartCommand cmd = new RemoveItemCommand(cart, item);
            executeCommand(userId, cmd);
        }
    }

    public void updateCartQuantity(String userId, String productId, int quantity) {
        Cart cart = getCart(userId);
        CartItem existing = cart.getItems().get(productId);
        // Snapshot the full previous line item (not just its quantity) so undo() can fully
        // reconstruct it even if this update drops the quantity to <= 0 and removes the entry.
        CartItem previousSnapshot = existing == null ? null
                : new CartItem(existing.getProductId(), existing.getProductName(), existing.getUnitPrice(), existing.getQuantity());
        CartCommand cmd = new UpdateQuantityCommand(cart, productId, previousSnapshot, quantity);
        executeCommand(userId, cmd);
    }

    public void executeCommand(String userId, CartCommand command) {
        command.execute();
        userCommandHistory.computeIfAbsent(userId, k -> new Stack<>()).push(command);
    }

    public boolean undoLastCartCommand(String userId) {
        Stack<CartCommand> history = userCommandHistory.get(userId);
        if (history != null && !history.isEmpty()) {
            CartCommand lastCmd = history.pop();
            lastCmd.undo();
            return true;
        }
        return false;
    }

    public Order placeOrder(String userId, PaymentMethod paymentMethod, String idempotencyKey) {
        boolean hasIdempotencyKey = idempotencyKey != null && !idempotencyKey.trim().isEmpty();
        if (!hasIdempotencyKey) {
            return doPlaceOrder(userId, paymentMethod);
        }

        // Serialize the whole "check cache -> do the work -> populate cache" sequence per
        // idempotency key so two concurrent retries sharing the SAME key can never both observe a
        // cache miss and both perform the checkout. A lazily-created lock object per key means
        // calls under DIFFERENT keys (the common case) never contend with each other at all.
        Object keyLock = idempotencyKeyLocks.computeIfAbsent(idempotencyKey, k -> new Object());
        synchronized (keyLock) {
            Order cached = idempotencyCache.get(idempotencyKey);
            if (cached != null) {
                return cached;
            }
            Order order = doPlaceOrder(userId, paymentMethod);
            idempotencyCache.put(idempotencyKey, order);
            return order;
        }
    }

    private Order doPlaceOrder(String userId, PaymentMethod paymentMethod) {
        Cart cart = getCart(userId);
        if (cart.getItems().isEmpty()) {
            throw new CartEmptyException("Cart is empty for user: " + userId);
        }

        // Sort items by Product ID in ascending order to prevent deadlocks
        List<CartItem> cartItems = new ArrayList<>(cart.getItems().values());
        List<Product> lockProducts = cartItems.stream()
                .map(item -> getProduct(item.getProductId()))
                .sorted(Comparator.comparing(Product::getId))
                .collect(Collectors.toList());

        // Acquire product locks in ascending ID order
        List<ReentrantLock> acquiredLocks = new ArrayList<>();
        try {
            for (Product p : lockProducts) {
                p.getLock().lock();
                acquiredLocks.add(p.getLock());
            }

            // Validate stock for all items
            for (CartItem item : cartItems) {
                Product p = getProduct(item.getProductId());
                if (p.getStockQuantity() < item.getQuantity()) {
                    throw new InsufficientStockException(String.format("Insufficient stock for product '%s'. Requested: %d, Available: %d",
                            p.getName(), item.getQuantity(), p.getStockQuantity()));
                }
            }

            // Decrement stock for all items
            List<OrderItem> orderItems = new ArrayList<>();
            for (CartItem item : cartItems) {
                Product p = getProduct(item.getProductId());
                p.decrementStock(item.getQuantity());
                orderItems.add(new OrderItem(p.getId(), p.getName(), p.getPrice(), item.getQuantity()));
            }

            // Computed from the just-built orderItems snapshot, not a fresh cart.getTotalAmount()
            // read -- the cart is a live, shared, unlocked object, so re-reading it here could
            // observe a concurrent mutation (e.g. another thread's cart.clear()) between the
            // decrement above and this point.
            double totalAmount = orderItems.stream().mapToDouble(OrderItem::getTotalPrice).sum();
            String orderId = "ORD-" + orderIdGen.getAndIncrement();

            String txId = paymentProcessor.executePayment(orderId, totalAmount, paymentMethod);
            Order order = new Order(orderId, userId, orderItems, totalAmount, paymentMethod);
            order.setPaymentTransactionId(txId);

            orders.put(orderId, order);
            cart.clear();

            return order;

        } finally {
            // Release acquired locks in reverse order
            for (int i = acquiredLocks.size() - 1; i >= 0; i--) {
                acquiredLocks.get(i).unlock();
            }
        }
    }

    public Order getOrder(String orderId) {
        Order order = orders.get(orderId);
        if (order == null) {
            throw new InvalidOrderStateException("Order not found: " + orderId);
        }
        return order;
    }

    public List<Order> getUserOrders(String userId) {
        return orders.values().stream()
                .filter(o -> o.getUserId().equals(userId))
                .sorted(Comparator.comparing(Order::getCreatedAtEpoch).reversed())
                .collect(Collectors.toList());
    }

    public List<Order> getAllOrders() {
        return orders.values().stream()
                .sorted(Comparator.comparing(Order::getCreatedAtEpoch).reversed())
                .collect(Collectors.toList());
    }

    public Order updateOrderStatus(String orderId, OrderStatus newStatus) {
        Order order = getOrder(orderId);

        if (newStatus == OrderStatus.CANCELLED) {
            cancelOrder(orderId);
            return getOrder(orderId);
        }

        order.setStatus(newStatus);
        return order;
    }

    public void cancelOrder(String orderId) {
        Order order = getOrder(orderId);
        OrderStatus current = order.getStatus();

        if (current == OrderStatus.SHIPPED || current == OrderStatus.DELIVERED || current == OrderStatus.CANCELLED) {
            throw new InvalidOrderStateException(String.format("Cannot cancel order %s in status %s!", orderId, current));
        }

        // Restock inventory
        for (OrderItem item : order.getItems()) {
            Product p = products.get(item.getProductId());
            if (p != null) {
                p.incrementStock(item.getQuantity());
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public synchronized void initSimState() {
        simProducts.clear();
        simCarts.clear();
        simOrders.clear();
        simEventLog.clear();

        Product p1 = new Product("P101", "Gaming Laptop RTX 4080", Category.ELECTRONICS, 125000.0, 2); // Low stock = 2
        Product p2 = new Product("P102", "Wireless Headphones", Category.ELECTRONICS, 4999.0, 15);
        Product p3 = new Product("P103", "Ergonomic Desk Chair", Category.HOME_KITCHEN, 12999.0, 10);
        Product p4 = new Product("P104", "Clean Code Book", Category.BOOKS, 899.0, 20);

        simProducts.put(p1.getId(), p1);
        simProducts.put(p2.getId(), p2);
        simProducts.put(p3.getId(), p3);
        simProducts.put(p4.getId(), p4);

        logSimEvent("SIM_RESET", "System", "Initialized simulation catalog with 4 products (P101 low stock = 2 units)", null);
    }

    public synchronized Map<String, Object> simAddToCart(String userId, String productId, int quantity) {
        Product p = simProducts.get(productId);
        if (p == null) throw new ProductNotFoundException("Sim product not found: " + productId);

        Cart cart = simCarts.computeIfAbsent(userId, Cart::new);
        cart.addItem(p, quantity);

        logSimEvent("ADD_TO_CART", userId, String.format("Added %d units of '%s' to cart", quantity, p.getName()), null);
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simPlaceOrder(String userId, PaymentMethod method) {
        Cart cart = simCarts.get(userId);
        if (cart == null || cart.getItems().isEmpty()) {
            logSimEvent("ORDER_FAILED", userId, "Cart empty for user " + userId, null);
            return getSimSnapshots();
        }

        List<CartItem> cartItems = new ArrayList<>(cart.getItems().values());
        // Cart-insertion order, exactly as the user clicked "Add to Cart" -- kept separate from
        // the lock order below so the UI can show the two side by side.
        List<String> cartInsertionOrder = cartItems.stream().map(CartItem::getProductId).collect(Collectors.toList());

        List<Product> lockProducts = cartItems.stream()
                .map(item -> simProducts.get(item.getProductId()))
                .sorted(Comparator.comparing(Product::getId))
                .collect(Collectors.toList());
        List<String> lockAcquisitionOrder = lockProducts.stream().map(Product::getId).collect(Collectors.toList());

        if (lockProducts.size() > 1) {
            Map<String, Object> lockDetails = new HashMap<>();
            lockDetails.put("cartInsertionOrder", cartInsertionOrder);
            lockDetails.put("lockAcquisitionOrder", lockAcquisitionOrder);
            logSimEvent("LOCK_ORDER", userId, String.format("Checkout touches %d products -- locks will be acquired in ascending product-id order %s, NOT cart-insertion order %s",
                    lockProducts.size(), lockAcquisitionOrder, cartInsertionOrder), lockDetails);
        }

        // Validate stock, walking products in the SAME ascending lock order placeOrder() would
        // acquire them in -- the sandbox is single-threaded (this whole method is `synchronized`)
        // so there is no real contention to demonstrate here, but the order of inspection mirrors
        // the live deadlock-free path exactly.
        for (Product p : lockProducts) {
            CartItem item = cart.getItems().get(p.getId());
            if (p.getStockQuantity() < item.getQuantity()) {
                Map<String, Object> details = new HashMap<>();
                details.put("productId", p.getId());
                details.put("requested", item.getQuantity());
                details.put("available", p.getStockQuantity());
                details.put("lockAcquisitionOrder", lockAcquisitionOrder);

                logSimEvent("INSUFFICIENT_STOCK", userId, String.format("OUT OF STOCK! Checkout failed for '%s'. Requested: %d, Available: %d",
                        p.getName(), item.getQuantity(), p.getStockQuantity()), details);
                return getSimSnapshots();
            }
        }

        // Decrement stock & create order, in the same ascending lock order.
        List<OrderItem> orderItems = new ArrayList<>();
        for (Product p : lockProducts) {
            CartItem item = cart.getItems().get(p.getId());
            p.decrementStock(item.getQuantity());
            orderItems.add(new OrderItem(p.getId(), p.getName(), p.getPrice(), item.getQuantity()));
        }

        String orderId = "SIM-ORD-" + simOrders.size() + 101;
        Order order = new Order(orderId, userId, orderItems, cart.getTotalAmount(), method);
        order.setPaymentTransactionId("TX-SIM-" + System.currentTimeMillis() % 10000);
        simOrders.put(orderId, order);
        cart.clear();

        Map<String, Object> orderDetails = new HashMap<>();
        orderDetails.put("orderId", orderId);
        orderDetails.put("lockAcquisitionOrder", lockAcquisitionOrder);
        logSimEvent("ORDER_PLACED", userId, String.format("Order %s PLACED successfully for ₹%.2f via %s", orderId, order.getTotalAmount(), method), orderDetails);
        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simUpdateOrderStatus(String orderId, OrderStatus status) {
        Order order = simOrders.get(orderId);
        if (order == null) throw new InvalidOrderStateException("Order not found: " + orderId);

        if (status == OrderStatus.CANCELLED) {
            if (order.getStatus() == OrderStatus.SHIPPED || order.getStatus() == OrderStatus.DELIVERED) {
                logSimEvent("CANCEL_FAILED", order.getUserId(), String.format("CANNOT CANCEL! Order %s is already %s!", orderId, order.getStatus()), null);
                return getSimSnapshots();
            }
            // Restock
            for (OrderItem item : order.getItems()) {
                Product p = simProducts.get(item.getProductId());
                if (p != null) p.incrementStock(item.getQuantity());
            }
        }

        order.setStatus(status);
        logSimEvent("STATUS_UPDATED", "Admin", String.format("Order %s state changed to %s", orderId, status), null);
        return getSimSnapshots();
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("products", new ArrayList<>(simProducts.values()));
        res.put("carts", simCarts);
        res.put("orders", new ArrayList<>(simOrders.values()));
        res.put("events", simEventLog);
        return res;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}