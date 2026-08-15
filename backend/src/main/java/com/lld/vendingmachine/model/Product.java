package com.lld.vendingmachine.model;

public class Product {
    private long id;
    private String code;
    private String name;
    private double price;
    private String category;
    private String emoji;

    public Product() {}

    public Product(long id, String code, String name, double price, String category, String emoji) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.price = price;
        this.category = category;
        this.emoji = emoji;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
}
