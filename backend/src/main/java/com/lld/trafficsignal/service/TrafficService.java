package com.lld.trafficsignal.service;

import com.lld.trafficsignal.model.*;
import com.lld.trafficsignal.repository.TrafficRepository;
import org.springframework.stereotype.Service;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class TrafficService {
    private final TrafficRepository repository;
    private final ReentrantLock lock = new ReentrantLock();
    private int currentGreenLightIndex = 0;

    public TrafficService(TrafficRepository repository) {
        this.repository = repository;
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::tick, 1, 1, TimeUnit.SECONDS);
    }

    private void tick() {
        lock.lock();
        try {
            if (repository.getIntersection().isEmergencyOverride()) return;
            
            TrafficLight greenLight = repository.getIntersection().getLights().get(currentGreenLightIndex);
            if (greenLight.getTimer() > 0) {
                greenLight.setTimer(greenLight.getTimer() - 1);
            } else {
                transition();
            }
        } finally {
            lock.unlock();
        }
    }

    public void transition() {
        lock.lock();
        try {
            repository.getIntersection().getLights().forEach(l -> {
                l.setCurrentState(LightState.RED);
                l.setTimer(10);
            });
            currentGreenLightIndex = (currentGreenLightIndex + 1) % 4;
            repository.getIntersection().getLights().get(currentGreenLightIndex).setCurrentState(LightState.GREEN);
        } finally {
            lock.unlock();
        }
    }

    public void emergencyOverride(int lightId) {
        lock.lock();
        try {
            repository.getIntersection().setEmergencyOverride(true);
            repository.getIntersection().getLights().forEach(l -> l.setCurrentState(LightState.RED));
            repository.getIntersection().getLights().get(lightId).setCurrentState(LightState.GREEN);
            // Reset override after 5 seconds
            Executors.newSingleThreadScheduledExecutor().schedule(() -> {
                lock.lock();
                try {
                    repository.getIntersection().setEmergencyOverride(false);
                } finally {
                    lock.unlock();
                }
            }, 5, TimeUnit.SECONDS);
        } finally {
            lock.unlock();
        }
    }

    public Intersection getStatus() {
        return repository.getIntersection();
    }
}
