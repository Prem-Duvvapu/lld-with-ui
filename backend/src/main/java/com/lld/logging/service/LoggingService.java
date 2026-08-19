package com.lld.logging.service;

import com.lld.logging.appender.*;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.formatter.LogFormatterFactory;
import com.lld.logging.logger.LogManager;
import com.lld.logging.logger.Logger;
import com.lld.logging.model.*;
import com.lld.logging.repository.LogRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class LoggingService {
    private final LogRepository logRepository;
    private final LogFormatterFactory formatterFactory;

    private LogLevel activeLevel = LogLevel.INFO;
    private FormatterType activeFormatterType = FormatterType.SIMPLE;
    private boolean asyncEnabled = false;

    private final List<LogAppender> appenders = new CopyOnWriteArrayList<>();
    private final Map<String, LogLevel> loggerLevelOverrides = new ConcurrentHashMap<>();
    private final AsyncLogDispatcher asyncDispatcher;
    private final LogManager logManager;
    private final ReentrantLock lock = new ReentrantLock();

    // Isolated Simulation Sandbox State
    private final LogRepository simRepository = new LogRepository();
    private final List<LogAppender> simAppenders = new CopyOnWriteArrayList<>();
    private final AsyncLogDispatcher simAsyncDispatcher = new AsyncLogDispatcher(20);
    private final LogManager simLogManager;
    private LogLevel simGlobalLevel = LogLevel.DEBUG;
    private FormatterType simFormatterType = FormatterType.SIMPLE;
    private boolean simAsyncEnabled = false;

    public LoggingService(LogRepository logRepository, LogFormatterFactory formatterFactory) {
        this.logRepository = logRepository;
        this.formatterFactory = formatterFactory;
        this.asyncDispatcher = new AsyncLogDispatcher(50);

        LogFormatter defaultFormatter = formatterFactory.getFormatter(FormatterType.SIMPLE);
        this.logManager = new LogManager(logRepository, asyncDispatcher, defaultFormatter);
        this.simLogManager = new LogManager(simRepository, simAsyncDispatcher, defaultFormatter);

        initAppenders();
        initSimAppenders();
    }

    private void initAppenders() {
        ConsoleAppender consoleAppender = new ConsoleAppender("ConsoleAppender", true);
        FileAppender fileAppender = new FileAppender("FileAppender", "/var/log/app.log", 4096L, 3, true);
        DatabaseAppender dbAppender = new DatabaseAppender("DatabaseAppender", true);
        ElasticsearchAppender esAppender = new ElasticsearchAppender("ElasticsearchAppender", "app-logs", true);

        appenders.add(consoleAppender);
        appenders.add(fileAppender);
        appenders.add(dbAppender);
        appenders.add(esAppender);

        for (LogAppender appender : appenders) {
            logManager.addGlobalAppender(appender);
        }
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

    public LogConfiguration configure(LogLevel level) {
        lock.lock();
        try {
            this.activeLevel = level;
            this.logManager.setGlobalLevel(level);
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogConfiguration setLoggerLevel(String loggerName, LogLevel level) {
        lock.lock();
        try {
            Logger logger = logManager.getLogger(loggerName);
            logger.setLevel(level);
            if (level != null) {
                loggerLevelOverrides.put(loggerName, level);
            } else {
                loggerLevelOverrides.remove(loggerName);
            }
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogConfiguration setFormatter(FormatterType formatterType) {
        lock.lock();
        try {
            this.activeFormatterType = formatterType;
            LogFormatter formatter = formatterFactory.getFormatter(formatterType);
            this.logManager.setFormatter(formatter);
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogConfiguration toggleAppender(String appenderName, boolean enabled) {
        lock.lock();
        try {
            for (LogAppender appender : appenders) {
                if (appender.getName().equalsIgnoreCase(appenderName) || appender.getType().name().equalsIgnoreCase(appenderName)) {
                    appender.setEnabled(enabled);
                }
            }
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogConfiguration setAsyncEnabled(boolean enabled) {
        lock.lock();
        try {
            this.asyncEnabled = enabled;
            this.logManager.setAsyncMode(enabled);
            return getConfiguration();
        } finally {
            lock.unlock();
        }
    }

    public LogMessage log(String loggerName, LogLevel level, String message, Map<String, Object> context) {
        Logger logger = logManager.getLogger(loggerName);
        return logger.log(level, message, context);
    }

    public List<LogMessage> getLogs() {
        return logRepository.findAll();
    }

    public List<String> getAppenderLogs(String appenderType) {
        for (LogAppender appender : appenders) {
            if (appender.getType().name().equalsIgnoreCase(appenderType) || appender.getName().equalsIgnoreCase(appenderType)) {
                return appender.getAppenderLogs();
            }
        }
        return Collections.emptyList();
    }

    public LogConfiguration getConfiguration() {
        List<AppenderStatus> statuses = new ArrayList<>();
        for (LogAppender appender : appenders) {
            statuses.add(appender.getStatus());
        }

        return LogConfiguration.builder()
                .globalLevel(activeLevel)
                .loggerLevels(new HashMap<>(loggerLevelOverrides))
                .appenders(statuses)
                .asyncEnabled(asyncEnabled)
                .activeFormatter(activeFormatterType)
                .queueCapacity(asyncDispatcher.getQueueCapacity())
                .currentQueueSize(asyncDispatcher.getCurrentQueueSize())
                .totalDroppedLogs(asyncDispatcher.getDroppedCount())
                .build();
    }

    public List<LogMessage> triggerBurstLogs(int count) {
        String[] loggers = {"AuthService", "PaymentGateway", "OrderProcessor", "InventoryService", "NotificationHub"};
        LogLevel[] levels = {LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL};
        String[] sampleMsgs = {
                "User authentication token issued",
                "Payment intent created for ₹2499.00",
                "Order state transitioned to CONFIRMED",
                "High database connection latency detected (380ms)",
                "Deadlock detected in inventory reservation lock queue",
                "Order handoff completed successfully",
                "Cache miss on hot product catalog query",
                "Payment gateway timeout retrying transaction",
                "Critical memory heap usage above 92%",
                "Security audit event: multiple failed OTP attempts"
        };

        List<LogMessage> emitted = new ArrayList<>();
        Random random = new Random();

        for (int i = 0; i < count; i++) {
            String logger = loggers[random.nextInt(loggers.length)];
            LogLevel level = levels[random.nextInt(levels.length)];
            String msg = sampleMsgs[random.nextInt(sampleMsgs.length)];
            Map<String, Object> ctx = Map.of(
                    "traceId", "trc-" + (1000 + random.nextInt(9000)),
                    "userId", "usr-" + (100 + random.nextInt(900)),
                    "latencyMs", random.nextInt(500)
            );

            LogMessage logged = log(logger, level, msg, ctx);
            if (logged != null) {
                emitted.add(logged);
            }
        }
        return emitted;
    }

    public void clear() {
        lock.lock();
        try {
            logRepository.clear();
            asyncDispatcher.clear();
            for (LogAppender appender : appenders) {
                appender.clear();
            }
        } finally {
            lock.unlock();
        }
    }

    // ==========================================
    // Simulation Sandbox Methods (/sim/*)
    // ==========================================

    public void simReset() {
        simRepository.clear();
        simAsyncDispatcher.clear();
        for (LogAppender appender : simAppenders) {
            appender.clear();
        }
        simGlobalLevel = LogLevel.DEBUG;
        simLogManager.setGlobalLevel(LogLevel.DEBUG);
    }

    public LogMessage simEmitLog(String loggerName, LogLevel level, String message, Map<String, Object> context) {
        Logger logger = simLogManager.getLogger(loggerName);
        return logger.log(level, message, context);
    }

    public List<LogMessage> simGetLogs() {
        return simRepository.findAll();
    }

    public Map<String, Object> simGetTelemetry() {
        List<AppenderStatus> statuses = new ArrayList<>();
        for (LogAppender app : simAppenders) {
            statuses.add(app.getStatus());
        }

        Map<String, Object> telemetry = new LinkedHashMap<>();
        telemetry.put("totalLogs", simRepository.count());
        telemetry.put("globalLevel", simGlobalLevel);
        telemetry.put("formatter", simFormatterType);
        telemetry.put("asyncEnabled", simAsyncEnabled);
        telemetry.put("queueCapacity", simAsyncDispatcher.getQueueCapacity());
        telemetry.put("currentQueueDepth", simAsyncDispatcher.getCurrentQueueSize());
        telemetry.put("droppedLogs", simAsyncDispatcher.getDroppedCount());
        telemetry.put("appenders", statuses);
        return telemetry;
    }

    public List<String> simGetAppenderLogs(String appenderType) {
        for (LogAppender appender : simAppenders) {
            if (appender.getType().name().equalsIgnoreCase(appenderType) || appender.getName().equalsIgnoreCase(appenderType)) {
                return appender.getAppenderLogs();
            }
        }
        return Collections.emptyList();
    }
}
