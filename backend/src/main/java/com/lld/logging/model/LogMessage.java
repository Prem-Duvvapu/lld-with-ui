package com.lld.logging.model;

public class LogMessage {
    private long id;
    private LogLevel level;
    private String message;
    private String loggerName;
    private long timestamp;

    public LogMessage() {}

    public LogMessage(long id, LogLevel level, String message, String loggerName, long timestamp) {
        this.id = id;
        this.level = level;
        this.message = message;
        this.loggerName = loggerName;
        this.timestamp = timestamp;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public LogLevel getLevel() { return level; }
    public void setLevel(LogLevel level) { this.level = level; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getLoggerName() { return loggerName; }
    public void setLoggerName(String loggerName) { this.loggerName = loggerName; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}