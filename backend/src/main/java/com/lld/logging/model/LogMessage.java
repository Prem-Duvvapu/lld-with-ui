package com.lld.logging.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogMessage {
    private long id;
    private LogLevel level;
    private String loggerName;
    private String message;
    private String threadName;
    private Map<String, Object> context;
    private LocalDateTime timestamp;
    private String formattedMessage;
}
