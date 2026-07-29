package com.lld.trafficsignal.repository;

import com.lld.trafficsignal.model.*;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Repository
public class TrafficRepository {
    private final Intersection intersection;
    private final ReentrantLock lock = new ReentrantLock();

    public TrafficRepository() {
        List<TrafficLight> lights = List.of(
            new TrafficLight(0, "North"),
            new TrafficLight(1, "South"),
            new TrafficLight(2, "East"),
            new TrafficLight(3, "West")
        );
        lights.get(0).setCurrentState(LightState.GREEN); // Start with North Green
        this.intersection = new Intersection(1, "Main Intersection", lights);
    }

    public Intersection getIntersection() {
        lock.lock();
        try {
            return intersection;
        } finally {
            lock.unlock();
        }
    }
}
