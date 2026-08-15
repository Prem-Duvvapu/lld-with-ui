package com.lld.vendingmachine.model;

public class Slot {
    private long id;
    private String code;
    private int row;
    private int col;
    private Product product;
    private int capacity;
    private int currentStock;

    public Slot() {}

    public Slot(long id, String code, int row, int col, Product product, int capacity, int currentStock) {
        this.id = id;
        this.code = code;
        this.row = row;
        this.col = col;
        this.product = product;
        this.capacity = capacity;
        this.currentStock = currentStock;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public int getRow() { return row; }
    public void setRow(int row) { this.row = row; }

    public int getCol() { return col; }
    public void setCol(int col) { this.col = col; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public int getCurrentStock() { return currentStock; }
    public void setCurrentStock(int currentStock) { this.currentStock = currentStock; }

    public boolean isAvailable() {
        return currentStock > 0 && product != null;
    }

    public void decrementStock() {
        if (currentStock > 0) {
            currentStock--;
        }
    }

    public void restock(int amount) {
        this.currentStock = Math.min(this.capacity, this.currentStock + amount);
    }
}
