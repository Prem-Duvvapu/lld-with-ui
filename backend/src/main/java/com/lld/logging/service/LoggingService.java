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
    private final LogRepository logRepository;
    private LogLevel activeLevel = LogLevel.INFO;
    private final List<String> appenders = new ArrayList<>(List.of("CONSOLE"));
    private final ReentrantLock lock = new ReentrantLock();

    public LoggingService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    public LogConfiguration configure(LogLevel level) {
        lock.lock();
        try {
            this.activeLevel = level;
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogConfiguration addAppender(String appender) {
        lock.lock();
        try {
            if (!appenders.contains(appender)) {
                appenders.add(appender);
            }
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogMessage log(String loggerName, LogLevel level, String message) {
        lock.lock();
        try {
            if (level.ordinal() < activeLevel.ordinal()) {
                return null; // filtered out by log level
            }
            LogMessage msg = new LogMessage(0, level, message, loggerName, System.currentTimeMillis());
            return logRepository.save(msg);
        } finally {
            lock.unlock();
        }
    }

    public List<LogMessage> getLogs() {
        return logRepository.findAll();
    }

    public LogConfiguration getConfiguration() {
        return new LogConfiguration(activeLevel, new ArrayList<>(appenders));
    }

    public void clear() {
        logRepository.clear();
    }
}
