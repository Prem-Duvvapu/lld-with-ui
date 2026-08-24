package com.lld.hotel.config;

import com.lld.hotel.repository.HotelRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class HotelInitializer {

    private final HotelRepository repository;

    public HotelInitializer(HotelRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.seed();
    }
}
