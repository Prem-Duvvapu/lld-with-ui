package com.lld.elevator.repository;

import com.lld.elevator.model.Direction;
import com.lld.elevator.model.Elevator;
import com.lld.elevator.model.ElevatorStatus;
import com.lld.elevator.model.Request;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class ElevatorRepository {

    private final Map<Integer, Elevator> elevators = new ConcurrentHashMap<>();
    private final Map<Long, Request> requests = new ConcurrentHashMap<>();
    private final AtomicLong requestIdGen = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    @PostConstruct
    public void init() {
        Elevator a = new Elevator(1, "A", 8, 1);
        Elevator b = new Elevator(2, "B", 6, 1);
        Elevator c = new Elevator(3, "C", 10, 5);
        Elevator d = new Elevator(4, "D", 8, 8);
        elevators.put(1, a);
        elevators.put(2, b);
        elevators.put(3, c);
        elevators.put(4, d);
    }

    public void saveElevator(Elevator elevator) {
        lock.lock();
        try {
            elevators.put(elevator.getId(), elevator);
        } finally {
            lock.unlock();
        }
    }

    public Elevator getElevator(int id) {
        return elevators.get(id);
    }

    public List<Elevator> getAllElevators() {
        return new ArrayList<>(elevators.values());
    }

    public void saveRequest(Request request) {
        lock.lock();
        try {
            requests.put(request.getId(), request);
        } finally {
            lock.unlock();
        }
    }

    public Request getRequest(long id) {
        return requests.get(id);
    }

    public List<Request> getAllRequests() {
        return new ArrayList<>(requests.values());
    }

    public List<Request> getPendingRequests() {
        return requests.values().stream()
                .filter(r -> "PENDING".equals(r.getStatus()) || "ASSIGNED".equals(r.getStatus()))
                .collect(Collectors.toList());
    }

    public long nextRequestId() {
        return requestIdGen.getAndIncrement();
    }
}
