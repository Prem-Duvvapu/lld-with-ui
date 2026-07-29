package com.lld.logging.model;

import java.util.List;

public class LogConfiguration {
    private LogLevel activeLevel;
    private List<String> appenders;

    public LogConfiguration(LogLevel activeLevel, List<String> appenders) {
        this.activeLevel = activeLevel;
        this.appenders = appenders;
    }

    public LogLevel getActiveLevel() { return activeLevel; }
    public List<String> getAppenders() { return appenders; }
}
