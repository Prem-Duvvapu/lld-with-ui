package com.lld.musicstreaming.config;

import com.lld.musicstreaming.repository.MusicStreamingRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class MusicStreamingInitializer {

    private final MusicStreamingRepository repository;

    public MusicStreamingInitializer(MusicStreamingRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        repository.seed();
    }
}
