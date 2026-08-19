package com.lld.logging.appender;

import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.AppenderType;
import com.lld.logging.model.LogMessage;

import java.util.List;

public interface LogAppender {
    String getName();
    AppenderType getType();
    boolean isEnabled();
    void setEnabled(boolean enabled);
    void append(LogMessage message, LogFormatter formatter);
    List<String> getAppenderLogs();
    AppenderStatus getStatus();
    void clear();
}
