package com.lld.logging;

import com.lld.logging.formatter.LogFormatterFactory;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.exception.InvalidLogLevelException;
import com.lld.logging.exception.InvalidLoggingRequestException;
import com.lld.logging.repository.LogRepository;
import com.lld.logging.service.LoggingService;
import com.lld.logging.service.LoggingSimulationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class LoggingSimulationServiceTest {
    @Test
    void startupThresholdMatchesTheReportedLevelBeforeAnyReset() {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        assertEquals(LogLevel.DEBUG, sandbox.simGetTelemetry().get("globalLevel"));
        assertNotNull(sandbox.simEmitLog("Startup", LogLevel.DEBUG, "First debug event", null));
    }

    @Test
    void configuredThresholdControlsBothStorageAndAllSinks() {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        assertEquals(LogLevel.ERROR, sandbox.simConfigure(" error ").get("globalLevel"));
        assertNull(sandbox.simEmitLog("Orders", "WARN", "Filtered warning", null));
        assertTrue(sandbox.simGetLogs().isEmpty());
        for (String sink : List.of("CONSOLE", "FILE", "DATABASE", "ELASTICSEARCH")) {
            assertTrue(sandbox.simGetAppenderLogs(sink).isEmpty());
        }
        assertNotNull(sandbox.simEmitLog("Orders", "ERROR", "Accepted error", Map.of("traceId", "test-42")));
        assertEquals(1, sandbox.simGetLogs().size());
        for (String sink : List.of("CONSOLE", "FILE", "DATABASE", "ELASTICSEARCH")) {
            List<String> records = sandbox.simGetAppenderLogs(sink);
            assertEquals(1, records.size());
            assertTrue(records.get(0).contains("Accepted error"));
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "VERBOSE"})
    void invalidThresholdLeavesTheExistingConfigurationUntouched(String level) {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        sandbox.simConfigure("WARN");
        assertThrows(InvalidLogLevelException.class, () -> sandbox.simConfigure(level));
        assertEquals(LogLevel.WARN, sandbox.simGetTelemetry().get("globalLevel"));
    }

    @Test
    void resetRestoresTheReportedDefaultsAndClearsEverySink() {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        sandbox.simConfigure("TRACE");
        sandbox.simEmitLog("Orders", "TRACE", "Before reset", null);
        sandbox.simReset();
        Map<String, Object> telemetry = sandbox.simGetTelemetry();
        assertEquals(LogLevel.DEBUG, telemetry.get("globalLevel"));
        assertEquals(false, telemetry.get("asyncEnabled"));
        assertEquals(20, telemetry.get("queueCapacity"));
        assertEquals(0, telemetry.get("currentQueueDepth"));
        assertEquals(0, telemetry.get("totalLogs"));
        assertTrue(sandbox.simGetLogs().isEmpty());
        for (String sink : List.of("CONSOLE", "FILE", "DATABASE", "ELASTICSEARCH")) {
            assertTrue(sandbox.simGetAppenderLogs(sink).isEmpty());
        }
        assertNotNull(sandbox.simEmitLog("Orders", "DEBUG", "After reset", null));
    }

    @Test
    void sandboxConfigurationAndResetDoNotChangeLiveLogsOrSettings() {
        LogFormatterFactory factory = new LogFormatterFactory();
        LoggingService live = new LoggingService(new LogRepository(), factory);
        live.configure("WARN");
        live.log("Live", "ERROR", "Keep this live event", null);
        LoggingSimulationService sandbox = new LoggingSimulationService(factory);
        sandbox.simConfigure("TRACE");
        sandbox.simEmitLog("Sandbox", "INFO", "Demo only", null);
        sandbox.simReset();
        assertEquals(LogLevel.WARN, live.getConfiguration().getGlobalLevel());
        assertEquals(1, live.getLogs().size());
        assertEquals("Keep this live event", live.getLogs().get(0).getMessage());
        assertEquals(1, live.getAppenderLogs("CONSOLE").size());
    }

    @Test
    void invalidLoggerAndNullLevelUseTypedValidation() {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        assertThrows(InvalidLoggingRequestException.class,
                () -> sandbox.simEmitLog(" ", "INFO", "Bad logger", null));
        assertThrows(InvalidLogLevelException.class,
                () -> sandbox.simEmitLog("Orders", (LogLevel) null, "Bad level", null));
        assertTrue(sandbox.simGetLogs().isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    void telemetryRemainsConsistentWhileEmissionAndResetRace() throws Exception {
        LoggingSimulationService sandbox = new LoggingSimulationService(new LogFormatterFactory());
        ExecutorService workers = Executors.newFixedThreadPool(3);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<?> writer = workers.submit(() -> {
                start.await();
                for (int iteration = 0; iteration < 100; iteration++) {
                    sandbox.simEmitLog("Concurrent", "INFO", "Event " + iteration, null);
                }
                return null;
            });
            Future<?> resetter = workers.submit(() -> {
                start.await();
                for (int iteration = 0; iteration < 50; iteration++) sandbox.simReset();
                return null;
            });
            Future<?> reader = workers.submit(() -> {
                start.await();
                for (int iteration = 0; iteration < 200; iteration++) {
                    Map<String, Object> snapshot = sandbox.simGetTelemetry();
                    long count = ((Number) snapshot.get("totalLogs")).longValue();
                    List<AppenderStatus> appenders = (List<AppenderStatus>) snapshot.get("appenders");
                    for (AppenderStatus appender : appenders) assertEquals(count, appender.getLogCount());
                }
                return null;
            });
            start.countDown();
            for (Future<?> worker : List.of(writer, resetter, reader)) worker.get(15, TimeUnit.SECONDS);
        } finally {
            workers.shutdownNow();
        }
    }
}
