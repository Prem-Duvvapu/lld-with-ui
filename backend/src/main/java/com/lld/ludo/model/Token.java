package com.lld.ludo.model;

public class Token {
    private int id;
    private String color;
    private int position;
    private boolean isHome;
    private boolean isFinished;

    public Token() {}

    public Token(int id, String color) {
        this.id = id;
        this.color = color;
        this.position = -1;
        this.isHome = true;
        this.isFinished = false;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public boolean isHome() { return isHome; }
    public void setHome(boolean home) { isHome = home; }
    public boolean isFinished() { return isFinished; }
    public void setFinished(boolean finished) { isFinished = finished; }
}