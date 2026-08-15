package com.lld.coffeemachine.model;

public enum MachineStatus {
    IDLE("Idle - Ready to order"),
    SELECTING("Customizing - Selecting base coffee and add-ons"),
    PAYMENT_PENDING("Payment Pending - Awaiting cash deposit"),
    BREWING("Brewing - Extracting espresso & steaming milk"),
    DISPENSED("Dispensed - Cup ready for pickup"),
    OUT_OF_SERVICE("Out of Service - Maintenance required");

    private final String description;

    MachineStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
