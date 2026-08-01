package com.lld.uber.config;

import com.lld.uber.model.Driver;
import com.lld.uber.model.Location;
import com.lld.uber.model.Rider;
import com.lld.uber.model.VehicleType;
import com.lld.uber.repository.UberRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class UberInitializer implements CommandLineRunner {

    private final UberRepository repository;

    public UberInitializer(UberRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        // Register sample riders
        Rider rider1 = new Rider("RIDER-001", "Alex Johnson", "9876543210", new Location(12.9716, 77.5946, "MG Road"));
        Rider rider2 = new Rider("RIDER-002", "Sarah Smith", "9876543211", new Location(12.9352, 77.6245, "Koramangala"));
        repository.registerRider(rider1);
        repository.registerRider(rider2);

        // Register sample drivers
        Driver d1 = new Driver("D-001", "Rajesh Kumar", "9876543212", VehicleType.UBER_GO, "KA-01-AB-1234", new Location(12.9720, 77.5950, "MG Road Junction"));
        Driver d2 = new Driver("D-002", "Suresh Sharma", "9876543213", VehicleType.UBER_XL, "KA-02-CD-5678", new Location(12.9360, 77.6250, "Koramangala 5th Block"));
        Driver d3 = new Driver("D-003", "Vikram Singh", "9876543214", VehicleType.UBER_PREMIUM, "KA-03-EF-9012", new Location(12.9700, 77.5900, "Cubbon Park"));

        repository.registerDriver(d1);
        repository.registerDriver(d2);
        repository.registerDriver(d3);
    }
}
