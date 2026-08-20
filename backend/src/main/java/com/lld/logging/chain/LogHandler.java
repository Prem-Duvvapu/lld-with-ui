package com.lld.logging.chain;

import com.lld.logging.appender.AsyncLogDispatcher;
import com.lld.logging.appender.LogAppender;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;

import java.util.List;

public abstract class LogHandler {
    protected final LogLevel level;
    protected LogHandler nextHandler;

    public LogHandler(LogLevel level) {
        this.level = level;
    }

    public LogHandler setNext(LogHandler nextHandler) {
        this.nextHandler = nextHandler;
        return nextHandler;
    }

    public boolean handle(LogMessage message, List<LogAppender> appenders, LogFormatter formatter, AsyncLogDispatcher asyncDispatcher, boolean isAsync) {
        if (message.getLevel() == this.level) {
            writeLog(message, appenders, formatter, asyncDispatcher, isAsync);
            return true;
        }
        if (nextHandler != null) {
            return nextHandler.handle(message, appenders, formatter, asyncDispatcher, isAsync);
        }
        return false;
    }

    protected void writeLog(LogMessage message, List<LogAppender> appenders, LogFormatter formatter, AsyncLogDispatcher asyncDispatcher, boolean isAsync) {
        if (isAsync && asyncDispatcher != null) {
            asyncDispatcher.dispatch(message, appenders, formatter);
        } else {
            for (LogAppender appender : appenders) {
                if (appender.isEnabled()) {
                    appender.append(message, formatter);
                }
            }
        }
    }

    public LogLevel getLevel() {
        return level;
    }

    public LogHandler getNextHandler() {
        return nextHandler;
    }
}
