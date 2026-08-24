package com.lld.stackoverflow.config;

import com.lld.stackoverflow.repository.StackOverflowRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds the live module's store at boot. See {@link StackOverflowRepository#seed()}. */
@Component
public class StackOverflowInitializer implements CommandLineRunner {

    private final StackOverflowRepository repository;

    public StackOverflowInitializer(StackOverflowRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        repository.seed();
    }
}
