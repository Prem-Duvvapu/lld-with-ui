package com.lld.restaurant.repository;

import com.lld.restaurant.model.*;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class RestaurantRepository {

    private final ConcurrentMap<String, RestaurantTable> tables = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, MenuItem> menuItems = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Order> orders = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Bill> bills = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Payment> payments = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Staff> staff = new ConcurrentHashMap<>();

    private final AtomicLong orderSeq = new AtomicLong(0);
    private final AtomicLong billSeq = new AtomicLong(0);
    private final AtomicLong paymentSeq = new AtomicLong(0);

    public RestaurantRepository() {
        seed();
    }

    public void seed() {
        tables.clear();
        menuItems.clear();
        orders.clear();
        bills.clear();
        payments.clear();
        staff.clear();

        orderSeq.set(0);
        billSeq.set(0);
        paymentSeq.set(0);

        // Seed 6 tables: T1(2), T2(4), T3(4), T4(6), T5(2), T6(4)
        saveTable(new RestaurantTable("T1", 1, 2, TableStatus.AVAILABLE, null));
        saveTable(new RestaurantTable("T2", 2, 4, TableStatus.AVAILABLE, null));
        saveTable(new RestaurantTable("T3", 3, 4, TableStatus.AVAILABLE, null));
        saveTable(new RestaurantTable("T4", 4, 6, TableStatus.AVAILABLE, null));
        saveTable(new RestaurantTable("T5", 5, 2, TableStatus.AVAILABLE, null));
        saveTable(new RestaurantTable("T6", 6, 4, TableStatus.AVAILABLE, null));

        // Seed Menu items
        saveMenuItem(new MenuItem("M-001", "Paneer Tikka", MenuCategory.APPETIZER, 240.0, true));
        saveMenuItem(new MenuItem("M-002", "Crispy Corn", MenuCategory.APPETIZER, 180.0, true));
        saveMenuItem(new MenuItem("M-003", "Chicken Wings", MenuCategory.APPETIZER, 290.0, true));
        saveMenuItem(new MenuItem("M-004", "Butter Chicken", MenuCategory.MAIN, 380.0, true));
        saveMenuItem(new MenuItem("M-005", "Dal Makhani", MenuCategory.MAIN, 280.0, true));
        saveMenuItem(new MenuItem("M-006", "Veg Biryani", MenuCategory.MAIN, 260.0, true));
        saveMenuItem(new MenuItem("M-007", "Mutton Rogan Josh", MenuCategory.MAIN, 450.0, true));
        saveMenuItem(new MenuItem("M-008", "Gulab Jamun", MenuCategory.DESSERT, 120.0, true));
        saveMenuItem(new MenuItem("M-009", "Brownie with Ice Cream", MenuCategory.DESSERT, 180.0, true));
        saveMenuItem(new MenuItem("M-010", "Fresh Lime Soda", MenuCategory.BEVERAGE, 90.0, true));
        saveMenuItem(new MenuItem("M-011", "Mango Lassi", MenuCategory.BEVERAGE, 110.0, true));
        saveMenuItem(new MenuItem("M-012", "Masala Chai", MenuCategory.BEVERAGE, 60.0, true));

        // Seed Staff
        saveStaff(new Staff("S-1", "Rahul Sharma", StaffRole.WAITER, true));
        saveStaff(new Staff("S-2", "Priya Singh", StaffRole.WAITER, true));
        saveStaff(new Staff("S-3", "Chef Sanjeev", StaffRole.CHEF, true));
    }

    public String generateOrderId() {
        return String.format("ORD-%05d", orderSeq.incrementAndGet());
    }

    public String generateBillId() {
        return String.format("BILL-%05d", billSeq.incrementAndGet());
    }

    public String generatePaymentId() {
        return String.format("PAY-%05d", paymentSeq.incrementAndGet());
    }

    // Tables
    public List<RestaurantTable> findAllTables() {
        List<RestaurantTable> list = new ArrayList<>(tables.values());
        list.sort(Comparator.comparing(RestaurantTable::getId));
        return list;
    }

    public Optional<RestaurantTable> findTableById(String id) {
        return Optional.ofNullable(tables.get(id));
    }

    public RestaurantTable saveTable(RestaurantTable table) {
        tables.put(table.getId(), table);
        return table;
    }

    // Menu Items
    public List<MenuItem> findAllMenuItems() {
        List<MenuItem> list = new ArrayList<>(menuItems.values());
        list.sort(Comparator.comparing(MenuItem::getId));
        return list;
    }

    public Optional<MenuItem> findMenuItemById(String id) {
        return Optional.ofNullable(menuItems.get(id));
    }

    public MenuItem saveMenuItem(MenuItem item) {
        menuItems.put(item.getId(), item);
        return item;
    }

    // Orders
    public List<Order> findAllOrders() {
        List<Order> list = new ArrayList<>(orders.values());
        list.sort(Comparator.comparing(Order::getCreatedAt).reversed());
        return list;
    }

    public Optional<Order> findOrderById(String id) {
        return Optional.ofNullable(orders.get(id));
    }

    public List<Order> findOrdersByTableId(String tableId) {
        List<Order> result = new ArrayList<>();
        for (Order order : orders.values()) {
            if (tableId.equalsIgnoreCase(order.getTableId())) {
                result.add(order);
            }
        }
        result.sort(Comparator.comparing(Order::getCreatedAt).reversed());
        return result;
    }

    public Order saveOrder(Order order) {
        orders.put(order.getId(), order);
        return order;
    }

    // Bills
    public List<Bill> findAllBills() {
        List<Bill> list = new ArrayList<>(bills.values());
        list.sort(Comparator.comparing(Bill::getCreatedAt).reversed());
        return list;
    }

    public Optional<Bill> findBillById(String id) {
        return Optional.ofNullable(bills.get(id));
    }

    public Optional<Bill> findBillByOrderId(String orderId) {
        for (Bill bill : bills.values()) {
            if (orderId.equalsIgnoreCase(bill.getOrderId())) {
                return Optional.of(bill);
            }
        }
        return Optional.empty();
    }

    public Bill saveBill(Bill bill) {
        bills.put(bill.getId(), bill);
        return bill;
    }

    // Payments
    public List<Payment> findAllPayments() {
        return new ArrayList<>(payments.values());
    }

    public Payment savePayment(Payment payment) {
        payments.put(payment.getId(), payment);
        return payment;
    }

    // Staff
    public List<Staff> findAllStaff() {
        return new ArrayList<>(staff.values());
    }

    public Staff saveStaff(Staff s) {
        staff.put(s.getId(), s);
        return s;
    }

    public void clear() {
        tables.clear();
        menuItems.clear();
        orders.clear();
        bills.clear();
        payments.clear();
        staff.clear();
        orderSeq.set(0);
        billSeq.set(0);
        paymentSeq.set(0);
    }
}
