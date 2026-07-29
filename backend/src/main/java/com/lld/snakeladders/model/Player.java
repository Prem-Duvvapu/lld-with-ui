package com.lld.snakeladders.model;

public class Player {
    private String name;
    private int position;
    private String color;

    public Player(String name, String color) {
        this.name = name;
        this.color = color;
        this.position = 0;
    }

    public String getName() { return name; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getColor() { return color; }
}
