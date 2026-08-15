package com.lld.vendingmachine.model;

public enum MachineStatus {
    IDLE("Idle - Ready for Selection or Cash"),
    PRODUCT_SELECTED("Product Selected - Awaiting Payment"),
    PAYMENT_PENDING("Payment Pending - Partial Cash Inserted"),
    DISPENSING("Dispensing - Processing Product & Change"),
    OUT_OF_SERVICE("Out of Service - Maintenance Required");

    private final String description;

    MachineStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
