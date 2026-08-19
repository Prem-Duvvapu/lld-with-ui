package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

public class FatalLogHandler extends LogHandler {
    public FatalLogHandler() {
        super(LogLevel.FATAL);
    }
}
