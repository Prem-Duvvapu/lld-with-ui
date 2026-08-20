package com.lld.logging;

import com.lld.logging.formatter.*;
import com.lld.logging.model.FormatterType;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Logging Framework: Log Formatter Strategy Tests")
public class LogFormatterTest {

    private LogMessage message;

    @BeforeEach
    void setUp() {
        message = LogMessage.builder()
                .id(1L)
                .level(LogLevel.INFO)
                .loggerName("PaymentService")
                .message("Payment captured for ₹1200")
                .threadName("Thread-4")
                .context(Map.of("traceId", "trc-8821"))
                .timestamp(LocalDateTime.of(2026, 8, 20, 1, 45, 0))
                .build();
    }

    @Test
    @DisplayName("SimpleTextFormatter formats message into standard bracketed string")
    void testSimpleTextFormatter() {
        SimpleTextFormatter formatter = new SimpleTextFormatter();
        assertEquals(FormatterType.SIMPLE, formatter.getType());

        String result = formatter.format(message);
        assertTrue(result.contains("[2026-08-20 01:45:00.000]"));
        assertTrue(result.contains("[INFO ]"));
        assertTrue(result.contains("[Thread-4]"));
        assertTrue(result.contains("[PaymentService]"));
        assertTrue(result.contains("Payment captured for ₹1200"));
        assertTrue(result.contains("{traceId=trc-8821}"));
    }

    @Test
    @DisplayName("JsonFormatter serializes log message into structured JSON document")
    void testJsonFormatter() {
        JsonFormatter formatter = new JsonFormatter();
        assertEquals(FormatterType.JSON, formatter.getType());

        String result = formatter.format(message);
        assertTrue(result.contains("\"level\":\"INFO\""));
        assertTrue(result.contains("\"logger\":\"PaymentService\""));
        assertTrue(result.contains("\"message\":\"Payment captured for ₹1200\""));
        assertTrue(result.contains("\"traceId\":\"trc-8821\""));
    }

    @Test
    @DisplayName("PatternFormatter interpolates pattern tokens correctly")
    void testPatternFormatter() {
        PatternFormatter formatter = new PatternFormatter("%d | %p | [%c] - %m");
        assertEquals(FormatterType.PATTERN, formatter.getType());

        String result = formatter.format(message);
        assertTrue(result.contains("01:45:00"));
        assertTrue(result.contains("INFO"));
        assertTrue(result.contains("[PaymentService]"));
        assertTrue(result.contains("Payment captured for ₹1200"));
    }

    @Test
    @DisplayName("LogFormatterFactory resolves formatters correctly")
    void testFormatterFactory() {
        LogFormatterFactory factory = new LogFormatterFactory();
        assertInstanceOf(SimpleTextFormatter.class, factory.getFormatter(FormatterType.SIMPLE));
        assertInstanceOf(JsonFormatter.class, factory.getFormatter(FormatterType.JSON));
        assertInstanceOf(PatternFormatter.class, factory.getFormatter(FormatterType.PATTERN));
    }
}
