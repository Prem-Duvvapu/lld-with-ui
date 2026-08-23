package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Restaurant {
    private String id;
    private String name;
    private String address;
    private String cuisine;
    private double rating;
    @Builder.Default
    private boolean open = true;
    @Builder.Default
    private List<MenuItem> menu = new ArrayList<>();

    public Restaurant(String id, String name, String address, String cuisine, double rating, List<MenuItem> menu) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.cuisine = cuisine;
        this.rating = rating;
        this.open = true;
        this.menu = menu != null ? menu : new ArrayList<>();
    }

    public void addMenuItem(MenuItem item) {
        if (this.menu == null) this.menu = new ArrayList<>();
        this.menu.add(item);
    }

    public void removeMenuItem(String itemId) {
        if (this.menu != null) {
            this.menu.removeIf(item -> item.getId().equals(itemId));
        }
    }

    public MenuItem getMenuItem(String itemId) {
        if (this.menu != null) {
            for (MenuItem item : this.menu) {
                if (item.getId().equals(itemId)) return item;
            }
        }
        return null;
    }
}
