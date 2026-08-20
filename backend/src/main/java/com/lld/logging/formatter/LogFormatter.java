package com.lld.logging.formatter;

import com.lld.logging.model.FormatterType;
import com.lld.logging.model.LogMessage;

public interface LogFormatter {
    String format(LogMessage message);
    FormatterType getType();
}
