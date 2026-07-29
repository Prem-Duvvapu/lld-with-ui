package com.lld.inventory.model;

public class Product {
    private long id;
    private String sku;
    private String name;
    private Category category;
    private double unitPrice;
    private int currentStock;
    private int reorderLevel;
    private long supplierId;

    public Product() {}

    public Product(long id, String sku, String name, Category category, double unitPrice, int currentStock, int reorderLevel, long supplierId) {
        this.id = id;
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.unitPrice = unitPrice;
        this.currentStock = currentStock;
        this.reorderLevel = reorderLevel;
        this.supplierId = supplierId;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
    public int getCurrentStock() { return currentStock; }
    public void setCurrentStock(int currentStock) { this.currentStock = currentStock; }
    public int getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(int reorderLevel) { this.reorderLevel = reorderLevel; }
    public long getSupplierId() { return supplierId; }
    public void setSupplierId(long supplierId) { this.supplierId = supplierId; }
}