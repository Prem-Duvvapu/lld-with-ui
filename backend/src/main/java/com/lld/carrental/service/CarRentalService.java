package com.lld.carrental.service;

import com.lld.carrental.exception.*;
import com.lld.carrental.model.*;
import com.lld.carrental.payment.Payment;
import com.lld.carrental.payment.PaymentProcessor;
import com.lld.carrental.repository.CarRentalRepository;
import com.lld.carrental.strategy.PricingStrategy;
import com.lld.carrental.strategy.PricingStrategyFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Facade over the whole module. The controller delegates every call here wholesale.
 *
 * <p>Carries a second, isolated {@link CarRentalRepository} + {@link ReservationLockService} pair
 * ({@code simRepository} / {@code simLockService}) for the interactive {@code /sim/*} demo, so
 * driving the simulation can never corrupt the real fleet/reservation state — same shape as
 * {@code SplitwiseService}'s {@code simRepository}.
 */
@Service
public class CarRentalService {

    private final CarRentalRepository repository;
    private final CarRentalRepository simRepository;
    private final ReservationLockService lockService;
    private final ReservationLockService simLockService;
    private final PricingStrategyFactory pricingFactory;
    private final PaymentProcessor paymentProcessor;

    public CarRentalService(CarRentalRepository repository,
                             ReservationLockService lockService,
                             PricingStrategyFactory pricingFactory,
                             PaymentProcessor paymentProcessor) {
        this.repository = repository;
        this.lockService = lockService;
        this.pricingFactory = pricingFactory;
        this.paymentProcessor = paymentProcessor;
        this.simRepository = new CarRentalRepository();
        this.simLockService = new ReservationLockService(simRepository);
    }

    // ================= Branches / Vehicles / Customers =================

    public List<RentalBranch> getAllBranches() {
        return repository.getAllBranches();
    }

    public RentalBranch getBranch(String id) {
        RentalBranch branch = repository.getBranch(id);
        if (branch == null) throw new BranchNotFoundException("Branch not found: " + id);
        return branch;
    }

    public List<Vehicle> getAllVehicles() {
        return repository.getAllVehicles();
    }

    public Vehicle getVehicle(String id) {
        Vehicle vehicle = repository.getVehicle(id);
        if (vehicle == null) throw new VehicleNotFoundException("Vehicle not found: " + id);
        return vehicle;
    }

    public List<Vehicle> getVehiclesByBranch(String branchId) {
        getBranch(branchId);
        return repository.getVehiclesByBranch(branchId);
    }

    /** Read-only: vehicles in the fleet (not MAINTENANCE/RETIRED) with no overlapping reservation for the given range. */
    public List<Vehicle> searchAvailableVehicles(String branchId, VehicleType type, LocalDate start, LocalDate end) {
        validateDates(start, end);
        List<Vehicle> candidates = branchId != null ? getVehiclesByBranch(branchId) : repository.getAllVehicles();
        return candidates.stream()
                .filter(v -> v.getStatus() != VehicleStatus.MAINTENANCE && v.getStatus() != VehicleStatus.RETIRED)
                .filter(v -> type == null || v.getType() == type)
                .filter(v -> isFreeForRange(v.getId(), start, end))
                .collect(Collectors.toList());
    }

    private boolean isFreeForRange(String vehicleId, LocalDate start, LocalDate end) {
        return repository.getReservationsForVehicle(vehicleId).stream()
                .filter(r -> r.getStatus().blocksCalendar())
                .noneMatch(r -> start.isBefore(r.getEndDate()) && r.getStartDate().isBefore(end));
    }

    public Customer registerCustomer(Customer customer) {
        return repository.saveCustomer(customer);
    }

    public List<Customer> getAllCustomers() {
        return repository.getAllCustomers();
    }

    public Customer getCustomer(String id) {
        Customer customer = repository.getCustomer(id);
        if (customer == null) throw new CustomerNotFoundException("Customer not found: " + id);
        return customer;
    }

    // ================= Reservation workflow =================

    private void validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new InvalidReservationDatesException("Start and end date are required");
        }
        if (!end.isAfter(start)) {
            throw new InvalidReservationDatesException("End date must be after start date");
        }
    }

    /** Estimated cost for a given vehicle category and duration, without committing anything. */
    public double estimateCost(VehicleType type, LocalDate start, LocalDate end) {
        validateDates(start, end);
        long days = ChronoUnit.DAYS.between(start, end);
        return pricingFactory.forDuration(days).calculateCost(type, days);
    }

    /**
     * Creates a reservation holding the vehicle for [start,end). The one contended step —
     * checking the vehicle's reservation set for a date overlap and inserting the new one — is
     * delegated to {@link ReservationLockService}, which does both under a single per-vehicle lock.
     */
    public Reservation reserveVehicle(String customerId, String vehicleId, LocalDate start, LocalDate end) {
        validateDates(start, end);
        getCustomer(customerId);
        Vehicle vehicle = getVehicle(vehicleId);

        long days = ChronoUnit.DAYS.between(start, end);
        PricingStrategy pricing = pricingFactory.forDuration(days);
        double cost = pricing.calculateCost(vehicle.getType(), days);

        return lockService.reserve(vehicleId, customerId, start, end, cost, pricing.getName());
    }

    private void transition(Reservation reservation, ReservationStatus next) {
        ReservationStatus current = reservation.getStatus();
        if (!current.canTransitionTo(next)) {
            throw new InvalidReservationTransitionException(
                    "Reservation " + reservation.getId() + " cannot move from " + current + " to " + next
                            + ". Allowed: " + current.allowedNext());
        }
        reservation.setStatus(next);
    }

    /** Authorises payment and confirms the reservation. */
    public Reservation confirmReservation(String reservationId, PaymentMethod method) {
        Reservation reservation = getReservation(reservationId);

        String paymentId = repository.generatePaymentId();
        Payment payment = Payment.builder()
                .id(paymentId)
                .reservationId(reservationId)
                .amount(reservation.getEstimatedCost())
                .method(method)
                .status(PaymentStatus.PENDING)
                .build();
        payment = paymentProcessor.process(payment);
        repository.savePayment(payment);

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new PaymentFailedException("Payment failed for reservation " + reservationId);
        }

        transition(reservation, ReservationStatus.CONFIRMED);
        reservation.setPaymentId(payment.getId());
        repository.updateReservation(reservation);
        return reservation;
    }

    /** Hands the vehicle to the customer. */
    public Reservation pickup(String reservationId) {
        Reservation reservation = getReservation(reservationId);
        transition(reservation, ReservationStatus.ACTIVE);
        repository.updateReservation(reservation);
        lockService.markPickedUp(reservation.getVehicleId());
        return reservation;
    }

    /** Returns the vehicle, closes the reservation and applies a late fee if returned after the booked end date. */
    public Reservation returnVehicle(String reservationId, int odometerReading, LocalDate actualReturnDate) {
        Reservation reservation = getReservation(reservationId);
        transition(reservation, ReservationStatus.COMPLETED);

        LocalDate returnedOn = actualReturnDate != null ? actualReturnDate : reservation.getEndDate();
        double actualCost = reservation.getEstimatedCost();
        if (returnedOn.isAfter(reservation.getEndDate())) {
            Vehicle vehicle = getVehicle(reservation.getVehicleId());
            long lateDays = ChronoUnit.DAYS.between(reservation.getEndDate(), returnedOn);
            double lateFeePerDay = vehicle.getType().getBaseDailyRate() * 1.5; // late fee is a 50% surcharge on the daily rate
            actualCost += lateDays * lateFeePerDay;
        }
        reservation.setActualCost(Math.round(actualCost * 100.0) / 100.0);
        reservation.setReturnOdometer(odometerReading);
        repository.updateReservation(reservation);

        lockService.markReturned(reservation.getVehicleId(), odometerReading);
        return reservation;
    }

    /** Cancels a not-yet-active reservation, refunding payment if one was already captured. */
    public Reservation cancelReservation(String reservationId) {
        Reservation reservation = getReservation(reservationId);
        transition(reservation, ReservationStatus.CANCELLED);
        repository.updateReservation(reservation);

        if (reservation.getPaymentId() != null) {
            Payment payment = repository.getPayment(reservation.getPaymentId());
            paymentProcessor.refund(payment);
            if (payment != null) {
                repository.savePayment(payment);
            }
        }
        return reservation;
    }

    public Reservation getReservation(String id) {
        Reservation reservation = repository.getReservation(id);
        if (reservation == null) throw new ReservationNotFoundException("Reservation not found: " + id);
        return reservation;
    }

    public List<Reservation> getAllReservations() {
        return repository.getAllReservations();
    }

    public List<Reservation> getCustomerReservations(String customerId) {
        return repository.getReservationsForCustomer(customerId);
    }

    // ================= ISOLATED SIMULATION ENGINE =================
    // Mirrors the real workflow one-for-one against simRepository/simLockService so the demo
    // tab can be reset and replayed without ever touching live fleet or reservation data.

    public void simReset() {
        simRepository.clear();
    }

    public Vehicle simSeedVehicle(Vehicle vehicle) {
        if (vehicle.getId() == null || vehicle.getId().isEmpty()) {
            vehicle.setId(simRepository.generateVehicleId());
        }
        if (vehicle.getStatus() == null) {
            vehicle.setStatus(VehicleStatus.AVAILABLE);
        }
        return simRepository.saveVehicle(vehicle);
    }

    public Customer simSeedCustomer(Customer customer) {
        return simRepository.saveCustomer(customer);
    }

    public List<Vehicle> simGetVehicles() {
        return simRepository.getAllVehicles();
    }

    public List<Reservation> simGetReservations() {
        return simRepository.getAllReservations();
    }

    public Reservation simReserve(String customerId, String vehicleId, LocalDate start, LocalDate end) {
        validateDates(start, end);
        Customer customer = simRepository.getCustomer(customerId);
        if (customer == null) throw new CustomerNotFoundException("Customer not found: " + customerId);
        Vehicle vehicle = simRepository.getVehicle(vehicleId);
        if (vehicle == null) throw new VehicleNotFoundException("Vehicle not found: " + vehicleId);

        long days = ChronoUnit.DAYS.between(start, end);
        PricingStrategy pricing = pricingFactory.forDuration(days);
        double cost = pricing.calculateCost(vehicle.getType(), days);

        return simLockService.reserve(vehicleId, customerId, start, end, cost, pricing.getName());
    }

    public Reservation simConfirm(String reservationId, PaymentMethod method) {
        Reservation reservation = simRepository.getReservation(reservationId);
        if (reservation == null) throw new ReservationNotFoundException("Reservation not found: " + reservationId);

        String paymentId = simRepository.generatePaymentId();
        Payment payment = Payment.builder()
                .id(paymentId).reservationId(reservationId).amount(reservation.getEstimatedCost())
                .method(method).status(PaymentStatus.PENDING).build();
        payment = paymentProcessor.process(payment);
        simRepository.savePayment(payment);

        transition(reservation, ReservationStatus.CONFIRMED);
        reservation.setPaymentId(payment.getId());
        simRepository.updateReservation(reservation);
        return reservation;
    }

    public Reservation simPickup(String reservationId) {
        Reservation reservation = simRepository.getReservation(reservationId);
        if (reservation == null) throw new ReservationNotFoundException("Reservation not found: " + reservationId);
        transition(reservation, ReservationStatus.ACTIVE);
        simRepository.updateReservation(reservation);
        simLockService.markPickedUp(reservation.getVehicleId());
        return reservation;
    }

    public Reservation simReturn(String reservationId, int odometerReading) {
        Reservation reservation = simRepository.getReservation(reservationId);
        if (reservation == null) throw new ReservationNotFoundException("Reservation not found: " + reservationId);
        transition(reservation, ReservationStatus.COMPLETED);
        reservation.setActualCost(reservation.getEstimatedCost());
        reservation.setReturnOdometer(odometerReading);
        simRepository.updateReservation(reservation);
        simLockService.markReturned(reservation.getVehicleId(), odometerReading);
        return reservation;
    }

    public Reservation simCancel(String reservationId) {
        Reservation reservation = simRepository.getReservation(reservationId);
        if (reservation == null) throw new ReservationNotFoundException("Reservation not found: " + reservationId);
        transition(reservation, ReservationStatus.CANCELLED);
        simRepository.updateReservation(reservation);
        return reservation;
    }
}
