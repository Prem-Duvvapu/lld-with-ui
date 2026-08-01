package com.lld.uber.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Location {
    @JsonAlias({"lat"})
    private double latitude;

    @JsonAlias({"lng"})
    private double longitude;

    private String label;

    public Location() {}

    public Location(double latitude, double longitude, String label) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.label = label;
    }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public double distanceTo(Location other) {
        if (other == null) return 0;
        double dlat = Math.toRadians(other.latitude - this.latitude);
        double dlng = Math.toRadians(other.longitude - this.longitude);
        double a = Math.sin(dlat / 2) * Math.sin(dlat / 2)
                 + Math.cos(Math.toRadians(this.latitude)) * Math.cos(Math.toRadians(other.latitude))
                 * Math.sin(dlng / 2) * Math.sin(dlng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c; // kilometers
    }
}
