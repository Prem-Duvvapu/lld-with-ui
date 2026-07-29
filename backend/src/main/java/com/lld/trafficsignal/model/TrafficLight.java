package com.lld.trafficsignal.model;

public class TrafficLight {
    private int id;
    private LightState currentState;
    private int timer;
    private String position;

    public TrafficLight(int id, String position) {
        this.id = id;
        this.position = position;
        this.currentState = LightState.RED;
        this.timer = 10;
    }

    public int getId() { return id; }
    public LightState getCurrentState() { return currentState; }
    public void setCurrentState(LightState currentState) { this.currentState = currentState; }
    public int getTimer() { return timer; }
    public void setTimer(int timer) { this.timer = timer; }
    public String getPosition() { return position; }
}
