package com.lld.restaurant.service;

import com.lld.restaurant.exception.*;
import com.lld.restaurant.model.*;
import com.lld.restaurant.repository.RestaurantRepository;
import com.lld.restaurant.strategy.BillBreakdown;
import com.lld.restaurant.strategy.BillingStrategy;
import com.lld.restaurant.strategy.BillingStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RestaurantService {

    private final RestaurantRepository repository;
    private final TableAllocationService tableAllocationService;
    private final KitchenService kitchenService;

    // Isolated Simulation Sandbox State
    private final RestaurantRepository simRepository = new RestaurantRepository();
    private final TableAllocationService simTableAllocationService = new TableAllocationService(simRepository);
    private final KitchenService simKitchenService = new KitchenService(simRepository);
    private final List<RestaurantEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventSeq = new AtomicLong(0);

    public RestaurantService(RestaurantRepository repository,
                             TableAllocationService tableAllocationService,
                             KitchenService kitchenService) {
        this.repository = repository;
        this.tableAllocationService = tableAllocationService;
        this.kitchenService = kitchenService;
    }

    public List<RestaurantTable> getTables() {
        return repository.findAllTables();
    }

    public List<MenuItem> getMenu() {
        return repository.findAllMenuItems();
    }

    public RestaurantTable seatGuests(String tableId, int partySize) {
        return tableAllocationService.occupy(tableId, partySize);
    }

    public Order placeOrder(String tableId, String waiterName, List<OrderLineRequest> lines, String notes) {
        RestaurantTable table = repository.findTableById(tableId)
                .orElseThrow(() -> new TableNotFoundException("Table not found: " + tableId));

        if (table.getStatus() != TableStatus.OCCUPIED) {
            throw new TableUnavailableException("Table " + tableId + " is not occupied, status: " + table.getStatus());
        }

        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("Order lines cannot be empty");
        }

        List<OrderItem> items = new ArrayList<>();
        double subtotal = 0.0;

        for (OrderLineRequest line : lines) {
            if (line.quantity() < 1) {
                throw new IllegalArgumentException("Quantity must be at least 1 for item: " + line.menuItemId());
            }

            MenuItem menuItem = repository.findMenuItemById(line.menuItemId())
                    .orElseThrow(() -> new MenuItemNotFoundException("Menu item not found: " + line.menuItemId()));

            if (!menuItem.isAvailable()) {
                throw new MenuItemUnavailableException("Menu item is unavailable: " + menuItem.getName());
            }

            double lineTotal = Math.round(menuItem.getPrice() * line.quantity() * 100.0) / 100.0;
            subtotal += lineTotal;

            items.add(OrderItem.builder()
                    .menuItemId(menuItem.getId())
                    .name(menuItem.getName())
                    .quantity(line.quantity())
                    .unitPrice(menuItem.getPrice())
                    .totalPrice(lineTotal)
                    .build());
        }

        subtotal = Math.round(subtotal * 100.0) / 100.0;

        Order order = Order.builder()
                .id(repository.generateOrderId())
                .tableId(tableId)
                .waiterName(waiterName != null ? waiterName : "Staff")
                .items(items)
                .status(OrderStatus.PLACED)
                .notes(notes)
                .createdAt(Instant.now())
                .subtotal(subtotal)
                .build();

        table.setCurrentOrderId(order.getId());
        repository.saveTable(table);
        return repository.saveOrder(order);
    }

    public Order getOrder(String orderId) {
        return repository.findOrderById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));
    }

    public List<Order> getOrders() {
        return repository.findAllOrders();
    }

    public List<Order> getOrdersForTable(String tableId) {
        return repository.findOrdersByTableId(tableId);
    }

    public Order cancelOrder(String orderId) {
        Order order = repository.findOrderById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));

        if (!order.getStatus().canTransitionTo(OrderStatus.CANCELLED)) {
            throw new InvalidOrderTransitionException(
                    "Cannot cancel order " + orderId + " in status " + order.getStatus()
            );
        }

        order.setStatus(OrderStatus.CANCELLED);
        return repository.saveOrder(order);
    }

    public Bill generateBill(String orderId) {
        Order order = repository.findOrderById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));

        if (order.getStatus() != OrderStatus.SERVED) {
            throw new InvalidOrderTransitionException(
                    "Order must be in SERVED status to generate bill, currently: " + order.getStatus()
            );
        }

        order.setStatus(OrderStatus.BILLED);
        repository.saveOrder(order);

        BillingStrategy strategy = BillingStrategyFactory.forTime(LocalTime.now());
        BillBreakdown breakdown = strategy.compute(order.getSubtotal());

        Bill bill = Bill.builder()
                .id(repository.generateBillId())
                .orderId(order.getId())
                .tableId(order.getTableId())
                .subtotal(breakdown.subtotal())
                .discount(breakdown.discount())
                .tax(breakdown.tax())
                .serviceCharge(breakdown.serviceCharge())
                .total(breakdown.total())
                .strategyUsed(strategy.getName())
                .paid(false)
                .createdAt(Instant.now())
                .build();

        return repository.saveBill(bill);
    }

    public Payment payBill(String billId, PaymentMethod method) {
        Bill bill = repository.findBillById(billId)
                .orElseThrow(() -> new BillNotFoundException("Bill not found: " + billId));

        if (bill.isPaid()) {
            throw new BillAlreadyPaidException("Bill " + billId + " is already paid");
        }

        Payment payment = Payment.builder()
                .id(repository.generatePaymentId())
                .billId(bill.getId())
                .orderId(bill.getOrderId())
                .amount(bill.getTotal())
                .method(method != null ? method : PaymentMethod.CASH)
                .status(PaymentStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();

        repository.savePayment(payment);

        bill.setPaid(true);
        bill.setPaidAt(Instant.now());
        repository.saveBill(bill);

        tableAllocationService.release(bill.getTableId());

        return payment;
    }

    // ==========================================
    // Simulation Sandbox Methods (/sim/*)
    // ==========================================

    public void simReset() {
        simRepository.seed();
        simEventLog.clear();
        simEventSeq.set(0);
        addSimEvent("RESET", "System", "Simulation sandbox re-seeded to initial state", Map.of());
    }

    public Map<String, Object> simState() {
        return Map.of(
                "tables", simRepository.findAllTables(),
                "orders", simRepository.findAllOrders(),
                "bills", simRepository.findAllBills()
        );
    }

    public RestaurantTable simSeat(String tableId, int partySize) {
        RestaurantTable table = simTableAllocationService.occupy(tableId, partySize);
        addSimEvent("SEAT", "Waiter", "Seated party of " + partySize + " at " + tableId,
                Map.of("tableId", tableId, "partySize", partySize, "status", table.getStatus().name()));
        return table;
    }

    public Order simOrder(String tableId, String waiterName, List<OrderLineRequest> lines, String notes) {
        RestaurantTable table = simRepository.findTableById(tableId)
                .orElseThrow(() -> new TableNotFoundException("Table not found: " + tableId));

        if (table.getStatus() != TableStatus.OCCUPIED) {
            throw new TableUnavailableException("Table " + tableId + " is not occupied, status: " + table.getStatus());
        }

        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("Order lines cannot be empty");
        }

        List<OrderItem> items = new ArrayList<>();
        double subtotal = 0.0;

        for (OrderLineRequest line : lines) {
            if (line.quantity() < 1) {
                throw new IllegalArgumentException("Quantity must be at least 1");
            }

            MenuItem menuItem = simRepository.findMenuItemById(line.menuItemId())
                    .orElseThrow(() -> new MenuItemNotFoundException("Menu item not found: " + line.menuItemId()));

            if (!menuItem.isAvailable()) {
                throw new MenuItemUnavailableException("Menu item is unavailable: " + menuItem.getName());
            }

            double lineTotal = Math.round(menuItem.getPrice() * line.quantity() * 100.0) / 100.0;
            subtotal += lineTotal;

            items.add(OrderItem.builder()
                    .menuItemId(menuItem.getId())
                    .name(menuItem.getName())
                    .quantity(line.quantity())
                    .unitPrice(menuItem.getPrice())
                    .totalPrice(lineTotal)
                    .build());
        }

        subtotal = Math.round(subtotal * 100.0) / 100.0;

        Order order = Order.builder()
                .id(simRepository.generateOrderId())
                .tableId(tableId)
                .waiterName(waiterName != null ? waiterName : "SimWaiter")
                .items(items)
                .status(OrderStatus.PLACED)
                .notes(notes)
                .createdAt(Instant.now())
                .subtotal(subtotal)
                .build();

        table.setCurrentOrderId(order.getId());
        simRepository.saveTable(table);
        Order saved = simRepository.saveOrder(order);

        addSimEvent("ORDER_PLACED", waiterName, "Order " + order.getId() + " placed for table " + tableId + " (₹" + subtotal + ")",
                Map.of("orderId", order.getId(), "tableId", tableId, "subtotal", subtotal, "itemsCount", items.size()));

        return saved;
    }

    public Order simPrepare(String orderId) {
        Order order = simKitchenService.startPreparation(orderId);
        addSimEvent("PREPARING", "Chef", "Kitchen started preparing order " + orderId,
                Map.of("orderId", orderId, "status", order.getStatus().name()));
        return order;
    }

    public Order simReady(String orderId) {
        Order order = simKitchenService.markReady(orderId);
        addSimEvent("READY", "Chef", "Order " + orderId + " is ready for pickup",
                Map.of("orderId", orderId, "status", order.getStatus().name()));
        return order;
    }

    public Order simServe(String orderId) {
        Order order = simKitchenService.markServed(orderId);
        addSimEvent("SERVED", "Waiter", "Order " + orderId + " served to table " + order.getTableId(),
                Map.of("orderId", orderId, "tableId", order.getTableId(), "status", order.getStatus().name()));
        return order;
    }

    public Bill simBill(String orderId) {
        Order order = simRepository.findOrderById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderId));

        if (order.getStatus() != OrderStatus.SERVED) {
            throw new InvalidOrderTransitionException("Order must be in SERVED status to generate bill");
        }

        order.setStatus(OrderStatus.BILLED);
        simRepository.saveOrder(order);

        BillingStrategy strategy = BillingStrategyFactory.forTime(LocalTime.now());
        BillBreakdown breakdown = strategy.compute(order.getSubtotal());

        Bill bill = Bill.builder()
                .id(simRepository.generateBillId())
                .orderId(order.getId())
                .tableId(order.getTableId())
                .subtotal(breakdown.subtotal())
                .discount(breakdown.discount())
                .tax(breakdown.tax())
                .serviceCharge(breakdown.serviceCharge())
                .total(breakdown.total())
                .strategyUsed(strategy.getName())
                .paid(false)
                .createdAt(Instant.now())
                .build();

        Bill saved = simRepository.saveBill(bill);
        addSimEvent("BILLED", "Cashier", "Bill " + bill.getId() + " generated for order " + orderId + " (Total: ₹" + bill.getTotal() + ")",
                Map.of("billId", bill.getId(), "orderId", orderId, "total", bill.getTotal(), "strategy", strategy.getName()));
        return saved;
    }

    public Payment simPay(String billId, PaymentMethod method) {
        Bill bill = simRepository.findBillById(billId)
                .orElseThrow(() -> new BillNotFoundException("Bill not found: " + billId));

        if (bill.isPaid()) {
            throw new BillAlreadyPaidException("Bill " + billId + " is already paid");
        }

        Payment payment = Payment.builder()
                .id(simRepository.generatePaymentId())
                .billId(bill.getId())
                .orderId(bill.getOrderId())
                .amount(bill.getTotal())
                .method(method != null ? method : PaymentMethod.CASH)
                .status(PaymentStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();

        simRepository.savePayment(payment);

        bill.setPaid(true);
        bill.setPaidAt(Instant.now());
        simRepository.saveBill(bill);

        simTableAllocationService.release(bill.getTableId());

        addSimEvent("PAID", "Customer", "Bill " + billId + " paid via " + payment.getMethod() + " (₹" + bill.getTotal() + ")",
                Map.of("billId", billId, "amount", bill.getTotal(), "method", payment.getMethod().name(), "tableReleased", bill.getTableId()));

        return payment;
    }

    public List<RestaurantEvent> simEvents() {
        return new ArrayList<>(simEventLog);
    }

    private void addSimEvent(String type, String actor, String message, Map<String, Object> detail) {
        long id = simEventSeq.incrementAndGet();
        simEventLog.add(new RestaurantEvent(id, type, actor, message, detail, Instant.now()));
    }
}
