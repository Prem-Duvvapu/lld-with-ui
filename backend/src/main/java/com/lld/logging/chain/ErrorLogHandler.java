package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

public class ErrorLogHandler extends LogHandler {
    public ErrorLogHandler() {
        super(LogLevel.ERROR);
    }
}
