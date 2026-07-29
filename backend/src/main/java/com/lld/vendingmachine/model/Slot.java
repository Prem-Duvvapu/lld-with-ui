package com.lld.vendingmachine.model;

public class Slot {
    private long id;
    private long productId;
    private int row;
    private int col;
    private int capacity;
    private int currentStock;

    public Slot() {}

    public Slot(long id, long productId, int row, int col, int capacity, int currentStock) {
        this.id = id;
        this.productId = productId;
        this.row = row;
        this.col = col;
        this.capacity = capacity;
        this.currentStock = currentStock;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public long getProductId() { return productId; }
    public void setProductId(long productId) { this.productId = productId; }
    public int getRow() { return row; }
    public void setRow(int row) { this.row = row; }
    public int getCol() { return col; }
    public void setCol(int col) { this.col = col; }
    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
    public int getCurrentStock() { return currentStock; }
    public void setCurrentStock(int currentStock) { this.currentStock = currentStock; }
}
