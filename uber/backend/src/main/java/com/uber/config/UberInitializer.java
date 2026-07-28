package com.uber.config;

import com.uber.model.Driver;
import com.uber.model.Location;
import com.uber.model.VehicleType;
import com.uber.repository.UberRepository;
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
        repository.addDriver(new Driver("D1", "Vikram", "9988776655", VehicleType.UBER_GO,
                "KA-01-AB-1234", new Location(12.9716, 77.5946, "MG Road")));
        repository.addDriver(new Driver("D2", "Sneha", "9988776644", VehicleType.UBER_GO,
                "KA-02-CD-5678", new Location(12.9344, 77.6101, "Koramangala")));
        repository.addDriver(new Driver("D3", "Rajesh", "9988776633", VehicleType.UBER_XL,
                "KA-03-EF-9012", new Location(12.9815, 77.6365, "Indiranagar")));
        repository.addDriver(new Driver("D4", "Anita", "9988776622", VehicleType.UBER_PREMIUM,
                "KA-04-GH-3456", new Location(12.9279, 77.6271, "JP Nagar")));
        repository.addDriver(new Driver("D5", "Karan", "9988776611", VehicleType.UBER_GO,
                "KA-05-IJ-7890", new Location(12.9586, 77.6500, "Whitefield")));
        repository.addDriver(new Driver("D6", "Priya", "9988776600", VehicleType.UBER_XL,
                "KA-06-KL-1111", new Location(12.9698, 77.5500, "Malleswaram")));
    }
}
