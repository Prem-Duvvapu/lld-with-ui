package com.lld.zomato.repository;

import com.lld.zomato.model.DeliveryPartner;
import com.lld.zomato.model.Order;
import com.lld.zomato.model.Restaurant;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class ZomatoRepository {

    private final Map<String, Restaurant> restaurants = new LinkedHashMap<>();
    private final Map<String, Order> orders = new ConcurrentHashMap<>();
    private final Map<String, DeliveryPartner> deliveryPartners = new LinkedHashMap<>();
    private int orderCounter = 0;

    public void addRestaurant(Restaurant restaurant) {
        restaurants.put(restaurant.getId(), restaurant);
    }

    public List<Restaurant> getAllRestaurants() {
        return new ArrayList<>(restaurants.values());
    }

    public Restaurant getRestaurant(String id) {
        return restaurants.get(id);
    }

    public void addDeliveryPartner(DeliveryPartner partner) {
        deliveryPartners.put(partner.getId(), partner);
    }

    public List<DeliveryPartner> getAvailablePartners() {
        return deliveryPartners.values().stream()
                .filter(DeliveryPartner::isAvailable)
                .toList();
    }

    public DeliveryPartner getPartner(String id) {
        return deliveryPartners.get(id);
    }

    public String generateOrderId() {
        orderCounter++;
        return "ORD-" + String.format("%05d", orderCounter);
    }

    public void saveOrder(Order order) {
        orders.put(order.getId(), order);
    }

    public Order getOrder(String id) {
        return orders.get(id);
    }

    public List<Order> getOrdersByUser(String userId) {
        return orders.values().stream()
                .filter(o -> o.getUserId().equals(userId))
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();
    }

    public void updateOrder(Order order) {
        orders.put(order.getId(), order);
    }
}
