package com.lld.logging.appender;

import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.AppenderType;
import com.lld.logging.model.LogMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class ConsoleAppender implements LogAppender {
    private final String name;
    private volatile boolean enabled;
    private final List<String> logs = new CopyOnWriteArrayList<>();
    private final AtomicLong logCount = new AtomicLong(0);

    public ConsoleAppender() {
        this("ConsoleAppender", true);
    }

    public ConsoleAppender(String name, boolean enabled) {
        this.name = name;
        this.enabled = enabled;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public AppenderType getType() {
        return AppenderType.CONSOLE;
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
        String formatted = formatter != null ? formatter.format(message) : message.getMessage();
        logs.add(formatted);
        logCount.incrementAndGet();
    }

    @Override
    public List<String> getAppenderLogs() {
        return new ArrayList<>(logs);
    }

    @Override
    public AppenderStatus getStatus() {
        return AppenderStatus.builder()
                .name(name)
                .type(AppenderType.CONSOLE)
                .enabled(enabled)
                .logCount(logCount.get())
                .fileSizeBytes(0)
                .activeRotations(0)
                .destination("System.out (Console)")
                .build();
    }

    @Override
    public void clear() {
        logs.clear();
        logCount.set(0);
    }
}
