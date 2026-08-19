package com.lld.logging;

import com.lld.logging.appender.*;
import com.lld.logging.formatter.SimpleTextFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Logging Framework: Appender Sink Unit Tests")
public class LogAppenderTest {

    private SimpleTextFormatter formatter;
    private LogMessage msg;

    @BeforeEach
    void setUp() {
        formatter = new SimpleTextFormatter();
        msg = LogMessage.builder()
                .id(1L)
                .level(LogLevel.WARN)
                .loggerName("OrderService")
                .message("High latency detected")
                .threadName("main")
                .timestamp(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("ConsoleAppender captures logs when enabled and ignores when disabled")
    void testConsoleAppender() {
        ConsoleAppender appender = new ConsoleAppender("Console", true);
        appender.append(msg, formatter);
        assertEquals(1, appender.getAppenderLogs().size());

        appender.setEnabled(false);
        appender.append(msg, formatter);
        assertEquals(1, appender.getAppenderLogs().size(), "Disabled appender should not capture logs");

        AppenderStatus status = appender.getStatus();
        assertEquals("Console", status.getName());
        assertFalse(status.isEnabled());
    }

    @Test
    @DisplayName("FileAppender rotates file when byte threshold is exceeded")
    void testFileAppenderRotation() {
        // Max 100 bytes per file
        FileAppender appender = new FileAppender("FileAppender", "/log/test.log", 100L, 2, true);

        // Send 10 messages -> will force multiple file rotations
        for (int i = 0; i < 10; i++) {
            LogMessage m = LogMessage.builder()
                    .id((long) i)
                    .level(LogLevel.INFO)
                    .loggerName("Auth")
                    .message("User login iteration " + i)
                    .timestamp(LocalDateTime.now())
                    .build();
            appender.append(m, formatter);
        }

        AppenderStatus status = appender.getStatus();
        assertTrue(status.getActiveRotations() > 0, "File rotation should have triggered");

        List<String> logs = appender.getAppenderLogs();
        assertTrue(logs.stream().anyMatch(l -> l.contains("Rollover")), "Logs should contain rollover headers");
    }

    @Test
    @DisplayName("DatabaseAppender formats SQL insert statements")
    void testDatabaseAppender() {
        DatabaseAppender appender = new DatabaseAppender("DB", true);
        appender.append(msg, formatter);

        List<String> logs = appender.getAppenderLogs();
        assertEquals(1, logs.size());
        assertTrue(logs.get(0).startsWith("INSERT INTO logs_tbl"));
        assertTrue(logs.get(0).contains("'WARN'"));
        assertTrue(logs.get(0).contains("'OrderService'"));
    }

    @Test
    @DisplayName("ElasticsearchAppender formats ES document PUT requests")
    void testElasticsearchAppender() {
        ElasticsearchAppender appender = new ElasticsearchAppender("ES", "es-logs", true);
        appender.append(msg, formatter);

        List<String> logs = appender.getAppenderLogs();
        assertEquals(1, logs.size());
        assertTrue(logs.get(0).startsWith("PUT /es-logs/_doc/1"));
        assertTrue(logs.get(0).contains("\"logger\":\"OrderService\""));
    }
}
