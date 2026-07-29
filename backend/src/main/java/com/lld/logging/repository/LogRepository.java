package com.lld.logging.repository;

import com.lld.logging.model.LogMessage;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class LogRepository {
    private final Map<Long, LogMessage> storage = new ConcurrentHashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    public LogMessage save(LogMessage msg) {
        long id = idCounter.getAndIncrement();
        LogMessage toSave = new LogMessage(id, msg.getLevel(), msg.getMessage(), msg.getLoggerName(), System.currentTimeMillis());
        storage.put(id, toSave);
        return toSave;
    }

    public List<LogMessage> findAll() {
        List<LogMessage> list = new ArrayList<>(storage.values());
        list.sort(Comparator.comparingLong(LogMessage::getTimestamp));
        return list;
    }

    public void clear() {
        storage.clear();
    }
}
