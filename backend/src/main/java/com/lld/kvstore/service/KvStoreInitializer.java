package com.lld.kvstore.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds a few demo entries into the live store so the UI shows something on first load. */
@Component
public class KvStoreInitializer implements CommandLineRunner {

    private final KvStoreService kvStoreService;

    public KvStoreInitializer(KvStoreService kvStoreService) {
        this.kvStoreService = kvStoreService;
    }

    @Override
    public void run(String... args) {
        kvStoreService.set("welcome", "Hello from the Key-Value Store!", null);
        kvStoreService.set("pattern", "Command", null);
        kvStoreService.set("session-token", "abc123", 3600L);
        kvStoreService.get("welcome"); // bump it into view via a real read
    }
}
