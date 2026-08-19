package com.lld.logging;

import com.lld.logging.formatter.LogFormatterFactory;
import com.lld.logging.logger.Logger;
import com.lld.logging.model.*;
import com.lld.logging.repository.LogRepository;
import com.lld.logging.service.LoggingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Logging Framework: Service Integration & Simulation Tests")
public class LoggingServiceTest {

    private LoggingService service;
    private LogRepository repository;

    @BeforeEach
    void setUp() {
        repository = new LogRepository();
        LogFormatterFactory factory = new LogFormatterFactory();
        service = new LoggingService(repository, factory);
        service.clear();
    }

    @Test
    @DisplayName("Log emission respects global level threshold")
    void testGlobalLevelThreshold() {
        service.configure(LogLevel.WARN);

        // DEBUG and INFO should be filtered out
        LogMessage debugRes = service.log("AuthService", LogLevel.DEBUG, "Debug message", null);
        assertNull(debugRes);

        LogMessage infoRes = service.log("AuthService", LogLevel.INFO, "Info message", null);
        assertNull(infoRes);

        // WARN and ERROR should be captured
        LogMessage warnRes = service.log("AuthService", LogLevel.WARN, "Warn message", null);
        assertNotNull(warnRes);

        LogMessage errorRes = service.log("AuthService", LogLevel.ERROR, "Error message", null);
        assertNotNull(errorRes);

        assertEquals(2, service.getLogs().size());
    }

    @Test
    @DisplayName("Per-logger level overrides supersede global level threshold")
    void testLoggerLevelOverrides() {
        service.configure(LogLevel.ERROR); // Global threshold = ERROR

        // Override 'PaymentService' to DEBUG
        service.setLoggerLevel("PaymentService", LogLevel.DEBUG);

        // 'PaymentService' logs DEBUG -> should pass!
        LogMessage debugMsg = service.log("PaymentService", LogLevel.DEBUG, "Payment debug event", null);
        assertNotNull(debugMsg);

        // 'AuthService' logs DEBUG -> should be filtered out by global ERROR threshold
        LogMessage authMsg = service.log("AuthService", LogLevel.DEBUG, "Auth debug event", null);
        assertNull(authMsg);

        assertEquals(1, service.getLogs().size());
    }

    @Test
    @DisplayName("Burst generator emits specified number of multi-level logs")
    void testBurstLogs() {
        service.configure(LogLevel.TRACE);
        List<LogMessage> burst = service.triggerBurstLogs(15);
        assertFalse(burst.isEmpty());
        assertTrue(service.getLogs().size() >= 15);
    }

    @Test
    @DisplayName("Simulation Sandbox operations are isolated from production repository")
    void testSimulationIsolation() {
        service.log("ProdLogger", LogLevel.INFO, "Production event", null);
        service.simEmitLog("SimLogger", LogLevel.INFO, "Simulation event", null);

        assertEquals(1, service.getLogs().size());
        assertEquals("ProdLogger", service.getLogs().get(0).getLoggerName());

        assertEquals(1, service.simGetLogs().size());
        assertEquals("SimLogger", service.simGetLogs().get(0).getLoggerName());
    }
}
