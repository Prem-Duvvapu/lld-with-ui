package com.lld.logging.repository;

import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
public class LogRepository {
    private static final ZoneId ZONE_IST = ZoneId.of("Asia/Kolkata");

    private final Map<Long, LogMessage> storage = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);
    private final ReentrantLock lock = new ReentrantLock();

    public LogMessage save(LogMessage msg) {
        lock.lock();
        try {
            long id = idCounter.getAndIncrement();
            msg.setId(id);
            if (msg.getTimestamp() == null) {
                msg.setTimestamp(LocalDateTime.now(ZONE_IST));
            }
            storage.put(id, msg);
            return msg;
        } finally {
            lock.unlock();
        }
    }

    public List<LogMessage> findAll() {
        return storage.values().stream()
                .sorted(Comparator.comparing(LogMessage::getId))
                .collect(Collectors.toList());
    }

    public List<LogMessage> findByLevel(LogLevel level) {
        return storage.values().stream()
                .filter(m -> m.getLevel() == level)
                .sorted(Comparator.comparing(LogMessage::getId))
                .collect(Collectors.toList());
    }

    public List<LogMessage> findByLogger(String loggerName) {
        return storage.values().stream()
                .filter(m -> m.getLoggerName().equalsIgnoreCase(loggerName))
                .sorted(Comparator.comparing(LogMessage::getId))
                .collect(Collectors.toList());
    }

    public int count() {
        return storage.size();
    }

    public void clear() {
        lock.lock();
        try {
            storage.clear();
            idCounter.set(1);
        } finally {
            lock.unlock();
        }
    }
}
