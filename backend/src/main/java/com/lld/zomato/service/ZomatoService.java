package com.lld.zomato.service;

import com.lld.zomato.model.*;
import com.lld.zomato.repository.ZomatoRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ZomatoService {

    private final ZomatoRepository repository;

    public ZomatoService(ZomatoRepository repository) {
        this.repository = repository;
    }

    // --- Customers ---
    public List<Customer> getCustomers() {
        return repository.getAllCustomers();
    }

    public Customer getCustomer(String id) {
        Customer c = repository.getCustomer(id);
        if (c == null) throw new IllegalArgumentException("Customer not found: " + id);
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
        if (r == null) throw new IllegalArgumentException("Restaurant not found: " + id);
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
        if (item == null) throw new IllegalArgumentException("Menu item not found: " + itemId);
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
        if (agent == null) throw new IllegalArgumentException("Delivery agent not found: " + id);
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
            if (mi == null || !mi.isAvailable()) {
                throw new IllegalStateException("Menu item unavailable: " + item.getName());
            }
            itemTotal += item.getPrice() * item.getQuantity();
        }

        double deliveryFee = 35.0;
        double tax = Math.round((itemTotal * 0.05) * 100.0) / 100.0;
        double totalAmount = itemTotal + deliveryFee + tax;

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

        repository.saveOrder(order);

        // Dispatches real-time notifications
        sendNotification("CUSTOMER", customer.getId(), orderId, "Order placed successfully! OTP: " + otp);
        sendNotification("RESTAURANT", restaurant.getId(), orderId, "New Order received from " + customer.getName());

        return order;
    }

    public Order confirmOrder(String orderId) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new IllegalStateException("Order cannot be confirmed from status: " + order.getStatus());
        }
        order.setStatus(OrderStatus.CONFIRMED);
        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Restaurant accepted your order!");
        return order;
    }

    public Order startPreparingOrder(String orderId) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.CONFIRMED) {
            throw new IllegalStateException("Order cannot start preparing from status: " + order.getStatus());
        }
        order.setStatus(OrderStatus.PREPARING);
        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Chef is now preparing your food!");
        return order;
    }

    public Order markReadyForPickup(String orderId) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new IllegalStateException("Order cannot be ready for pickup from status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.READY_FOR_PICKUP);

        // Try assigning an available delivery agent
        List<DeliveryAgent> availableAgents = repository.getAvailableDeliveryAgents();
        if (!availableAgents.isEmpty()) {
            DeliveryAgent agent = availableAgents.get(0);
            agent.setAvailable(false);
            repository.saveDeliveryAgent(agent);

            order.setDeliveryAgentId(agent.getId());
            order.setDeliveryAgentName(agent.getName());
            order.setDeliveryAgentPhone(agent.getPhone());
            order.setStatus(OrderStatus.OUT_FOR_DELIVERY);

            sendNotification("AGENT", agent.getId(), orderId, "New delivery assigned for " + order.getRestaurantName());
            sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Agent " + agent.getName() + " picked up your order and is out for delivery!");
        } else {
            sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order ready! Waiting for an available delivery agent.");
        }

        repository.saveOrder(order);
        return order;
    }

    public Order verifyOtpAndDeliver(String orderId, String inputOtp) {
        Order order = getOrder(orderId);
        if (order.getStatus() != OrderStatus.OUT_FOR_DELIVERY) {
            throw new IllegalStateException("Order is not currently out for delivery.");
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
                agent.setAvailable(true);
                agent.incrementDeliveries();
                repository.saveDeliveryAgent(agent);
                sendNotification("AGENT", agent.getId(), orderId, "Delivery completed successfully!");
            }
        }

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Order delivered! Enjoy your meal!");
        sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order " + orderId + " delivered to customer.");

        return order;
    }

    public Order cancelOrder(String orderId, String reason) {
        Order order = getOrder(orderId);
        if (order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.OUT_FOR_DELIVERY) {
            throw new IllegalStateException("Cannot cancel order once it is out for delivery or delivered.");
        }

        order.setStatus(OrderStatus.CANCELLED);
        if (order.getPayment() != null) {
            order.getPayment().setStatus(PaymentStatus.REFUNDED);
        }

        // Free agent if assigned
        if (order.getDeliveryAgentId() != null) {
            DeliveryAgent agent = repository.getDeliveryAgent(order.getDeliveryAgentId());
            if (agent != null) {
                agent.setAvailable(true);
                repository.saveDeliveryAgent(agent);
            }
        }

        repository.saveOrder(order);

        sendNotification("CUSTOMER", order.getCustomerId(), orderId, "Order cancelled. Refund processed. Reason: " + (reason != null ? reason : "Customer request"));
        sendNotification("RESTAURANT", order.getRestaurantId(), orderId, "Order " + orderId + " was cancelled.");
        return order;
    }

    public Order getOrder(String orderId) {
        Order order = repository.getOrder(orderId);
        if (order == null) throw new IllegalArgumentException("Order not found: " + orderId);
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
}
