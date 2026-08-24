package com.lld.zomato.service;

import com.lld.zomato.config.ZomatoInitializer;
import com.lld.zomato.exception.*;
import com.lld.zomato.model.*;
import com.lld.zomato.repository.ZomatoRepository;
import com.lld.zomato.strategy.DeliveryFeeStrategy;
import com.lld.zomato.strategy.DeliveryFeeStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ZomatoService {

    private final ZomatoRepository repository;
    private final DeliveryAssignmentService deliveryAssignmentService;

    // Simulation sandbox state
    private final ZomatoRepository simRepository = new ZomatoRepository();
    private final DeliveryAssignmentService simDeliveryAssignmentService = new DeliveryAssignmentService(simRepository);
    private final List<ZomatoEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventSeq = new AtomicLong(0);

    public ZomatoService(ZomatoRepository repository, DeliveryAssignmentService deliveryAssignmentService) {
        this.repository = repository;
        this.deliveryAssignmentService = deliveryAssignmentService;
        ZomatoInitializer.seed(this.simRepository);
    }

    // --- Customers ---
    public List<Customer> getCustomers() {
        return repository.getAllCustomers();
    }

    public Customer getCustomer(String id) {
        Customer c = repository.getCustomer(id);
        if (c == null) throw new CustomerNotFoundException("Customer not found: " + id);
        return c;
    }

    public Customer registerCustomer(String name, String email, String phone, String address) {
        String id = "CUST-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Customer customer = new Customer(id, name, email, phone, address);
        repository.saveCustomer(customer);
        return customer;
    }

    // --- Restaurants & Menu ---
    public List<Restaurant> getRestaurants() {
        return repository.getAllRestaurants();
    }

    public Restaurant getRestaurant(String id) {
        Restaurant r = repository.getRestaurant(id);
        if (r == null) throw new RestaurantNotFoundException("Restaurant not found: " + id);
        return r;
    }

    public Restaurant addRestaurant(Restaurant restaurant) {
        if (restaurant.getId() == null) {
            restaurant.setId("REST-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        repository.saveRestaurant(restaurant);
        return restaurant;
    }

    public Restaurant updateMenuItemAvailability(String restaurantId, String itemId, boolean available) {
        Restaurant restaurant = getRestaurant(restaurantId);
        MenuItem item = restaurant.getMenuItem(itemId);
        if (item == null) throw new MenuItemNotFoundException("Menu item not found: " + itemId);
        item.setAvailable(available);
        repository.saveRestaurant(restaurant);
        return restaurant;
    }

    public Restaurant addMenuItemToRestaurant(String restaurantId, MenuItem menuItem) {
        Restaurant restaurant = getRestaurant(restaurantId);
        if (menuItem.getId() == null) {
            menuItem.setId("ITEM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        restaurant.addMenuItem(menuItem);
        repository.saveRestaurant(restaurant);
        return restaurant;
    }

    // --- Delivery Agents ---
    public List<DeliveryAgent> getDeliveryAgents() {
        return repository.getAllDeliveryAgents();
    }

    public DeliveryAgent getDeliveryAgent(String id) {
        DeliveryAgent agent = repository.getDeliveryAgent(id);
        if (agent == null) throw new DeliveryAgentNotFoundException("Delivery agent not found: " + id);
        return agent;
    }

    public DeliveryAgent toggleAgentAvailability(String agentId, boolean available) {
        DeliveryAgent agent = getDeliveryAgent(agentId);
        agent.setAvailable(available);
        repository.saveDeliveryAgent(agent);
        return agent;
    }

    // --- Orders Lifecycle ---
    public Order placeOrder(String customerId, String restaurantId, List<OrderItem> items,
                            String deliveryAddress, String paymentMethodStr) {
        Customer customer = getCustomer(customerId);
        Restaurant restaurant = getRestaurant(restaurantId);

        if (!restaurant.isOpen()) {
            throw new IllegalStateException("Restaurant is currently closed.");
        }

        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item.");
        }

        double itemTotal = 0;
        for (OrderItem item : items) {
            MenuItem mi = restaurant.getMenuItem(item.getItemId());
            if (mi == null) {
                throw new MenuItemNotFoundException("Menu item not found: " + item.getItemId());
            }
            if (!mi.isAvailable()) {
                throw new MenuItemUnavailableException("Menu item unavailable: " + item.getName());
            }
            itemTotal += item.getPrice() * item.getQuantity();
        }

        int pendingOrders = (int) repository.getAllOrders().stream()
                .filter(o -> o.getStatus() == OrderStatus.PLACED || o.getStatus() == OrderStatus.PREPARING)
                .count();
        int availableAgents = repository.getAvailableDeliveryAgents().size();

        DeliveryFeeStrategy feeStrategy = DeliveryFeeStrategyFactory.forConditions(itemTotal, pendingOrders, availableAgents);
        double deliveryFee = feeStrategy.computeFee(5.0, itemTotal);
        double tax = Math.round((itemTotal * 0.05) * 100.0) / 100.0;
        double totalAmount = Math.round((itemTotal + deliveryFee + tax) * 100.0) / 100.0;

        PaymentMethod paymentMethod = PaymentMethod.UPI;
        if (paymentMethodStr != null) {
            try {
                paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        String orderId = repository.generateOrderId();
        String paymentId = "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String txnRef = "TXN-" + ThreadLocalRandom.current().nextInt(100000, 999999);

        Payment payment = new Payment(paymentId, orderId, totalAmount, paymentMethod, PaymentStatus.COMPLETED, txnRef);

        // 4-digit OTP for delivery verification
        String otp = String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 9999));

        String addr = (deliveryAddress != null && !deliveryAddress.trim().isEmpty())
                ? deliveryAddress : customer.getDeliveryAddress();

        Order order = new Order(orderId, customer.getId(), customer.getName(), customer.getPhone(), addr,
                restaurant.getId(), restaurant.getName(), items, itemTotal, deliveryFee, tax, totalAmount, payment, otp);
        order.setStatus(OrderStatus.PLACED);

        repository.saveOrder(order);

        // Dispatches real-time notifications
        sendNotification("CUSTOMER", customer.getId(), orderId, "Order placed successfully! OTP: " + otp);
        sendNotification("RESTAURANT", restaurant.getId(), orderId, "New Order received from " + customer.getName());

        return order;
    }

    public Order confirmOrder(String orderId) {
        Order order = getOrder(orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.CONFIRMED)) {
            throw new InvalidOrderTransitionException("Order cannot transition from " + order.getStatus() + " to " + OrderStatus.CONFIRMED);
        }
        order.setStatus(OrderStatus.CONFIRMED);
        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Restaurant accepted your order!");
        return order;
    }

    public Order startPreparingOrder(String orderId) {
        Order order = getOrder(orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.PREPARING)) {
            throw new InvalidOrderTransitionException("Order cannot transition from " + order.getStatus() + " to " + OrderStatus.PREPARING);
        }
        order.setStatus(OrderStatus.PREPARING);
        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Chef is now preparing your food!");
        return order;
    }

    public Order markReadyForPickup(String orderId) {
        Order order = getOrder(orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.READY_FOR_PICKUP)) {
            throw new InvalidOrderTransitionException("Order cannot transition from " + order.getStatus() + " to " + OrderStatus.READY_FOR_PICKUP);
        }

        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        repository.saveOrder(order);

        // Try assigning an available delivery agent
        try {
            DeliveryAgent agent = deliveryAssignmentService.assignAgent(orderId);
            sendNotification("AGENT", agent.getId(), orderId, "New delivery assigned for " + order.getRestaurantName());
            sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Agent " + agent.getName() + " picked up your order and is out for delivery!");
        } catch (NoAgentAvailableException e) {
            sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order ready! Waiting for an available delivery agent.");
        }

        return repository.getOrder(orderId);
    }

    public Order verifyOtpAndDeliver(String orderId, String inputOtp) {
        Order order = getOrder(orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.DELIVERED)) {
            throw new InvalidOrderTransitionException("Cannot deliver order from status: " + order.getStatus());
        }

        if (order.getDeliveryOtp() != null && !order.getDeliveryOtp().equals(inputOtp)) {
            throw new IllegalArgumentException("Invalid delivery OTP. Please verify with customer.");
        }

        order.setStatus(OrderStatus.DELIVERED);
        repository.saveOrder(order);

        // Free up assigned agent
        if (order.getDeliveryAgentId() != null) {
            DeliveryAgent agent = repository.getDeliveryAgent(order.getDeliveryAgentId());
            if (agent != null) {
                agent.incrementDeliveries();
                repository.saveDeliveryAgent(agent);
            }
            deliveryAssignmentService.releaseAgent(order.getDeliveryAgentId());
            sendNotification("AGENT", order.getDeliveryAgentId(), orderId, "Delivery completed successfully!");
        }

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Order delivered! Enjoy your meal!");
        sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order " + orderId + " delivered to customer.");

        return order;
    }

    public Order cancelOrder(String orderId, String reason) {
        Order order = getOrder(orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.CANCELLED)) {
            throw new InvalidOrderTransitionException("Cannot cancel order from status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        if (order.getPayment() != null) {
            order.getPayment().setStatus(PaymentStatus.REFUNDED);
        }

        // Free agent if assigned
        if (order.getDeliveryAgentId() != null) {
            deliveryAssignmentService.releaseAgent(order.getDeliveryAgentId());
        }

        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Order cancelled. Refund processed. Reason: " + (reason != null ? reason : "Customer request"));
        sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order " + orderId + " was cancelled.");
        return order;
    }

    public Order getOrder(String orderId) {
        Order order = repository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Order not found: " + orderId);
        return order;
    }

    public List<Order> getAllOrders() {
        return repository.getAllOrders();
    }

    public List<Order> getCustomerOrders(String customerId) {
        return repository.getOrdersByCustomer(customerId);
    }

    public List<Order> getRestaurantOrders(String restaurantId) {
        return repository.getOrdersByRestaurant(restaurantId);
    }

    public List<Order> getAgentOrders(String agentId) {
        return repository.getOrdersByAgent(agentId);
    }

    // --- Notifications ---
    public void sendNotification(String recipientType, String recipientId, String orderId, String message) {
        String id = "NOTIF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Notification notification = new Notification(id, recipientType, recipientId, orderId, message);
        repository.saveNotification(notification);
    }

    public List<Notification> getNotifications(String recipientId) {
        return repository.getNotificationsForRecipient(recipientId);
    }

    // =========================================================================
    // Simulation Sandbox (/sim/*)
    // =========================================================================

    private void addSimEvent(String type, String actor, String message, Map<String, Object> detail) {
        ZomatoEvent event = new ZomatoEvent(
                simEventSeq.incrementAndGet(),
                type,
                actor,
                message,
                detail != null ? detail : Map.of(),
                Instant.now()
        );
        simEventLog.add(event);
    }

    public void simReset() {
        // Clear and re-seed the sandbox
        ZomatoInitializer.seed(this.simRepository);
        simEventLog.clear();
        addSimEvent("RESET", "SYSTEM", "Sandbox reset to initial seed state", Map.of("status", "RESET_COMPLETE"));
    }

    public Map<String, Object> simState() {
        return Map.of(
                "restaurants", simRepository.getAllRestaurants(),
                "orders", simRepository.getAllOrders(),
                "agents", simRepository.getAllDeliveryAgents()
        );
    }

    public Order simOrder(String customerId, String restaurantId, List<OrderItem> items,
                         String deliveryAddress, String paymentMethodStr) {
        Customer customer = simRepository.getCustomer(customerId != null ? customerId : "CUST-101");
        if (customer == null) customer = simRepository.getAllCustomers().get(0);

        Restaurant restaurant = simRepository.getRestaurant(restaurantId != null ? restaurantId : "REST-01");
        if (restaurant == null) restaurant = simRepository.getAllRestaurants().get(0);

        List<OrderItem> orderItems = (items != null && !items.isEmpty()) ? items : List.of(
                new OrderItem("M101", "Paneer Butter Masala", 260.0, 1),
                new OrderItem("M102", "Garlic Naan", 55.0, 2)
        );

        double itemTotal = orderItems.stream().mapToDouble(i -> i.getPrice() * i.getQuantity()).sum();
        int pendingOrders = (int) simRepository.getAllOrders().stream()
                .filter(o -> o.getStatus() == OrderStatus.PLACED || o.getStatus() == OrderStatus.PREPARING)
                .count();
        int availableAgents = simRepository.getAvailableDeliveryAgents().size();

        DeliveryFeeStrategy feeStrategy = DeliveryFeeStrategyFactory.forConditions(itemTotal, pendingOrders, availableAgents);
        double deliveryFee = feeStrategy.computeFee(5.0, itemTotal);
        double tax = Math.round((itemTotal * 0.05) * 100.0) / 100.0;
        double totalAmount = Math.round((itemTotal + deliveryFee + tax) * 100.0) / 100.0;

        PaymentMethod paymentMethod = PaymentMethod.UPI;
        if (paymentMethodStr != null) {
            try {
                paymentMethod = PaymentMethod.valueOf(paymentMethodStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        String orderId = simRepository.generateOrderId();
        Payment payment = new Payment("SIM-PAY-" + UUID.randomUUID().toString().substring(0, 6),
                orderId, totalAmount, paymentMethod, PaymentStatus.COMPLETED, "TXN-SIM");

        String otp = "1234";
        String addr = deliveryAddress != null ? deliveryAddress : customer.getDeliveryAddress();

        Order order = new Order(orderId, customer.getId(), customer.getName(), customer.getPhone(), addr,
                restaurant.getId(), restaurant.getName(), orderItems, itemTotal, deliveryFee, tax, totalAmount, payment, otp);
        order.setStatus(OrderStatus.PLACED);

        simRepository.saveOrder(order);

        addSimEvent("ORDER_PLACED", customer.getName(),
                "Placed order " + orderId + " (" + feeStrategy.getName() + " fee \u20B9" + deliveryFee + ", total \u20B9" + totalAmount + ")",
                Map.of("orderId", orderId, "total", totalAmount, "strategy", feeStrategy.getName()));

        return order;
    }

    public Order simConfirm(String orderId) {
        Order order = simRepository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Sim order not found: " + orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.CONFIRMED)) {
            throw new InvalidOrderTransitionException("Cannot confirm sim order from status: " + order.getStatus());
        }
        order.setStatus(OrderStatus.CONFIRMED);
        simRepository.saveOrder(order);

        addSimEvent("ORDER_CONFIRMED", order.getRestaurantName(), "Restaurant accepted order " + orderId, Map.of("orderId", orderId));
        return order;
    }

    public Order simPrepare(String orderId) {
        Order order = simRepository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Sim order not found: " + orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.PREPARING)) {
            throw new InvalidOrderTransitionException("Cannot prepare sim order from status: " + order.getStatus());
        }
        order.setStatus(OrderStatus.PREPARING);
        simRepository.saveOrder(order);

        addSimEvent("PREPARING", order.getRestaurantName(), "Kitchen started preparing order " + orderId, Map.of("orderId", orderId));
        return order;
    }

    public Order simReady(String orderId) {
        Order order = simRepository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Sim order not found: " + orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.READY_FOR_PICKUP)) {
            throw new InvalidOrderTransitionException("Cannot mark sim order ready from status: " + order.getStatus());
        }
        order.setStatus(OrderStatus.READY_FOR_PICKUP);
        simRepository.saveOrder(order);

        try {
            DeliveryAgent agent = simDeliveryAssignmentService.assignAgent(orderId);
            addSimEvent("OUT_FOR_DELIVERY", agent.getName(), "Agent " + agent.getName() + " assigned to order " + orderId,
                    Map.of("orderId", orderId, "agentId", agent.getId()));
        } catch (NoAgentAvailableException e) {
            addSimEvent("READY_FOR_PICKUP", order.getRestaurantName(), "Order " + orderId + " is ready, waiting for available agent",
                    Map.of("orderId", orderId));
        }

        return simRepository.getOrder(orderId);
    }

    public Order simDeliver(String orderId, String otp) {
        Order order = simRepository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Sim order not found: " + orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.DELIVERED)) {
            throw new InvalidOrderTransitionException("Cannot deliver sim order from status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.DELIVERED);
        simRepository.saveOrder(order);

        if (order.getDeliveryAgentId() != null) {
            DeliveryAgent agent = simRepository.getDeliveryAgent(order.getDeliveryAgentId());
            if (agent != null) {
                agent.incrementDeliveries();
                simRepository.saveDeliveryAgent(agent);
            }
            simDeliveryAssignmentService.releaseAgent(order.getDeliveryAgentId());
        }

        addSimEvent("DELIVERED", "CUSTOMER", "Order " + orderId + " successfully delivered! OTP verified.",
                Map.of("orderId", orderId));
        return order;
    }

    public Order simCancel(String orderId, String reason) {
        Order order = simRepository.getOrder(orderId);
        if (order == null) throw new OrderNotFoundException("Sim order not found: " + orderId);
        if (!order.getStatus().canTransitionTo(OrderStatus.CANCELLED)) {
            throw new InvalidOrderTransitionException("Cannot cancel sim order from status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        if (order.getPayment() != null) {
            order.getPayment().setStatus(PaymentStatus.REFUNDED);
        }
        if (order.getDeliveryAgentId() != null) {
            simDeliveryAssignmentService.releaseAgent(order.getDeliveryAgentId());
        }
        simRepository.saveOrder(order);

        addSimEvent("CANCELLED", "CUSTOMER", "Order " + orderId + " cancelled. Refund processed.",
                Map.of("orderId", orderId, "reason", reason != null ? reason : "User cancellation"));
        return order;
    }

    public Map<String, Object> simRace(String agentId, int orderCount) {
        int n = Math.max(2, Math.min(orderCount, 12));
        String targetAgentId = agentId != null ? agentId : "AGENT-201";

        // Release target agent in simulation repository so it is available
        simDeliveryAssignmentService.releaseAgent(targetAgentId);

        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        List<Map<String, Object>> results = new CopyOnWriteArrayList<>();

        // Create N orders in READY_FOR_PICKUP state
        List<Order> raceOrders = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            String ordId = "SIM-RACE-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            Order raceOrder = new Order();
            raceOrder.setId(ordId);
            raceOrder.setCustomerId("CUST-101");
            raceOrder.setCustomerName("Customer " + i);
            raceOrder.setRestaurantId("REST-01");
            raceOrder.setRestaurantName("Spice Garden");
            raceOrder.setStatus(OrderStatus.READY_FOR_PICKUP);
            simRepository.saveOrder(raceOrder);
            raceOrders.add(raceOrder);
        }

        try {
            for (int i = 0; i < n; i++) {
                final Order order = raceOrders.get(i);
                final String orderLabel = "Order-" + (i + 1) + " (" + order.getId() + ")";
                pool.submit(() -> {
                    try {
                        start.await();
                        simDeliveryAssignmentService.assign(order.getId(), targetAgentId);
                        results.add(Map.of(
                                "order", orderLabel,
                                "outcome", "WON",
                                "reason", "acquired the lock on " + targetAgentId + " and claimed delivery"
                        ));
                    } catch (NoAgentAvailableException rejected) {
                        results.add(Map.of(
                                "order", orderLabel,
                                "outcome", "REJECTED",
                                "reason", rejected.getMessage()
                        ));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    } finally {
                        done.countDown();
                    }
                });
            }

            start.countDown();
            if (!done.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Race did not settle within 5 seconds");
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Race was interrupted");
        } finally {
            pool.shutdown();
        }

        results.sort(Comparator.comparing(r -> String.valueOf(r.get("order"))));
        String winner = results.stream()
                .filter(r -> "WON".equals(r.get("outcome")))
                .map(r -> String.valueOf(r.get("order")))
                .findFirst()
                .orElse("none");
        long rejected = results.stream().filter(r -> "REJECTED".equals(r.get("outcome"))).count();

        addSimEvent("RACE", winner,
                n + " orders contended for agent " + targetAgentId + " \u2014 " + winner + " won, " + rejected + " rejected",
                Map.of("agentId", targetAgentId, "attempts", n, "winner", winner, "rejected", rejected));

        return Map.of(
                "agentId", targetAgentId,
                "attempts", n,
                "winner", winner,
                "rejected", rejected,
                "results", results
        );
    }

    public List<ZomatoEvent> simEvents() {
        return new ArrayList<>(simEventLog);
    }
}
