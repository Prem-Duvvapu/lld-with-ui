package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

public class TraceLogHandler extends LogHandler {
    public TraceLogHandler() {
        super(LogLevel.TRACE);
    }
}
