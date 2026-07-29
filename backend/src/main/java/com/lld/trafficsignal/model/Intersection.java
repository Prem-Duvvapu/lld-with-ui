package com.lld.trafficsignal.model;

import java.util.List;

public class Intersection {
    private int id;
    private String name;
    private List<TrafficLight> lights;
    private boolean emergencyOverride;

    public Intersection(int id, String name, List<TrafficLight> lights) {
        this.id = id;
        this.name = name;
        this.lights = lights;
        this.emergencyOverride = false;
    }

    public List<TrafficLight> getLights() { return lights; }
    public boolean isEmergencyOverride() { return emergencyOverride; }
    public void setEmergencyOverride(boolean emergencyOverride) { this.emergencyOverride = emergencyOverride; }
}
