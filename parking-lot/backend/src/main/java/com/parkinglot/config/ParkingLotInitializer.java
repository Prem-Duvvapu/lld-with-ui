package com.parkinglot.config;

import com.parkinglot.model.*;
import com.parkinglot.repository.ParkingLotRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ParkingLotInitializer implements CommandLineRunner {

    private final ParkingLotRepository repository;

    public ParkingLotInitializer(ParkingLotRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        for (int floorNum = 1; floorNum <= 3; floorNum++) {
            List<ParkingSpot> spots = new ArrayList<>();
            for (int i = 1; i <= 4; i++) {
                spots.add(new ParkingSpot("F" + floorNum + "-C" + i, floorNum, i, VehicleType.CAR));
            }
            for (int i = 1; i <= 4; i++) {
                spots.add(new ParkingSpot("F" + floorNum + "-B" + i, floorNum, i, VehicleType.BIKE));
            }
            for (int i = 1; i <= 2; i++) {
                spots.add(new ParkingSpot("F" + floorNum + "-T" + i, floorNum, i, VehicleType.TRUCK));
            }
            repository.addFloor(new Floor(floorNum, spots));
        }

        repository.addGate(new Gate("G1", "Main Entry", Gate.GateType.ENTRY));
        repository.addGate(new Gate("G2", "Side Entry", Gate.GateType.ENTRY));
        repository.addGate(new Gate("G3", "Main Exit", Gate.GateType.EXIT));
        repository.addGate(new Gate("G4", "Side Exit", Gate.GateType.EXIT));
    }
}
