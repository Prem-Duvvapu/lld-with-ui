package com.lld.logging.formatter;

import com.lld.logging.model.FormatterType;
import com.lld.logging.model.LogMessage;

import java.time.format.DateTimeFormatter;

public class PatternFormatter implements LogFormatter {
    private final String pattern;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    public PatternFormatter() {
        this("%d | %-5p | [%c] (%t): %m");
    }

    public PatternFormatter(String pattern) {
        this.pattern = pattern;
    }

    @Override
    public String format(LogMessage message) {
        String timeStr = message.getTimestamp() != null ? message.getTimestamp().format(DATE_FORMATTER) : "00:00:00";
        String levelStr = message.getLevel() != null ? message.getLevel().name() : "INFO";
        String loggerStr = message.getLoggerName() != null ? message.getLoggerName() : "root";
        String threadStr = message.getThreadName() != null ? message.getThreadName() : "main";
        String msgStr = message.getMessage() != null ? message.getMessage() : "";

        return pattern
                .replace("%d", timeStr)
                .replace("%-5p", String.format("%-5s", levelStr))
                .replace("%p", levelStr)
                .replace("%c", loggerStr)
                .replace("%t", threadStr)
                .replace("%m", msgStr);
    }

    @Override
    public FormatterType getType() {
        return FormatterType.PATTERN;
    }
}
