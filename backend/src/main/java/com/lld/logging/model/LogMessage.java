package com.lld.logging.model;

public class LogMessage {
    private long id;
    private LogLevel level;
    private String message;
    private String loggerName;
    private long timestamp;

    public LogMessage(long id, LogLevel level, String message, String loggerName, long timestamp) {
        this.id = id;
        this.level = level;
        this.message = message;
        this.loggerName = loggerName;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public LogLevel getLevel() { return level; }
    public String getMessage() { return message; }
    public String getLoggerName() { return loggerName; }
    public long getTimestamp() { return timestamp; }
}
