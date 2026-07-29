package com.lld.ludo.model;

public class Player {
    private int index;
    private String name;
    private String color;

    public Player() {}

    public Player(int index, String name, String color) {
        this.index = index;
        this.name = name;
        this.color = color;
    }

    public int getIndex() { return index; }
    public void setIndex(int index) { this.index = index; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}