package com.lld.trafficsignal.service;

import com.lld.trafficsignal.model.Intersection;
import com.lld.trafficsignal.model.LightState;
import com.lld.trafficsignal.model.TrafficLight;
import com.lld.trafficsignal.repository.TrafficRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class TrafficService {

    private final TrafficRepository repository;
    private final ReentrantLock lock = new ReentrantLock();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private int currentGreenIndex = 0;
    private int defaultDuration = 10;

    public TrafficService(TrafficRepository repository) {
        this.repository = repository;
    }

    @PostConstruct
    public void init() {
        List<TrafficLight> lights = List.of(
                new TrafficLight(0, "North"),
                new TrafficLight(1, "South"),
                new TrafficLight(2, "East"),
                new TrafficLight(3, "West")
        );
        Intersection intersection = new Intersection(1, "Main Intersection", lights);
        repository.setIntersection(intersection);
        transitionTo(0);
        startAutoTransition();
    }

    public List<TrafficLight> getStatus() {
        return repository.getIntersection().getLights();
    }

    public void transition() {
        lock.lock();
        try {
            int next = (currentGreenIndex + 1) % 4;
            transitionTo(next);
        } finally {
            lock.unlock();
        }
    }

    public void emergencyOverride(int lightId) {
        lock.lock();
        try {
            Intersection intersection = repository.getIntersection();
            intersection.setEmergencyOverride(true);
            for (TrafficLight light : intersection.getLights()) {
                if (light.getId() == lightId) {
                    light.setCurrentState(LightState.GREEN);
                    light.setTimer(defaultDuration);
                } else {
                    light.setCurrentState(LightState.RED);
                    light.setTimer(0);
                }
            }
            currentGreenIndex = lightId;
        } finally {
            lock.unlock();
        }
    }

    public void setTimer(int lightId, int seconds) {
        lock.lock();
        try {
            for (TrafficLight light : repository.getIntersection().getLights()) {
                if (light.getId() == lightId) {
                    light.setTimer(seconds);
                    return;
                }
            }
        } finally {
            lock.unlock();
        }
    }

    private void transitionTo(int index) {
        Intersection intersection = repository.getIntersection();
        List<TrafficLight> lights = intersection.getLights();
        intersection.setEmergencyOverride(false);
        for (int i = 0; i < lights.size(); i++) {
            if (i == index) {
                lights.get(i).setCurrentState(LightState.GREEN);
                lights.get(i).setTimer(defaultDuration);
            } else {
                lights.get(i).setCurrentState(LightState.RED);
                lights.get(i).setTimer(0);
            }
        }
        currentGreenIndex = index;
    }

    private void startAutoTransition() {
        scheduler.scheduleAtFixedRate(() -> {
            lock.lock();
            try {
                Intersection intersection = repository.getIntersection();
                if (intersection.isEmergencyOverride()) return;
                List<TrafficLight> lights = intersection.getLights();
                boolean needsTransition = false;
                for (int i = 0; i < lights.size(); i++) {
                    TrafficLight light = lights.get(i);
                    if (light.getCurrentState() == LightState.GREEN) {
                        light.setTimer(light.getTimer() - 1);
                        if (light.getTimer() <= 0) {
                            needsTransition = true;
                        }
                    }
                }
                if (needsTransition) {
                    int next = (currentGreenIndex + 1) % 4;
                    transitionTo(next);
                }
            } finally {
                lock.unlock();
            }
        }, 1, 1, TimeUnit.SECONDS);
    }
}
