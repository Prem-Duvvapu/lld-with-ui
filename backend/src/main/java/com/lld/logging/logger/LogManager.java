package com.lld.logging.logger;

import com.lld.logging.appender.AsyncLogDispatcher;
import com.lld.logging.appender.LogAppender;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.LogLevel;
import com.lld.logging.repository.LogRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public class LogManager {
    private final Map<String, Logger> loggers = new ConcurrentHashMap<>();
    private final Logger rootLogger;
    private final LogRepository repository;
    private final AsyncLogDispatcher asyncDispatcher;
    private volatile LogFormatter activeFormatter;
    private final ReentrantLock lock = new ReentrantLock();

    public LogManager(LogRepository repository, AsyncLogDispatcher asyncDispatcher, LogFormatter defaultFormatter) {
        this.repository = repository;
        this.asyncDispatcher = asyncDispatcher;
        this.activeFormatter = defaultFormatter;
        this.rootLogger = new Logger("ROOT", LogLevel.INFO, null, repository, asyncDispatcher, defaultFormatter);
        loggers.put("ROOT", rootLogger);
    }

    public Logger getLogger(String name) {
        if (name == null || name.trim().isEmpty() || "ROOT".equalsIgnoreCase(name)) {
            return rootLogger;
        }

        Logger existing = loggers.get(name);
        if (existing != null) {
            return existing;
        }

        lock.lock();
        try {
            if (loggers.containsKey(name)) {
                return loggers.get(name);
            }

            // Find parent logger
            Logger parent = findParentLogger(name);
            Logger newLogger = new Logger(name, null, parent, repository, asyncDispatcher, activeFormatter);
            loggers.put(name, newLogger);
            return newLogger;
        } finally {
            lock.unlock();
        }
    }

    private Logger findParentLogger(String name) {
        int lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
            String parentName = name.substring(0, lastDot);
            return getLogger(parentName);
        }
        return rootLogger;
    }

    public Logger getRootLogger() {
        return rootLogger;
    }

    public List<Logger> getAllLoggers() {
        return new ArrayList<>(loggers.values());
    }

    public void setGlobalLevel(LogLevel level) {
        rootLogger.setLevel(level);
    }

    public void setFormatter(LogFormatter formatter) {
        this.activeFormatter = formatter;
        for (Logger logger : loggers.values()) {
            logger.setFormatter(formatter);
        }
    }

    public void setAsyncMode(boolean async) {
        for (Logger logger : loggers.values()) {
            logger.setAsyncMode(async);
        }
    }

    public void addGlobalAppender(LogAppender appender) {
        rootLogger.addAppender(appender);
    }
}
