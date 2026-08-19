package com.lld.logging.config;

import com.lld.logging.model.LogLevel;
import com.lld.logging.service.LoggingService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class LoggingInitializer {
    private final LoggingService loggingService;

    public LoggingInitializer(LoggingService loggingService) {
        this.loggingService = loggingService;
    }

    @PostConstruct
    public void init() {
        loggingService.log("AuthService", LogLevel.INFO, "User 'alice_doe' authenticated successfully via JWT bearer token", Map.of("userId", "u-101", "traceId", "trc-auth-901"));
        loggingService.log("PaymentGateway", LogLevel.INFO, "Payment transaction ₹3499.00 initiated via UPI (orderId: ORD-8891)", Map.of("orderId", "ORD-8891", "gateway", "Razorpay"));
        loggingService.log("OrderProcessor", LogLevel.INFO, "Order ORD-8891 state changed from PLACED to CONFIRMED", Map.of("orderId", "ORD-8891", "status", "CONFIRMED"));
        loggingService.log("InventoryService", LogLevel.WARN, "Low stock threshold reached for SKU-ELEC-409 (Remaining: 2)", Map.of("sku", "SKU-ELEC-409", "stock", 2));
        loggingService.log("NotificationHub", LogLevel.INFO, "Push notification dispatched to rider device token", Map.of("recipient", "rider-554", "channel", "FCM"));
        loggingService.log("PaymentGateway", LogLevel.ERROR, "Payment webhook signature verification failed from IP 198.51.100.4", Map.of("ip", "198.51.100.4", "status", 401));
    }
}
