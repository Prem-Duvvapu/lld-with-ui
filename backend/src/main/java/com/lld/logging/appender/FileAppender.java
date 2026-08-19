package com.lld.logging.appender;

import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.AppenderType;
import com.lld.logging.model.LogMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

public class FileAppender implements LogAppender {
    private final String name;
    private final String filePath;
    private final long maxBytesPerFile;
    private final int maxBackupIndex;
    private volatile boolean enabled;

    private final List<String> currentFileLines = new CopyOnWriteArrayList<>();
    private final List<List<String>> rotatedFiles = new CopyOnWriteArrayList<>();
    private final AtomicLong currentFileBytes = new AtomicLong(0);
    private final AtomicLong totalLogCount = new AtomicLong(0);
    private final AtomicInteger rotationCount = new AtomicInteger(0);
    private final ReentrantLock lock = new ReentrantLock();

    public FileAppender() {
        this("FileAppender", "/var/log/app.log", 2048L, 3, true);
    }

    public FileAppender(String name, String filePath, long maxBytesPerFile, int maxBackupIndex, boolean enabled) {
        this.name = name;
        this.filePath = filePath;
        this.maxBytesPerFile = maxBytesPerFile;
        this.maxBackupIndex = maxBackupIndex;
        this.enabled = enabled;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public AppenderType getType() {
        return AppenderType.FILE;
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
        byte[] bytes = formatted.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        lock.lock();
        try {
            if (currentFileBytes.get() + bytes.length > maxBytesPerFile && !currentFileLines.isEmpty()) {
                rotate();
            }
            currentFileLines.add(formatted);
            currentFileBytes.addAndGet(bytes.length);
            totalLogCount.incrementAndGet();
        } finally {
            lock.unlock();
        }
    }

    private void rotate() {
        rotatedFiles.add(0, new ArrayList<>(currentFileLines));
        if (rotatedFiles.size() > maxBackupIndex) {
            rotatedFiles.remove(rotatedFiles.size() - 1);
        }
        currentFileLines.clear();
        currentFileBytes.set(0);
        rotationCount.incrementAndGet();
    }

    @Override
    public List<String> getAppenderLogs() {
        List<String> combined = new ArrayList<>();
        combined.addAll(currentFileLines);
        for (int i = 0; i < rotatedFiles.size(); i++) {
            combined.add("--- [Rollover " + filePath + "." + (i + 1) + "] ---");
            combined.addAll(rotatedFiles.get(i));
        }
        return combined;
    }

    @Override
    public AppenderStatus getStatus() {
        return AppenderStatus.builder()
                .name(name)
                .type(AppenderType.FILE)
                .enabled(enabled)
                .logCount(totalLogCount.get())
                .fileSizeBytes(currentFileBytes.get())
                .activeRotations(rotationCount.get())
                .destination(filePath + " (Limit: " + maxBytesPerFile + " B, MaxRotations: " + maxBackupIndex + ")")
                .build();
    }

    @Override
    public void clear() {
        lock.lock();
        try {
            currentFileLines.clear();
            rotatedFiles.clear();
            currentFileBytes.set(0);
            totalLogCount.set(0);
            rotationCount.set(0);
        } finally {
            lock.unlock();
        }
    }
}
