package com.lld.logging.model;

import lombok.Getter;

@Getter
public enum LogLevel {
    TRACE(1, "#a855f7", "TRACE"),
    DEBUG(2, "#64748b", "DEBUG"),
    INFO(3, "#22c55e", "INFO"),
    WARN(4, "#eab308", "WARN"),
    ERROR(5, "#ef4444", "ERROR"),
    FATAL(6, "#dc2626", "FATAL");

    private final int severity;
    private final String color;
    private final String label;

    LogLevel(int severity, String color, String label) {
        this.severity = severity;
        this.color = color;
        this.label = label;
    }

    public boolean isGreaterOrEqual(LogLevel threshold) {
        return this.severity >= threshold.severity;
    }
}
