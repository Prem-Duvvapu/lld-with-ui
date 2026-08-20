package com.lld.logging.chain;

import com.lld.logging.model.LogLevel;

public class WarnLogHandler extends LogHandler {
    public WarnLogHandler() {
        super(LogLevel.WARN);
    }
}
