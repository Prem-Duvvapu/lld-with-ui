package com.lld;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.lld")
public class LldApplication {
    public static void main(String[] args) {
        SpringApplication.run(LldApplication.class, args);
    }
}
