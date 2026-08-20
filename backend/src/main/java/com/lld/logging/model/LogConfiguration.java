package com.lld.logging.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogConfiguration {
    private LogLevel globalLevel;
    private Map<String, LogLevel> loggerLevels;
    private List<AppenderStatus> appenders;
    private boolean asyncEnabled;
    private FormatterType activeFormatter;
    private int queueCapacity;
    private int currentQueueSize;
    private long totalDroppedLogs;
}
