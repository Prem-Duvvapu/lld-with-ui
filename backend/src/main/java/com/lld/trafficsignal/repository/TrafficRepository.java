package com.lld.trafficsignal.repository;

import com.lld.trafficsignal.model.Intersection;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Repository
public class TrafficRepository {
    private final Map<Integer, Intersection> intersections = new ConcurrentHashMap<>();
    private final AtomicInteger idGenerator = new AtomicInteger(1);

    public int nextIntersectionId() {
        return idGenerator.getAndIncrement();
    }

    public void save(Intersection intersection) {
        intersections.put(intersection.getId(), intersection);
    }

    public Intersection find(int id) {
        return intersections.get(id);
    }

    public List<Intersection> findAll() {
        return List.copyOf(intersections.values());
    }

    public void clear() {
        intersections.clear();
        idGenerator.set(1);
    }
}
