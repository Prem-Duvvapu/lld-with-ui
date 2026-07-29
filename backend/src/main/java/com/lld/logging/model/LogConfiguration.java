package com.lld.logging.model;

import java.util.List;

public class LogConfiguration {
    private LogLevel activeLevel;
    private List<String> appenders;

    public LogConfiguration() {}

    public LogConfiguration(LogLevel activeLevel, List<String> appenders) {
        this.activeLevel = activeLevel;
        this.appenders = appenders;
    }

    public LogLevel getActiveLevel() { return activeLevel; }
    public void setActiveLevel(LogLevel activeLevel) { this.activeLevel = activeLevel; }
    public List<String> getAppenders() { return appenders; }
    public void setAppenders(List<String> appenders) { this.appenders = appenders; }
}