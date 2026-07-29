package com.lld.hotel.config;

import com.lld.hotel.model.Hotel;
import com.lld.hotel.model.Room;
import com.lld.hotel.model.Room.RoomType;
import com.lld.hotel.repository.HotelRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class HotelInitializer implements CommandLineRunner {

    private final HotelRepository repository;

    public HotelInitializer(HotelRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        repository.addRoom(new Room("R1", "H1", "101", RoomType.SINGLE, 3000));
        repository.addRoom(new Room("R2", "H1", "102", RoomType.SINGLE, 3000));
        repository.addRoom(new Room("R3", "H1", "201", RoomType.DOUBLE, 5000));
        repository.addRoom(new Room("R4", "H1", "301", RoomType.SUITE, 12000));
        repository.addRoom(new Room("R5", "H1", "302", RoomType.DELUXE, 8000));

        repository.addRoom(new Room("R6", "H2", "101", RoomType.SINGLE, 2500));
        repository.addRoom(new Room("R7", "H2", "102", RoomType.SINGLE, 2500));
        repository.addRoom(new Room("R8", "H2", "201", RoomType.DOUBLE, 4500));
        repository.addRoom(new Room("R9", "H2", "202", RoomType.DOUBLE, 4500));
        repository.addRoom(new Room("R10", "H2", "301", RoomType.SUITE, 10000));
    }
}
