package com.lld.movieticket.config;

import com.lld.movieticket.repository.MovieTicketRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class MovieTicketInitializer {
    private final MovieTicketRepository repository;

    public MovieTicketInitializer(MovieTicketRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.seedInitialData();
    }
}
