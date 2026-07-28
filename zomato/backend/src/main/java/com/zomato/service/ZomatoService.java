package com.zomato.service;

import com.zomato.model.*;
import com.zomato.repository.ZomatoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ZomatoService {

    private final ZomatoRepository repository;

    public ZomatoService(ZomatoRepository repository) {
        this.repository = repository;
    }

    public List<Restaurant> getRestaurants() {
        return repository.getAllRestaurants();
    }

    public Restaurant getRestaurant(String id) {
        Restaurant r = repository.getRestaurant(id);
        if (r == null) throw new IllegalArgumentException("Restaurant not found: " + id);
        return r;
    }

    public Order placeOrder(String restaurantId, String userId, List<OrderItem> items) {
        Restaurant restaurant = getRestaurant(restaurantId);

        double total = 0;
        for (OrderItem item : items) {
            total += item.getPrice() * item.getQuantity();
        }

        String orderId = repository.generateOrderId();
        Order order = new Order(orderId, userId, restaurantId, restaurant.getName(), items, total);
        repository.saveOrder(order);

        assignDeliveryPartner(order);

        return order;
    }

    private void assignDeliveryPartner(Order order) {
        List<DeliveryPartner> available = repository.getAvailablePartners();
        if (!available.isEmpty()) {
            DeliveryPartner partner = available.get(0);
            partner.setAvailable(false);
            order.setDeliveryPartnerId(partner.getId());
            order.setDeliveryPartnerName(partner.getName());
        }
    }

    public Order getOrder(String orderId) {
        Order order = repository.getOrder(orderId);
        if (order == null) throw new IllegalArgumentException("Order not found: " + orderId);
        return order;
    }

    public List<Order> getUserOrders(String userId) {
        return repository.getOrdersByUser(userId);
    }

    public Order updateOrderStatus(String orderId, String statusStr) {
        Order order = getOrder(orderId);
        OrderStatus status = OrderStatus.valueOf(statusStr.toUpperCase());
        order.setStatus(status);

        if (status == OrderStatus.DELIVERED) {
            String partnerId = order.getDeliveryPartnerId();
            if (partnerId != null) {
                DeliveryPartner partner = repository.getPartner(partnerId);
                if (partner != null) partner.setAvailable(true);
            }
        }

        repository.updateOrder(order);
        return order;
    }
}
