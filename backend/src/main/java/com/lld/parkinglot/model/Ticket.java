package com.lld.parkinglot.model;

import java.time.LocalDateTime;

public class Ticket {
    private String ticketNumber;
    private String vehicleNumber;
    private VehicleType vehicleType;
    private String spotId;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private double amount;

    public Ticket(String ticketNumber, String vehicleNumber, VehicleType vehicleType, String spotId, LocalDateTime entryTime) {
        this.ticketNumber = ticketNumber;
        this.vehicleNumber = vehicleNumber;
        this.vehicleType = vehicleType;
        this.spotId = spotId;
        this.entryTime = entryTime;
    }

    public String getTicketNumber() { return ticketNumber; }
    public String getVehicleNumber() { return vehicleNumber; }
    public VehicleType getVehicleType() { return vehicleType; }
    public String getSpotId() { return spotId; }
    public LocalDateTime getEntryTime() { return entryTime; }
    public LocalDateTime getExitTime() { return exitTime; }
    public void setExitTime(LocalDateTime exitTime) { this.exitTime = exitTime; }
    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }
}
