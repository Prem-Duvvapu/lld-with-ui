package com.lld.movieticket.model;

public class Seat {
    private long id;
    private int row;
    private int col;
    private String type;
    private double price;
    private boolean available;

    public Seat() {}

    public Seat(long id, int row, int col, String type, double price, boolean available) {
        this.id = id;
        this.row = row;
        this.col = col;
        this.type = type;
        this.price = price;
        this.available = available;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public int getRow() { return row; }
    public void setRow(int row) { this.row = row; }

    public int getCol() { return col; }
    public void setCol(int col) { this.col = col; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
}
