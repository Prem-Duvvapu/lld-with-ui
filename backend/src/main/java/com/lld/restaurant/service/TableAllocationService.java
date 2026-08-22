package com.lld.restaurant.service;

import com.lld.restaurant.exception.TableNotFoundException;
import com.lld.restaurant.exception.TableUnavailableException;
import com.lld.restaurant.model.RestaurantTable;
import com.lld.restaurant.model.TableStatus;
import com.lld.restaurant.repository.RestaurantRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Service
public class TableAllocationService {

    private final RestaurantRepository repository;
    private final ConcurrentMap<String, ReentrantLock> tableLocks = new ConcurrentHashMap<>();

    public TableAllocationService(RestaurantRepository repository) {
        this.repository = repository;
    }

    private ReentrantLock lockFor(String tableId) {
        return tableLocks.computeIfAbsent(tableId, k -> new ReentrantLock());
    }

    public RestaurantTable occupy(String tableId, int partySize) {
        ReentrantLock lock = lockFor(tableId);
        lock.lock();
        try {
            RestaurantTable table = repository.findTableById(tableId)
                    .orElseThrow(() -> new TableNotFoundException("Table not found: " + tableId));

            if (table.getStatus() != TableStatus.AVAILABLE && table.getStatus() != TableStatus.RESERVED) {
                throw new TableUnavailableException("Table " + tableId + " is currently " + table.getStatus());
            }

            if (partySize > table.getCapacity()) {
                throw new TableUnavailableException("Party size " + partySize + " exceeds table capacity " + table.getCapacity());
            }

            table.setStatus(TableStatus.OCCUPIED);
            return repository.saveTable(table);
        } finally {
            lock.unlock();
        }
    }

    public void release(String tableId) {
        if (tableId == null) {
            return;
        }
        ReentrantLock lock = lockFor(tableId);
        lock.lock();
        try {
            repository.findTableById(tableId).ifPresent(table -> {
                table.setStatus(TableStatus.AVAILABLE);
                table.setCurrentOrderId(null);
                repository.saveTable(table);
            });
        } finally {
            lock.unlock();
        }
    }

    public List<RestaurantTable> findAvailable(int partySize) {
        return repository.findAllTables().stream()
                .filter(t -> t.getStatus() == TableStatus.AVAILABLE && t.getCapacity() >= partySize)
                .sorted(Comparator.comparingInt(RestaurantTable::getCapacity).thenComparing(RestaurantTable::getId))
                .collect(Collectors.toList());
    }
}
