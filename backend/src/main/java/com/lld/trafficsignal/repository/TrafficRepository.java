package com.lld.trafficsignal.repository;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.TrafficLight;
import org.springframework.stereotype.Repository;

import java.util.concurrent.locks.ReentrantLock;

@Repository
public class TrafficRepository {

    private final ReentrantLock lock = new ReentrantLock();
    private Intersection intersection;

    public void setIntersection(Intersection intersection) {
        this.intersection = intersection;
    }

    public Intersection getIntersection() {
        return intersection;
    }

    public void updateLight(int lightId, LightState state, int timer) {
        lock.lock();
        try {
            for (TrafficLight light : intersection.getLights()) {
                if (light.getId() == lightId) {
                    light.setCurrentState(state);
                    light.setTimer(timer);
                    return;
                }
            }
        } finally {
            lock.unlock();
        }
    }

    public void updateAllLights(LightState[] states, int[] timers) {
        lock.lock();
        try {
            for (int i = 0; i < intersection.getLights().size(); i++) {
                intersection.getLights().get(i).setCurrentState(states[i]);
                intersection.getLights().get(i).setTimer(timers[i]);
            }
        } finally {
            lock.unlock();
        }
    }
}
