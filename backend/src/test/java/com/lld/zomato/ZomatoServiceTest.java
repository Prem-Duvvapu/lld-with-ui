package com.lld.zomato;

import com.lld.zomato.model.*;
import com.lld.zomato.repository.ZomatoRepository;
import com.lld.zomato.service.ZomatoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ZomatoServiceTest {

    private ZomatoRepository repository;
    private ZomatoService service;

    @BeforeEach
    void setUp() {
        repository = new ZomatoRepository();
        service = new ZomatoService(repository);

        // Seed customer
        service.registerCustomer("Test Customer", "test@example.com", "9999999999", "123 Test St");

        // Seed delivery agent
        DeliveryAgent agent = new DeliveryAgent("AGENT-1", "Speedy Agent", "8888888888", "KA-01-1234", true);
        repository.saveDeliveryAgent(agent);

        // Seed restaurant
        List<MenuItem> menu = new ArrayList<>();
        menu.add(new MenuItem("ITEM-1", "Test Burger", "Delicious burger", 150.0, "Burgers", false, true));
        menu.add(new MenuItem("ITEM-2", "Test Fries", "Crispy fries", 80.0, "Sides", true, true));
        Restaurant restaurant = new Restaurant("REST-1", "Test Kitchen", "456 Market St", "Fast Food", 4.5, menu);
        repository.saveRestaurant(restaurant);
    }

    @Test
    void testPlaceOrder() {
        List<Customer> customers = service.getCustomers();
        assertFalse(customers.isEmpty());
        Customer c = customers.get(0);

        List<OrderItem> items = new ArrayList<>();
        items.add(new OrderItem("ITEM-1", "Test Burger", 150.0, 2));

        Order order = service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "UPI");

        assertNotNull(order);
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertEquals(300.0, order.getItemTotal());
        assertNotNull(order.getDeliveryOtp());
        assertEquals(4, order.getDeliveryOtp().length());
    }

    @Test
    void testOrderLifecycleToDelivery() {
        Customer c = service.getCustomers().get(0);
        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        Order order = service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "CARD");

        // Confirm
        order = service.confirmOrder(order.getId());
        assertEquals(OrderStatus.CONFIRMED, order.getStatus());

        // Prepare
        order = service.startPreparingOrder(order.getId());
        assertEquals(OrderStatus.PREPARING, order.getStatus());

        // Ready for Pickup (Auto assigns agent)
        order = service.markReadyForPickup(order.getId());
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, order.getStatus());
        assertNotNull(order.getDeliveryAgentId());

        // Verify OTP and deliver
        String otp = order.getDeliveryOtp();
        order = service.verifyOtpAndDeliver(order.getId(), otp);
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
    }

    @Test
    void testCancelOrder() {
        Customer c = service.getCustomers().get(0);
        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        Order order = service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "UPI");

        order = service.cancelOrder(order.getId(), "Changed my mind");
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(PaymentStatus.REFUNDED, order.getPayment().getStatus());
    }
}
