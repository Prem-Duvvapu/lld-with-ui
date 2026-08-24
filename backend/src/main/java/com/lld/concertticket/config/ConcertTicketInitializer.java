package com.lld.concertticket.config;

import com.lld.concertticket.repository.ConcertTicketRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

/** Seeds the live repository on boot so the UI shows real venues/events on first load. */
@Component
public class ConcertTicketInitializer {
    private final ConcertTicketRepository repository;

    public ConcertTicketInitializer(ConcertTicketRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        ConcertTicketSeedData.seed(repository);
    }
}
