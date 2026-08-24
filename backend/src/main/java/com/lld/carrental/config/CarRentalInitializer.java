package com.lld.carrental.config;

import com.lld.carrental.model.*;
import com.lld.carrental.repository.CarRentalRepository;
import com.lld.carrental.service.CarRentalService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class CarRentalInitializer {

    private final CarRentalRepository repository;
    private final CarRentalService service;

    public CarRentalInitializer(CarRentalRepository repository, CarRentalService service) {
        this.repository = repository;
        this.service = service;
    }

    @PostConstruct
    public void init() {
        RentalBranch downtown = repository.saveBranch(RentalBranch.builder()
                .id("BR-SF-DT").name("Downtown SF").address("101 Market St").city("San Francisco").build());
        RentalBranch airport = repository.saveBranch(RentalBranch.builder()
                .id("BR-SFO").name("SFO Airport").address("Airport Blvd").city("San Francisco").build());
        RentalBranch sanJose = repository.saveBranch(RentalBranch.builder()
                .id("BR-SJ").name("San Jose").address("55 Almaden Blvd").city("San Jose").build());

        Vehicle v1 = seedVehicle("Honda", "Civic", 2023, "CA-HC-101", VehicleType.SEDAN, downtown.getId());
        Vehicle v2 = seedVehicle("Toyota", "Corolla", 2022, "CA-TC-102", VehicleType.SEDAN, downtown.getId());
        Vehicle v3 = seedVehicle("Suzuki", "Swift", 2023, "CA-SS-103", VehicleType.HATCHBACK, downtown.getId());
        seedVehicle("Ford", "Explorer", 2023, "CA-FE-201", VehicleType.SUV, airport.getId());
        seedVehicle("Jeep", "Wrangler", 2022, "CA-JW-202", VehicleType.SUV, airport.getId());
        seedVehicle("Toyota", "Sienna", 2023, "CA-TS-301", VehicleType.VAN, sanJose.getId());
        seedVehicle("Ford", "F-150", 2021, "CA-FF-401", VehicleType.TRUCK, sanJose.getId());
        Vehicle maintenance = seedVehicle("Honda", "Accord", 2020, "CA-HA-104", VehicleType.SEDAN, downtown.getId());
        maintenance.setStatus(VehicleStatus.MAINTENANCE);
        repository.updateVehicle(maintenance);

        Customer alice = repository.saveCustomer(Customer.builder()
                .name("Alice Johnson").email("alice@example.com").phone("9876500001").licenseNumber("DL-CA-88213").build());
        Customer bob = repository.saveCustomer(Customer.builder()
                .name("Bob Martinez").email("bob@example.com").phone("9876500002").licenseNumber("DL-CA-77124").build());
        repository.saveCustomer(Customer.builder()
                .name("Carla Nguyen").email("carla@example.com").phone("9876500003").licenseNumber("DL-CA-65310").build());

        // A couple of demo reservations so the UI shows something meaningful on first load.
        LocalDate today = LocalDate.now();
        service.reserveVehicle(alice.getId(), v1.getId(), today.plusDays(2), today.plusDays(5));
        var confirmed = service.reserveVehicle(bob.getId(), v2.getId(), today.plusDays(1), today.plusDays(3));
        service.confirmReservation(confirmed.getId(), PaymentMethod.UPI);
        // Non-overlapping second booking on v1 to demonstrate the same vehicle can carry
        // multiple disjoint reservations once the first range has passed.
        service.reserveVehicle(bob.getId(), v3.getId(), today.plusDays(6), today.plusDays(8));
    }

    private Vehicle seedVehicle(String make, String model, int year, String plate, VehicleType type, String branchId) {
        Vehicle vehicle = Vehicle.builder()
                .id(repository.generateVehicleId())
                .make(make).model(model).year(year).licensePlate(plate)
                .type(type).status(VehicleStatus.AVAILABLE).branchId(branchId).odometer(0)
                .build();
        return repository.saveVehicle(vehicle);
    }
}
