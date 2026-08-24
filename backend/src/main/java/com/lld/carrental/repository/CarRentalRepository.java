package com.lld.carrental.repository;

import com.lld.carrental.model.Customer;
import com.lld.carrental.model.RentalBranch;
import com.lld.carrental.model.Reservation;
import com.lld.carrental.model.Vehicle;
import com.lld.carrental.payment.Payment;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * In-memory storage for the module. Plain {@link ConcurrentHashMap}s per entity — safe for
 * independent reads/writes of different keys, but NOT sufficient on its own to prevent two
 * reservations from double-booking overlapping dates on the same vehicle. That invariant is
 * enforced by {@code ReservationLockService}'s per-vehicle lock around a check-then-act sequence
 * that spans multiple reads of {@link #getReservationsForVehicle(String)}.
 */
@Repository
public class CarRentalRepository {

    private final Map<String, Vehicle> vehicles = new ConcurrentHashMap<>();
    private final Map<String, Customer> customers = new ConcurrentHashMap<>();
    private final Map<String, RentalBranch> branches = new ConcurrentHashMap<>();
    private final Map<String, Reservation> reservations = new ConcurrentHashMap<>();
    private final Map<String, Payment> payments = new ConcurrentHashMap<>();

    private final AtomicInteger customerCounter = new AtomicInteger(0);
    private final AtomicInteger reservationCounter = new AtomicInteger(0);
    private final AtomicInteger paymentCounter = new AtomicInteger(0);
    private final AtomicInteger vehicleCounter = new AtomicInteger(0);

    // --- Branches ---
    public RentalBranch saveBranch(RentalBranch branch) {
        branches.put(branch.getId(), branch);
        return branch;
    }

    public RentalBranch getBranch(String id) {
        return branches.get(id);
    }

    public List<RentalBranch> getAllBranches() {
        return new ArrayList<>(branches.values());
    }

    // --- Vehicles ---
    public String generateVehicleId() {
        return "VEH-" + String.format("%04d", vehicleCounter.incrementAndGet());
    }

    public Vehicle saveVehicle(Vehicle vehicle) {
        vehicles.put(vehicle.getId(), vehicle);
        return vehicle;
    }

    public void updateVehicle(Vehicle vehicle) {
        vehicles.put(vehicle.getId(), vehicle);
    }

    public Vehicle getVehicle(String id) {
        return vehicles.get(id);
    }

    public List<Vehicle> getAllVehicles() {
        return new ArrayList<>(vehicles.values());
    }

    public List<Vehicle> getVehiclesByBranch(String branchId) {
        return vehicles.values().stream()
                .filter(v -> v.getBranchId().equals(branchId))
                .collect(Collectors.toList());
    }

    // --- Customers ---
    public Customer saveCustomer(Customer customer) {
        if (customer.getId() == null || customer.getId().isEmpty()) {
            customer.setId("CUST-" + String.format("%04d", customerCounter.incrementAndGet()));
        }
        customers.put(customer.getId(), customer);
        return customer;
    }

    public Customer getCustomer(String id) {
        return customers.get(id);
    }

    public List<Customer> getAllCustomers() {
        return new ArrayList<>(customers.values());
    }

    // --- Reservations ---
    public String generateReservationId() {
        return "RES-" + String.format("%05d", reservationCounter.incrementAndGet());
    }

    public Reservation saveReservation(Reservation reservation) {
        reservations.put(reservation.getId(), reservation);
        return reservation;
    }

    public void updateReservation(Reservation reservation) {
        reservations.put(reservation.getId(), reservation);
    }

    public Reservation getReservation(String id) {
        return reservations.get(id);
    }

    public List<Reservation> getAllReservations() {
        return reservations.values().stream()
                .sorted(Comparator.comparing(Reservation::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    /** Every reservation on this vehicle, regardless of status — the caller filters by what still blocks the calendar. */
    public List<Reservation> getReservationsForVehicle(String vehicleId) {
        return reservations.values().stream()
                .filter(r -> r.getVehicleId().equals(vehicleId))
                .collect(Collectors.toList());
    }

    public List<Reservation> getReservationsForCustomer(String customerId) {
        return reservations.values().stream()
                .filter(r -> r.getCustomerId().equals(customerId))
                .sorted(Comparator.comparing(Reservation::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    // --- Payments ---
    public String generatePaymentId() {
        return "PAY-" + String.format("%05d", paymentCounter.incrementAndGet());
    }

    public Payment savePayment(Payment payment) {
        payments.put(payment.getId(), payment);
        return payment;
    }

    public Payment getPayment(String id) {
        return payments.get(id);
    }

    /** Wipes all state. Used only by the isolated sim sandbox's reset. */
    public void clear() {
        vehicles.clear();
        customers.clear();
        branches.clear();
        reservations.clear();
        payments.clear();
        customerCounter.set(0);
        reservationCounter.set(0);
        paymentCounter.set(0);
        vehicleCounter.set(0);
    }
}
