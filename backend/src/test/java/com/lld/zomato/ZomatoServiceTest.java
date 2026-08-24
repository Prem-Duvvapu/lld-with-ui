package com.lld.zomato;

import com.lld.zomato.exception.*;
import com.lld.zomato.model.*;
import com.lld.zomato.repository.ZomatoRepository;
import com.lld.zomato.service.DeliveryAssignmentService;
import com.lld.zomato.service.ZomatoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Zomato Service — full lifecycle and edge cases")
class ZomatoServiceTest {

    private ZomatoRepository repository;
    private DeliveryAssignmentService assignmentService;
    private ZomatoService service;

    @BeforeEach
    void setUp() {
        repository = new ZomatoRepository();
        assignmentService = new DeliveryAssignmentService(repository);
        service = new ZomatoService(repository, assignmentService);

        // Seed customer
        service.registerCustomer("Test Customer", "test@example.com", "9999999999", "123 Test St");

        // Seed delivery agent
        DeliveryAgent agent = new DeliveryAgent("AGENT-1", "Speedy Agent", "8888888888", "KA-01-1234", true);
        repository.saveDeliveryAgent(agent);

        // Seed restaurant
        List<MenuItem> menu = new ArrayList<>();
        menu.add(new MenuItem("ITEM-1", "Test Burger", "Delicious burger", 150.0, "Burgers", false, true));
        menu.add(new MenuItem("ITEM-2", "Test Fries", "Crispy fries", 80.0, "Sides", true, true));
        Restaurant restaurant = new Restaurant("REST-1", "Test Kitchen", "456 Market St", "Fast Food", 4.5, true, menu);
        repository.saveRestaurant(restaurant);
    }

    // ---- 3 Original tests preserved ----

    @Test
    @DisplayName("Original test: place order creates order with subtotal and OTP")
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
    @DisplayName("Original test: complete order lifecycle through to delivery")
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
    @DisplayName("Original test: cancel order transitions to CANCELLED and marks payment REFUNDED")
    void testCancelOrder() {
        Customer c = service.getCustomers().get(0);
        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        Order order = service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "UPI");

        order = service.cancelOrder(order.getId(), "Changed my mind");
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        assertEquals(PaymentStatus.REFUNDED, order.getPayment().getStatus());
    }

    // ---- Expanded Tests ----

    @Test
    @DisplayName("Place order on unknown customer throws CustomerNotFoundException")
    void placeOrderUnknownCustomerThrows() {
        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        assertThrows(CustomerNotFoundException.class, () ->
                service.placeOrder("CUST-999", "REST-1", items, "123 Test St", "UPI"));
    }

    @Test
    @DisplayName("Place order on unknown restaurant throws RestaurantNotFoundException")
    void placeOrderUnknownRestaurantThrows() {
        Customer c = service.getCustomers().get(0);
        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        assertThrows(RestaurantNotFoundException.class, () ->
                service.placeOrder(c.getId(), "REST-999", items, "123 Test St", "UPI"));
    }

    @Test
    @DisplayName("Place order with unknown menu item throws MenuItemNotFoundException")
    void placeOrderUnknownMenuItemThrows() {
        Customer c = service.getCustomers().get(0);
        List<OrderItem> items = List.of(new OrderItem("ITEM-999", "Ghost Burger", 150.0, 1));
        assertThrows(MenuItemNotFoundException.class, () ->
                service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "UPI"));
    }

    @Test
    @DisplayName("Place order with unavailable menu item throws MenuItemUnavailableException")
    void placeOrderUnavailableMenuItemThrows() {
        Customer c = service.getCustomers().get(0);
        service.updateMenuItemAvailability("REST-1", "ITEM-1", false);

        List<OrderItem> items = List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1));
        assertThrows(MenuItemUnavailableException.class, () ->
                service.placeOrder(c.getId(), "REST-1", items, "123 Test St", "UPI"));
    }

    @Test
    @DisplayName("Place order with empty or null items throws IllegalArgumentException")
    void placeOrderEmptyItemsThrows() {
        Customer c = service.getCustomers().get(0);
        assertThrows(IllegalArgumentException.class, () ->
                service.placeOrder(c.getId(), "REST-1", List.of(), "123 Test St", "UPI"));
        assertThrows(IllegalArgumentException.class, () ->
                service.placeOrder(c.getId(), "REST-1", null, "123 Test St", "UPI"));
    }

    @Test
    @DisplayName("Get order for unknown ID throws OrderNotFoundException")
    void getOrderUnknownThrows() {
        assertThrows(OrderNotFoundException.class, () -> service.getOrder("ORD-99999"));
    }

    @Test
    @DisplayName("Get customer for unknown ID throws CustomerNotFoundException")
    void getCustomerUnknownThrows() {
        assertThrows(CustomerNotFoundException.class, () -> service.getCustomer("CUST-99999"));
    }

    @Test
    @DisplayName("Get restaurant for unknown ID throws RestaurantNotFoundException")
    void getRestaurantUnknownThrows() {
        assertThrows(RestaurantNotFoundException.class, () -> service.getRestaurant("REST-99999"));
    }

    @Test
    @DisplayName("Get delivery agent for unknown ID throws DeliveryAgentNotFoundException")
    void getDeliveryAgentUnknownThrows() {
        assertThrows(DeliveryAgentNotFoundException.class, () -> service.getDeliveryAgent("AGENT-99999"));
    }

    @Test
    @DisplayName("Confirm order from non-PLACED status throws InvalidOrderTransitionException")
    void confirmOrderInvalidTransitionThrows() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());

        // Cannot confirm an already confirmed order
        assertThrows(InvalidOrderTransitionException.class, () -> service.confirmOrder(order.getId()));
    }

    @Test
    @DisplayName("Start preparing order from non-CONFIRMED status throws InvalidOrderTransitionException")
    void startPreparingInvalidTransitionThrows() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");

        // Cannot prepare directly from PLACED
        assertThrows(InvalidOrderTransitionException.class, () -> service.startPreparingOrder(order.getId()));
    }

    @Test
    @DisplayName("Mark ready for pickup when no agent is available leaves order in READY_FOR_PICKUP")
    void markReadyNoAgentAvailable() {
        // Toggle the only agent to unavailable
        service.toggleAgentAvailability("AGENT-1", false);

        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());

        Order readyOrder = service.markReadyForPickup(order.getId());
        assertEquals(OrderStatus.READY_FOR_PICKUP, readyOrder.getStatus());
        assertNull(readyOrder.getDeliveryAgentId());
    }

    @Test
    @DisplayName("Deliver order with incorrect OTP throws IllegalArgumentException")
    void deliverOrderWrongOtpThrows() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());
        service.markReadyForPickup(order.getId());

        assertThrows(IllegalArgumentException.class, () -> service.verifyOtpAndDeliver(order.getId(), "0000"));
    }

    @Test
    @DisplayName("Delivery completion releases agent back to pool and increments delivery count")
    void deliveryCompletionReleasesAgent() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());
        order = service.markReadyForPickup(order.getId());

        String agentId = order.getDeliveryAgentId();
        assertNotNull(agentId);
        assertFalse(repository.getDeliveryAgent(agentId).isAvailable());

        service.verifyOtpAndDeliver(order.getId(), order.getDeliveryOtp());

        DeliveryAgent agent = repository.getDeliveryAgent(agentId);
        assertTrue(agent.isAvailable(), "Agent must be returned to available pool");
        assertEquals(1, agent.getTotalDeliveries(), "Total deliveries must increment");
    }

    @Test
    @DisplayName("Cancel order from OUT_FOR_DELIVERY is rejected with InvalidOrderTransitionException")
    void cancelFromOutForDeliveryRejected() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());
        service.markReadyForPickup(order.getId());

        // Order is now OUT_FOR_DELIVERY
        assertThrows(InvalidOrderTransitionException.class, () -> service.cancelOrder(order.getId(), "Too late"));
    }

    @Test
    @DisplayName("Cancel order from DELIVERED is rejected with InvalidOrderTransitionException")
    void cancelFromDeliveredRejected() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());
        Order delivered = service.markReadyForPickup(order.getId());
        service.verifyOtpAndDeliver(delivered.getId(), delivered.getDeliveryOtp());

        assertThrows(InvalidOrderTransitionException.class, () -> service.cancelOrder(delivered.getId(), "Food eaten"));
    }

    @Test
    @DisplayName("Cancel from CONFIRMED and PREPARING succeeds and refunds payment")
    void cancelFromConfirmedAndPreparing() {
        Customer c = service.getCustomers().get(0);
        Order o1 = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(o1.getId());
        Order cancelled1 = service.cancelOrder(o1.getId(), "Cancel confirmed");
        assertEquals(OrderStatus.CANCELLED, cancelled1.getStatus());
        assertEquals(PaymentStatus.REFUNDED, cancelled1.getPayment().getStatus());

        Order o2 = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(o2.getId());
        service.startPreparingOrder(o2.getId());
        Order cancelled2 = service.cancelOrder(o2.getId(), "Cancel preparing");
        assertEquals(OrderStatus.CANCELLED, cancelled2.getStatus());
        assertEquals(PaymentStatus.REFUNDED, cancelled2.getPayment().getStatus());
    }

    @Test
    @DisplayName("Notifications are dispatched on order lifecycle events")
    void notificationsDispatched() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");

        List<Notification> customerNotifs = service.getNotifications(c.getId());
        assertFalse(customerNotifs.isEmpty());
        assertTrue(customerNotifs.stream().anyMatch(n -> n.getMessage().contains("Order placed")));

        List<Notification> restaurantNotifs = service.getNotifications("REST-1");
        assertFalse(restaurantNotifs.isEmpty());
    }

    @Test
    @DisplayName("Add menu item to restaurant updates menu list")
    void addMenuItemToRestaurant() {
        MenuItem newItem = new MenuItem(null, "New Shake", "Chocolate shake", 120.0, "Beverages", true, true);
        Restaurant r = service.addMenuItemToRestaurant("REST-1", newItem);
        assertNotNull(r.getMenuItem(newItem.getId()));
    }

    @Test
    @DisplayName("Filter orders by customer, restaurant, and agent")
    void filterOrders() {
        Customer c = service.getCustomers().get(0);
        Order order = service.placeOrder(c.getId(), "REST-1", List.of(new OrderItem("ITEM-1", "Test Burger", 150.0, 1)), "123 Test St", "UPI");
        service.confirmOrder(order.getId());
        service.startPreparingOrder(order.getId());
        service.markReadyForPickup(order.getId());

        assertEquals(1, service.getCustomerOrders(c.getId()).size());
        assertEquals(1, service.getRestaurantOrders("REST-1").size());
        assertEquals(1, service.getAgentOrders("AGENT-1").size());
        assertEquals(1, service.getAllOrders().size());
    }
}
