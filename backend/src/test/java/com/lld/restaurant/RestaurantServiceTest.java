package com.lld.restaurant;

import com.lld.restaurant.exception.*;
import com.lld.restaurant.model.*;
import com.lld.restaurant.repository.RestaurantRepository;
import com.lld.restaurant.service.KitchenService;
import com.lld.restaurant.service.RestaurantService;
import com.lld.restaurant.service.TableAllocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-end lifecycle tests for RestaurantService. Exercises the full
 * seat → order → prepare → serve → bill → pay path, plus every documented
 * rejection path.
 */
@DisplayName("Restaurant Service — full lifecycle")
class RestaurantServiceTest {

    private RestaurantRepository repository;
    private RestaurantService service;
    private KitchenService kitchenService;
    private TableAllocationService tableAllocationService;

    @BeforeEach
    void setUp() {
        repository = new RestaurantRepository();
        tableAllocationService = new TableAllocationService(repository);
        kitchenService = new KitchenService(repository);
        service = new RestaurantService(repository, tableAllocationService, kitchenService);
    }

    // ---- Helper ----

    private List<OrderLineRequest> defaultLines() {
        return List.of(new OrderLineRequest("M-001", 2), new OrderLineRequest("M-004", 1));
    }

    private Order seatAndOrder(String tableId, int partySize) {
        service.seatGuests(tableId, partySize);
        return service.placeOrder(tableId, "Rahul", defaultLines(), null);
    }

    // ---- Seating ----

    @Test
    @DisplayName("Seating marks table OCCUPIED")
    void seatGuestsMarksOccupied() {
        RestaurantTable t = service.seatGuests("T1", 2);
        assertEquals(TableStatus.OCCUPIED, t.getStatus());
    }

    @Test
    @DisplayName("Seating unknown table → TableNotFoundException")
    void seatUnknownTableThrows() {
        assertThrows(TableNotFoundException.class, () -> service.seatGuests("T99", 2));
    }

    @Test
    @DisplayName("Seating party larger than capacity → TableUnavailableException")
    void seatPartyTooLargeThrows() {
        assertThrows(TableUnavailableException.class, () -> service.seatGuests("T1", 5));
    }

    @Test
    @DisplayName("Seating at an already-occupied table → TableUnavailableException")
    void seatAlreadyOccupiedThrows() {
        service.seatGuests("T1", 2);
        assertThrows(TableUnavailableException.class, () -> service.seatGuests("T1", 2));
    }

    // ---- Ordering ----

    @Test
    @DisplayName("Placing order on AVAILABLE table is rejected")
    void orderOnAvailableTableRejected() {
        assertThrows(TableUnavailableException.class, () ->
                service.placeOrder("T1", "Rahul", defaultLines(), null));
    }

    @Test
    @DisplayName("Placing order with empty lines is rejected")
    void orderEmptyLinesRejected() {
        service.seatGuests("T1", 2);
        assertThrows(IllegalArgumentException.class, () ->
                service.placeOrder("T1", "Rahul", List.of(), null));
    }

    @Test
    @DisplayName("Placing order with null lines is rejected")
    void orderNullLinesRejected() {
        service.seatGuests("T1", 2);
        assertThrows(IllegalArgumentException.class, () ->
                service.placeOrder("T1", "Rahul", null, null));
    }

    @Test
    @DisplayName("Placing order with unknown menu item → MenuItemNotFoundException")
    void orderUnknownMenuItemRejected() {
        service.seatGuests("T1", 2);
        assertThrows(MenuItemNotFoundException.class, () ->
                service.placeOrder("T1", "Rahul", List.of(new OrderLineRequest("M-999", 1)), null));
    }

    @Test
    @DisplayName("Placing order with unavailable menu item → MenuItemUnavailableException")
    void orderUnavailableMenuItemRejected() {
        service.seatGuests("T1", 2);
        // Make an item unavailable
        MenuItem item = repository.findMenuItemById("M-001").orElseThrow();
        item.setAvailable(false);
        repository.saveMenuItem(item);

        assertThrows(MenuItemUnavailableException.class, () ->
                service.placeOrder("T1", "Rahul", List.of(new OrderLineRequest("M-001", 1)), null));
    }

    @Test
    @DisplayName("Placing order with quantity 0 is rejected")
    void orderQuantityZeroRejected() {
        service.seatGuests("T1", 2);
        assertThrows(IllegalArgumentException.class, () ->
                service.placeOrder("T1", "Rahul", List.of(new OrderLineRequest("M-001", 0)), null));
    }

    @Test
    @DisplayName("Order starts in PLACED status with a valid id format")
    void orderStartsPlaced() {
        Order order = seatAndOrder("T1", 2);
        assertEquals(OrderStatus.PLACED, order.getStatus());
        assertTrue(order.getId().startsWith("ORD-"), "id format wrong: " + order.getId());
        assertEquals("ORD-00001", order.getId());
    }

    @Test
    @DisplayName("Order computes subtotal from item prices * quantities")
    void orderComputesSubtotal() {
        Order order = seatAndOrder("T1", 2);
        // M-001 (Paneer Tikka) = 240.0 * 2 = 480.0; M-004 (Butter Chicken) = 380.0 * 1 = 380.0
        assertEquals(860.0, order.getSubtotal(), 0.001);
    }

    // ---- Kitchen workflow ----

    @Test
    @DisplayName("Kitchen: PLACED → PREPARING → READY → SERVED is legal")
    void kitchenHappyPath() {
        Order order = seatAndOrder("T2", 3);
        Order preparing = kitchenService.startPreparation(order.getId());
        assertEquals(OrderStatus.PREPARING, preparing.getStatus());

        Order ready = kitchenService.markReady(order.getId());
        assertEquals(OrderStatus.READY, ready.getStatus());

        Order served = kitchenService.markServed(order.getId());
        assertEquals(OrderStatus.SERVED, served.getStatus());
    }

    @Test
    @DisplayName("Kitchen: cannot prepare a SERVED order")
    void kitchenCannotPrepareServed() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());
        assertThrows(InvalidOrderTransitionException.class,
                () -> kitchenService.startPreparation(order.getId()));
    }

    @Test
    @DisplayName("Kitchen pending orders returns only PLACED and PREPARING")
    void kitchenPendingOrders() {
        Order o1 = seatAndOrder("T1", 2);
        Order o2 = seatAndOrder("T2", 3);
        kitchenService.startPreparation(o1.getId());

        List<Order> pending = kitchenService.pendingOrders();
        assertEquals(2, pending.size());
    }

    // ---- Cancellation ----

    @Test
    @DisplayName("Cancel is legal from PLACED")
    void cancelFromPlaced() {
        Order order = seatAndOrder("T1", 2);
        Order cancelled = service.cancelOrder(order.getId());
        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    @DisplayName("Cancel is legal from PREPARING")
    void cancelFromPreparing() {
        Order order = seatAndOrder("T1", 2);
        kitchenService.startPreparation(order.getId());
        Order cancelled = service.cancelOrder(order.getId());
        assertEquals(OrderStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    @DisplayName("Cancel from SERVED is rejected")
    void cancelFromServedRejected() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());
        assertThrows(InvalidOrderTransitionException.class, () -> service.cancelOrder(order.getId()));
    }

    // ---- Billing ----

    @Test
    @DisplayName("Bill generation only from SERVED")
    void billOnlyFromServed() {
        Order order = seatAndOrder("T2", 3);
        assertThrows(InvalidOrderTransitionException.class, () -> service.generateBill(order.getId()));
    }

    @Test
    @DisplayName("Bill id format is BILL-00001")
    void billIdFormat() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());

        Bill bill = service.generateBill(order.getId());
        assertEquals("BILL-00001", bill.getId());
        assertFalse(bill.isPaid());
        assertTrue(bill.getTotal() > 0);
    }

    @Test
    @DisplayName("Bill moves order to BILLED status")
    void billMovesOrderToBilled() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());
        service.generateBill(order.getId());

        Order updated = service.getOrder(order.getId());
        assertEquals(OrderStatus.BILLED, updated.getStatus());
    }

    // ---- Payment ----

    @Test
    @DisplayName("Payment marks bill paid and releases table to AVAILABLE")
    void paymentReleaseTable() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());
        Bill bill = service.generateBill(order.getId());

        Payment payment = service.payBill(bill.getId(), PaymentMethod.CARD);
        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertEquals("PAY-00001", payment.getId());

        // Table released
        RestaurantTable table = repository.findTableById("T2").orElseThrow();
        assertEquals(TableStatus.AVAILABLE, table.getStatus());
    }

    @Test
    @DisplayName("Double payment → BillAlreadyPaidException")
    void doublePaymentRejected() {
        Order order = seatAndOrder("T2", 3);
        kitchenService.startPreparation(order.getId());
        kitchenService.markReady(order.getId());
        kitchenService.markServed(order.getId());
        Bill bill = service.generateBill(order.getId());

        service.payBill(bill.getId(), PaymentMethod.CASH);
        assertThrows(BillAlreadyPaidException.class,
                () -> service.payBill(bill.getId(), PaymentMethod.CARD));
    }

    // ---- Order history ----

    @Test
    @DisplayName("Order history is scoped per table")
    void orderHistoryPerTable() {
        seatAndOrder("T1", 2);
        seatAndOrder("T2", 3);
        seatAndOrder("T3", 4);

        List<Order> t1Orders = service.getOrdersForTable("T1");
        assertEquals(1, t1Orders.size());
        assertEquals("T1", t1Orders.get(0).getTableId());
    }

    @Test
    @DisplayName("All orders are retrievable")
    void allOrdersRetrievable() {
        seatAndOrder("T1", 2);
        seatAndOrder("T2", 3);
        assertEquals(2, service.getOrders().size());
    }

    // ---- Tables ----

    @Test
    @DisplayName("getTables returns all 6 seeded tables")
    void getTablesReturnsAll() {
        assertEquals(6, service.getTables().size());
    }

    // ---- Menu ----

    @Test
    @DisplayName("getMenu returns all 12 seeded menu items")
    void getMenuReturnsAll() {
        assertEquals(12, service.getMenu().size());
    }

    // ---- Get order ----

    @Test
    @DisplayName("getOrder on unknown id → OrderNotFoundException")
    void getOrderUnknownThrows() {
        assertThrows(OrderNotFoundException.class, () -> service.getOrder("ORD-99999"));
    }
}
