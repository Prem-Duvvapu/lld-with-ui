package com.lld.logging;

import com.lld.logging.appender.ConsoleAppender;
import com.lld.logging.appender.LogAppender;
import com.lld.logging.chain.LogHandler;
import com.lld.logging.chain.LogHandlerChainBuilder;
import com.lld.logging.formatter.SimpleTextFormatter;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Logging Framework: Chain of Responsibility Unit Tests")
public class LogChainOfResponsibilityTest {

    @Test
    @DisplayName("Chain with INFO threshold processes INFO, WARN, ERROR, FATAL and discards TRACE, DEBUG")
    void testChainWithInfoThreshold() {
        LogHandler chain = LogHandlerChainBuilder.buildChain(LogLevel.INFO);
        assertNotNull(chain);

        ConsoleAppender appender = new ConsoleAppender("TestConsole", true);
        List<LogAppender> appenders = List.of(appender);
        SimpleTextFormatter formatter = new SimpleTextFormatter();

        // 1. TRACE message -> should be rejected by chain
        LogMessage traceMsg = LogMessage.builder().level(LogLevel.TRACE).message("Trace event").timestamp(LocalDateTime.now()).build();
        boolean handledTrace = chain.handle(traceMsg, appenders, formatter, null, false);
        assertFalse(handledTrace, "TRACE should not be handled when threshold is INFO");

        // 2. DEBUG message -> should be rejected by chain
        LogMessage debugMsg = LogMessage.builder().level(LogLevel.DEBUG).message("Debug event").timestamp(LocalDateTime.now()).build();
        boolean handledDebug = chain.handle(debugMsg, appenders, formatter, null, false);
        assertFalse(handledDebug, "DEBUG should not be handled when threshold is INFO");

        // 3. INFO message -> should be processed
        LogMessage infoMsg = LogMessage.builder().level(LogLevel.INFO).message("Info event").timestamp(LocalDateTime.now()).build();
        boolean handledInfo = chain.handle(infoMsg, appenders, formatter, null, false);
        assertTrue(handledInfo, "INFO should be handled when threshold is INFO");

        // 4. ERROR message -> should traverse chain and be processed
        LogMessage errorMsg = LogMessage.builder().level(LogLevel.ERROR).message("Error event").timestamp(LocalDateTime.now()).build();
        boolean handledError = chain.handle(errorMsg, appenders, formatter, null, false);
        assertTrue(handledError, "ERROR should be handled when threshold is INFO");

        assertEquals(2, appender.getAppenderLogs().size(), "Only INFO and ERROR should be appended");
    }

    @Test
    @DisplayName("Chain with TRACE threshold processes all 6 severity levels")
    void testChainWithTraceThreshold() {
        LogHandler chain = LogHandlerChainBuilder.buildChain(LogLevel.TRACE);
        assertNotNull(chain);

        ConsoleAppender appender = new ConsoleAppender("TestConsole", true);
        List<LogAppender> appenders = List.of(appender);
        SimpleTextFormatter formatter = new SimpleTextFormatter();

        for (LogLevel level : LogLevel.values()) {
            LogMessage msg = LogMessage.builder().level(level).message(level.name() + " test").timestamp(LocalDateTime.now()).build();
            boolean handled = chain.handle(msg, appenders, formatter, null, false);
            assertTrue(handled, level.name() + " should be handled under TRACE threshold");
        }

        assertEquals(6, appender.getAppenderLogs().size());
    }

    @Test
    @DisplayName("Chain with FATAL threshold discards everything below FATAL")
    void testChainWithFatalThreshold() {
        LogHandler chain = LogHandlerChainBuilder.buildChain(LogLevel.FATAL);
        assertNotNull(chain);

        ConsoleAppender appender = new ConsoleAppender("TestConsole", true);
        List<LogAppender> appenders = List.of(appender);
        SimpleTextFormatter formatter = new SimpleTextFormatter();

        LogMessage errorMsg = LogMessage.builder().level(LogLevel.ERROR).message("Error event").timestamp(LocalDateTime.now()).build();
        assertFalse(chain.handle(errorMsg, appenders, formatter, null, false));

        LogMessage fatalMsg = LogMessage.builder().level(LogLevel.FATAL).message("Fatal crash").timestamp(LocalDateTime.now()).build();
        assertTrue(chain.handle(fatalMsg, appenders, formatter, null, false));

        assertEquals(1, appender.getAppenderLogs().size());
    }
}
