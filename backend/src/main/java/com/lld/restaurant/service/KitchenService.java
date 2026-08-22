package com.lld.restaurant.service;

import com.lld.restaurant.exception.InvalidOrderTransitionException;
import com.lld.restaurant.exception.OrderNotFoundException;
import com.lld.restaurant.model.Order;
import com.lld.restaurant.model.OrderStatus;
import com.lld.restaurant.repository.RestaurantRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class KitchenService {

    private final RestaurantRepository repository;

    public KitchenService(RestaurantRepository repository) {
        this.repository = repository;
    }

    public List<Order> pendingOrders() {
        return repository.findAllOrders().stream()
                .filter(o -> o.getStatus() == OrderStatus.PLACED || o.getStatus() == OrderStatus.PREPARING)
                .sorted(Comparator.comparing(Order::getCreatedAt))
                .collect(Collectors.toList());
    }

    public Order startPreparation(String orderId) {
        return transition(orderId, OrderStatus.PREPARING);
    }

    public Order markReady(String orderId) {
        return transition(orderId, OrderStatus.READY);
    }

    public Order markServed(String orderId) {
        return transition(orderId, OrderStatus.SERVED);
    }

    private Order transition(String orderId, OrderStatus targetStatus) {
        Order order = repository.findOrderById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));

        if (!order.getStatus().canTransitionTo(targetStatus)) {
            throw new InvalidOrderTransitionException(
                    "Cannot transition order " + orderId + " from " + order.getStatus() + " to " + targetStatus
            );
        }

        order.setStatus(targetStatus);
        return repository.saveOrder(order);
    }
}
