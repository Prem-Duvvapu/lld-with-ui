package com.lld.airline.model;

public class Seat {
    public enum SeatClass { ECONOMY, BUSINESS, FIRST }
    public enum SeatStatus { AVAILABLE, BOOKED }

    private String id;
    private String flightId;
    private String row;
    private String col;
    private SeatClass classType;
    private double price;
    private SeatStatus status;

    public Seat() {}

    public Seat(String id, String flightId, String row, String col,
                SeatClass classType, double price) {
        this.id = id;
        this.flightId = flightId;
        this.row = row;
        this.col = col;
        this.classType = classType;
        this.price = price;
        this.status = SeatStatus.AVAILABLE;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getFlightId() { return flightId; }
    public void setFlightId(String flightId) { this.flightId = flightId; }
    public String getRow() { return row; }
    public void setRow(String row) { this.row = row; }
    public String getCol() { return col; }
    public void setCol(String col) { this.col = col; }
    public SeatClass getClassType() { return classType; }
    public void setClassType(SeatClass classType) { this.classType = classType; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public SeatStatus getStatus() { return status; }
    public void setStatus(SeatStatus status) { this.status = status; }
}
