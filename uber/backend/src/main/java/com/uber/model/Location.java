package com.uber.model;

public class Location {
    private double lat;
    private double lng;
    private String label;

    public Location() {}

    public Location(double lat, double lng, String label) {
        this.lat = lat;
        this.lng = lng;
        this.label = label;
    }

    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public String getLabel() { return label; }

    public double distanceTo(Location other) {
        double dlat = Math.toRadians(other.lat - this.lat);
        double dlng = Math.toRadians(other.lng - this.lng);
        double a = Math.sin(dlat / 2) * Math.sin(dlat / 2)
                 + Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat))
                 * Math.sin(dlng / 2) * Math.sin(dlng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c;
    }
}
