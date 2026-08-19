package com.lld.logging.formatter;

import com.lld.logging.model.FormatterType;
import com.lld.logging.model.LogMessage;

import java.time.format.DateTimeFormatter;

public class SimpleTextFormatter implements LogFormatter {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    @Override
    public String format(LogMessage message) {
        String timestamp = message.getTimestamp() != null
                ? message.getTimestamp().format(DATE_FORMATTER)
                : "N/A";
        String thread = message.getThreadName() != null ? message.getThreadName() : "main";
        String contextStr = (message.getContext() != null && !message.getContext().isEmpty())
                ? " " + message.getContext()
                : "";

        return String.format("[%s] [%-5s] [%s] [%s] - %s%s",
                timestamp,
                message.getLevel(),
                thread,
                message.getLoggerName(),
                message.getMessage(),
                contextStr);
    }

    @Override
    public FormatterType getType() {
        return FormatterType.SIMPLE;
    }
}
