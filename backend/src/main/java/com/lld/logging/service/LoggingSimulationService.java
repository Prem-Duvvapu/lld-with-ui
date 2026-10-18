package com.lld.logging.service;

import com.lld.logging.appender.*;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.formatter.LogFormatterFactory;
import com.lld.logging.exception.InvalidLogLevelException;
import com.lld.logging.exception.InvalidLoggingRequestException;
import com.lld.logging.logger.LogManager;
import com.lld.logging.logger.Logger;
import com.lld.logging.model.*;
import com.lld.logging.repository.LogRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Isolated Simulation Sandbox Service for educational 8-step pipeline visualizer.
 * Separated from core LoggingService to keep the production LLD clean and focused.
 */
@Service
public class LoggingSimulationService {
    private final LogRepository simRepository = new LogRepository();
    private final List<LogAppender> simAppenders = new CopyOnWriteArrayList<>();
    private final AsyncLogDispatcher simAsyncDispatcher = new AsyncLogDispatcher(20);
    private final LogManager simLogManager;
    private final ReentrantLock lock = new ReentrantLock();

    public LoggingSimulationService(LogFormatterFactory formatterFactory) {
        LogFormatter defaultFormatter = formatterFactory.getFormatter(FormatterType.SIMPLE);
        this.simLogManager = new LogManager(simRepository, simAsyncDispatcher, defaultFormatter);
        this.simLogManager.setGlobalLevel(LogLevel.DEBUG);
        initSimAppenders();
    }

    private void initSimAppenders() {
        simAppenders.add(new ConsoleAppender("SimConsoleAppender", true));
        simAppenders.add(new FileAppender("SimFileAppender", "/sim/app.log", 1024L, 2, true));
        simAppenders.add(new DatabaseAppender("SimDbAppender", true));
        simAppenders.add(new ElasticsearchAppender("SimEsAppender", "sim-logs", true));

        for (LogAppender appender : simAppenders) {
            simLogManager.addGlobalAppender(appender);
        }
    }

    public void simReset() {
        lock.lock();
        try {
            simRepository.clear();
            simAsyncDispatcher.clear();
            for (LogAppender appender : simAppenders) {
                appender.clear();
            }
            simLogManager.setGlobalLevel(LogLevel.DEBUG);
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> simConfigure(String level) {
        LogLevel parsedLevel = LoggingService.parseLogLevel(level);
        lock.lock();
        try {
            simLogManager.setGlobalLevel(parsedLevel);
            return simGetTelemetry();
        } finally {
            lock.unlock();
        }
    }

    public LogMessage simEmitLog(String loggerName, LogLevel level, String message, Map<String, Object> context) {
        if (loggerName == null || loggerName.isBlank()) {
            throw new InvalidLoggingRequestException("Logger name must not be blank");
        }
        if (level == null) {
            throw new InvalidLogLevelException(null);
        }
        lock.lock();
        try {
            Logger logger = simLogManager.getLogger(loggerName);
            return logger.log(level, message, context);
        } finally {
            lock.unlock();
        }
    }

    public LogMessage simEmitLog(String loggerName, String level, String message, Map<String, Object> context) {
        return simEmitLog(loggerName, LoggingService.parseLogLevel(level), message, context);
    }

    public List<LogMessage> simGetLogs() {
        lock.lock();
        try {
            return simRepository.findAll();
        } finally {
            lock.unlock();
        }
    }

    public Map<String, Object> simGetTelemetry() {
        lock.lock();
        try {
            List<AppenderStatus> statuses = new ArrayList<>();
            for (LogAppender app : simAppenders) {
                statuses.add(app.getStatus());
            }

            Map<String, Object> telemetry = new LinkedHashMap<>();
            telemetry.put("totalLogs", simRepository.count());
            telemetry.put("globalLevel", simLogManager.getRootLogger().getEffectiveLevel());
            telemetry.put("formatter", FormatterType.SIMPLE);
            telemetry.put("asyncEnabled", false);
            telemetry.put("queueCapacity", simAsyncDispatcher.getQueueCapacity());
            telemetry.put("currentQueueDepth", simAsyncDispatcher.getCurrentQueueSize());
            telemetry.put("droppedLogs", simAsyncDispatcher.getDroppedCount());
            telemetry.put("appenders", statuses);
            return telemetry;
        } finally {
            lock.unlock();
        }
    }

    public List<String> simGetAppenderLogs(String appenderType) {
        lock.lock();
        try {
            return LoggingService.findAppender(simAppenders, appenderType).getAppenderLogs();
        } finally {
            lock.unlock();
        }
    }
}
