package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

public class DebugLogHandler extends LogHandler {
    public DebugLogHandler() {
        super(LogLevel.DEBUG);
    }
}
