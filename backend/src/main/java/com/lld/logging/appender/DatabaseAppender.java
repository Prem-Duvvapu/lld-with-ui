package com.lld.logging.appender;

import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.AppenderType;
import com.lld.logging.model.LogMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class DatabaseAppender implements LogAppender {
    private final String name;
    private volatile boolean enabled;
    private final List<String> dbRecords = new CopyOnWriteArrayList<>();
    private final AtomicLong logCount = new AtomicLong(0);

    public DatabaseAppender() {
        this("DatabaseAppender", true);
    }

    public DatabaseAppender(String name, boolean enabled) {
        this.name = name;
        this.enabled = enabled;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public AppenderType getType() {
        return AppenderType.DATABASE;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public void append(LogMessage message, LogFormatter formatter) {
        if (!enabled) return;
        long recordId = logCount.incrementAndGet();
        String record = String.format("INSERT INTO logs_tbl(id, level, logger, message, timestamp) VALUES (%d, '%s', '%s', '%s', '%s')",
                recordId,
                message.getLevel(),
                message.getLoggerName(),
                message.getMessage().replace("'", "''"),
                message.getTimestamp());
        dbRecords.add(record);
    }

    @Override
    public List<String> getAppenderLogs() {
        return new ArrayList<>(dbRecords);
    }

    @Override
    public AppenderStatus getStatus() {
        return AppenderStatus.builder()
                .name(name)
                .type(AppenderType.DATABASE)
                .enabled(enabled)
                .logCount(logCount.get())
                .fileSizeBytes(0)
                .activeRotations(0)
                .destination("jdbc:postgresql://cluster/logs_db.public.logs_tbl")
                .build();
    }

    @Override
    public void clear() {
        dbRecords.clear();
        logCount.set(0);
    }
}
