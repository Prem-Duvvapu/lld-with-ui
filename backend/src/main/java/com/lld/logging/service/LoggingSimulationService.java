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
import java.util.concurrent.CopyOnWriteArrayList;

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
    private LogLevel simGlobalLevel = LogLevel.DEBUG;
    private FormatterType simFormatterType = FormatterType.SIMPLE;
    private boolean simAsyncEnabled = false;

    public LoggingSimulationService(LogFormatterFactory formatterFactory) {
        LogFormatter defaultFormatter = formatterFactory.getFormatter(FormatterType.SIMPLE);
        this.simLogManager = new LogManager(simRepository, simAsyncDispatcher, defaultFormatter);
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
