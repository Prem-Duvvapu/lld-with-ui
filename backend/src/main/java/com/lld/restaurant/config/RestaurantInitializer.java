package com.lld.restaurant.config;

import com.lld.restaurant.repository.RestaurantRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class RestaurantInitializer {

    private final RestaurantRepository repository;

    public RestaurantInitializer(RestaurantRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.seed();
    }
}
