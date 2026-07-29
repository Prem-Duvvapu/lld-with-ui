package com.lld.logging.repository;

import com.lld.logging.model.LogMessage;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class LogRepository {

    private final ConcurrentHashMap<Long, LogMessage> store = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public LogMessage save(LogMessage logMessage) {
        long id = idGenerator.getAndIncrement();
        logMessage.setId(id);
        store.put(id, logMessage);
        return logMessage;
    }

    public List<LogMessage> findAll() {
        List<LogMessage> list = new ArrayList<>(store.values());
        Collections.sort(list, (a, b) -> Long.compare(a.getId(), b.getId()));
        return list;
    }

    public void clear() {
        store.clear();
    }
}