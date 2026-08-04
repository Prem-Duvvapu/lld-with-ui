package com.lld.zomato.repository;

import com.lld.zomato.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class ZomatoRepository {

    private final Map<String, Customer> customers = new ConcurrentHashMap<>();
    private final Map<String, Restaurant> restaurants = new ConcurrentHashMap<>();
    private final Map<String, DeliveryAgent> deliveryAgents = new ConcurrentHashMap<>();
    private final Map<String, Order> orders = new ConcurrentHashMap<>();
    private final List<Notification> notifications = Collections.synchronizedList(new ArrayList<>());
    
    private final AtomicInteger orderCounter = new AtomicInteger(100);
    private final ReentrantLock lock = new ReentrantLock();

    public void saveCustomer(Customer customer) {
        customers.put(customer.getId(), customer);
    }

    public Customer getCustomer(String id) {
        return customers.get(id);
    }

    public List<Customer> getAllCustomers() {
        return new ArrayList<>(customers.values());
    }

    public void saveRestaurant(Restaurant restaurant) {
        restaurants.put(restaurant.getId(), restaurant);
    }

    public Restaurant getRestaurant(String id) {
        return restaurants.get(id);
    }

    public List<Restaurant> getAllRestaurants() {
        return new ArrayList<>(restaurants.values());
    }

    public void saveDeliveryAgent(DeliveryAgent agent) {
        deliveryAgents.put(agent.getId(), agent);
    }

    public DeliveryAgent getDeliveryAgent(String id) {
        return deliveryAgents.get(id);
    }

    public List<DeliveryAgent> getAllDeliveryAgents() {
        return new ArrayList<>(deliveryAgents.values());
    }

    public List<DeliveryAgent> getAvailableDeliveryAgents() {
        return deliveryAgents.values().stream()
                .filter(DeliveryAgent::isAvailable)
                .collect(Collectors.toList());
    }

    public String generateOrderId() {
        return "ORD-" + orderCounter.incrementAndGet();
    }

    public void saveOrder(Order order) {
        lock.lock();
        try {
            orders.put(order.getId(), order);
        } finally {
            lock.unlock();
        }
    }

    public Order getOrder(String id) {
        return orders.get(id);
    }

    public List<Order> getAllOrders() {
        return orders.values().stream()
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Order> getOrdersByCustomer(String customerId) {
        return orders.values().stream()
                .filter(o -> customerId.equals(o.getCustomerId()))
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Order> getOrdersByRestaurant(String restaurantId) {
        return orders.values().stream()
                .filter(o -> restaurantId.equals(o.getRestaurantId()))
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<Order> getOrdersByAgent(String agentId) {
        return orders.values().stream()
                .filter(o -> agentId.equals(o.getDeliveryAgentId()))
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public void saveNotification(Notification notification) {
        notifications.add(notification);
    }

    public List<Notification> getNotificationsForRecipient(String recipientId) {
        return notifications.stream()
                .filter(n -> recipientId == null || recipientId.equalsIgnoreCase("ALL") || recipientId.equals(n.getRecipientId()))
                .sorted(Comparator.comparing(Notification::getTimestamp).reversed())
                .collect(Collectors.toList());
    }
}
