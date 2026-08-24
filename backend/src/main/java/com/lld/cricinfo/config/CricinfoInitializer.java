package com.lld.cricinfo.config;

import com.lld.cricinfo.service.CricinfoService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class CricinfoInitializer {

    private final CricinfoService cricinfoService;

    public CricinfoInitializer(CricinfoService cricinfoService) {
        this.cricinfoService = cricinfoService;
    }

    @PostConstruct
    public void init() {
        cricinfoService.seedInitialMatch();
    }
}
