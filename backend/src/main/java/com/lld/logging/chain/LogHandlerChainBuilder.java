package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

import java.util.ArrayList;
import java.util.List;

public class LogHandlerChainBuilder {

    public static LogHandler buildChain(LogLevel minThreshold) {
        List<LogHandler> handlers = new ArrayList<>();

        if (LogLevel.TRACE.isGreaterOrEqual(minThreshold)) handlers.add(new TraceLogHandler());
        if (LogLevel.DEBUG.isGreaterOrEqual(minThreshold)) handlers.add(new DebugLogHandler());
        if (LogLevel.INFO.isGreaterOrEqual(minThreshold)) handlers.add(new InfoLogHandler());
        if (LogLevel.WARN.isGreaterOrEqual(minThreshold)) handlers.add(new WarnLogHandler());
        if (LogLevel.ERROR.isGreaterOrEqual(minThreshold)) handlers.add(new ErrorLogHandler());
        if (LogLevel.FATAL.isGreaterOrEqual(minThreshold)) handlers.add(new FatalLogHandler());

        if (handlers.isEmpty()) {
            return null;
        }

        LogHandler head = handlers.get(0);
        LogHandler current = head;
        for (int i = 1; i < handlers.size(); i++) {
            current.setNext(handlers.get(i));
            current = handlers.get(i);
        }

        return head;
    }
}
