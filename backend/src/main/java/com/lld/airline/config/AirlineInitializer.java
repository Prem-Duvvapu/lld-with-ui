package com.lld.airline.config;

import com.lld.airline.model.Flight;
import com.lld.airline.model.Seat;
import com.lld.airline.model.Seat.SeatClass;
import com.lld.airline.repository.AirlineRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class AirlineInitializer implements CommandLineRunner {

    private final AirlineRepository repository;

    public AirlineInitializer(AirlineRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
    }
}
