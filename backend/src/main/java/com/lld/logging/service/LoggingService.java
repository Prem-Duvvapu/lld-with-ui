package com.lld.logging.service;

import com.lld.logging.model.LogConfiguration;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import com.lld.logging.repository.LogRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class LoggingService {

    private final LogRepository repository;
    private LogLevel activeLevel;
    private final List<String> appenders;
    private final ReentrantLock lock = new ReentrantLock();

    public LoggingService(LogRepository repository) {
        this.repository = repository;
        this.activeLevel = LogLevel.INFO;
        this.appenders = new ArrayList<>();
        this.appenders.add("CONSOLE");
    }

    public void configureLevel(LogLevel level) {
        lock.lock();
        try {
            this.activeLevel = level;
        } finally {
            lock.unlock();
        }
    }

    public void addAppender(String name) {
        lock.lock();
        try {
            if (!appenders.contains(name)) {
                appenders.add(name);
            }
        } finally {
            lock.unlock();
        }
    }

    public LogMessage log(String loggerName, LogLevel level, String message) {
        lock.lock();
        try {
            if (level.ordinal() < activeLevel.ordinal()) {
                return null;
            }
            LogMessage logMessage = new LogMessage(0, level, message, loggerName, System.currentTimeMillis());
            return repository.save(logMessage);
        } finally {
            lock.unlock();
        }
    }

    public List<LogMessage> getLogs() {
        return repository.findAll();
    }

    public LogConfiguration getConfiguration() {
        lock.lock();
        try {
            return new LogConfiguration(activeLevel, new ArrayList<>(appenders));
        } finally {
            lock.unlock();
        }
    }
}