package com.lld.logging.logger;

import com.lld.logging.appender.AsyncLogDispatcher;
import com.lld.logging.appender.LogAppender;
import com.lld.logging.chain.LogHandler;
import com.lld.logging.chain.LogHandlerChainBuilder;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import com.lld.logging.repository.LogRepository;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

public class Logger {
    private static final ZoneId ZONE_IST = ZoneId.of("Asia/Kolkata");

    private final String name;
    private volatile LogLevel level;
    private final Logger parent;
    private final List<LogAppender> appenders = new CopyOnWriteArrayList<>();
    private final LogRepository repository;
    private final AsyncLogDispatcher asyncDispatcher;
    private final AtomicBoolean asyncMode = new AtomicBoolean(false);
    private volatile LogFormatter activeFormatter;

    public Logger(String name, LogLevel level, Logger parent, LogRepository repository, AsyncLogDispatcher asyncDispatcher, LogFormatter formatter) {
        this.name = name;
        this.level = level;
        this.parent = parent;
        this.repository = repository;
        this.asyncDispatcher = asyncDispatcher;
        this.activeFormatter = formatter;
    }

    public LogLevel getEffectiveLevel() {
        if (level != null) return level;
        if (parent != null) return parent.getEffectiveLevel();
        return LogLevel.INFO;
    }

    public void setLevel(LogLevel level) {
        this.level = level;
    }

    public void setFormatter(LogFormatter formatter) {
        this.activeFormatter = formatter;
    }

    public void setAsyncMode(boolean async) {
        this.asyncMode.set(async);
    }

    public void addAppender(LogAppender appender) {
        if (!appenders.contains(appender)) {
            appenders.add(appender);
        }
    }

    public List<LogAppender> getEffectiveAppenders() {
        List<LogAppender> allAppenders = new ArrayList<>(this.appenders);
        if (parent != null) {
            for (LogAppender parentAppender : parent.getEffectiveAppenders()) {
                if (!allAppenders.contains(parentAppender)) {
                    allAppenders.add(parentAppender);
                }
            }
        }
        return allAppenders;
    }

    public LogMessage log(LogLevel level, String message, Map<String, Object> context) {
        LogLevel threshold = getEffectiveLevel();
        if (!level.isGreaterOrEqual(threshold)) {
            return null; // filtered out below threshold
        }

        String threadName = Thread.currentThread().getName();
        LogMessage logMessage = LogMessage.builder()
                .level(level)
                .loggerName(this.name)
                .message(message)
                .threadName(threadName)
                .context(context)
                .timestamp(LocalDateTime.now(ZONE_IST))
                .build();

        if (activeFormatter != null) {
            logMessage.setFormattedMessage(activeFormatter.format(logMessage));
        }

        LogMessage saved = repository != null ? repository.save(logMessage) : logMessage;

        // Process through Chain of Responsibility
        LogHandler chainHead = LogHandlerChainBuilder.buildChain(threshold);
        if (chainHead != null) {
            List<LogAppender> targetAppenders = getEffectiveAppenders();
            chainHead.handle(saved, targetAppenders, activeFormatter, asyncDispatcher, asyncMode.get());
        }

        return saved;
    }

    public LogMessage trace(String message) { return log(LogLevel.TRACE, message, null); }
    public LogMessage debug(String message) { return log(LogLevel.DEBUG, message, null); }
    public LogMessage info(String message) { return log(LogLevel.INFO, message, null); }
    public LogMessage warn(String message) { return log(LogLevel.WARN, message, null); }
    public LogMessage error(String message) { return log(LogLevel.ERROR, message, null); }
    public LogMessage fatal(String message) { return log(LogLevel.FATAL, message, null); }

    public String getName() {
        return name;
    }

    public LogLevel getLevel() {
        return level;
    }

    public Logger getParent() {
        return parent;
    }

    public List<LogAppender> getAppenders() {
        return new ArrayList<>(appenders);
    }
}
