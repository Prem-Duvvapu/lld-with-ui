package com.lld.logging.formatter;

import com.lld.logging.model.FormatterType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Map;

@Component
public class LogFormatterFactory {
    private final Map<FormatterType, LogFormatter> formatters = new EnumMap<>(FormatterType.class);

    public LogFormatterFactory() {
        formatters.put(FormatterType.SIMPLE, new SimpleTextFormatter());
        formatters.put(FormatterType.JSON, new JsonFormatter());
        formatters.put(FormatterType.PATTERN, new PatternFormatter());
    }

    public LogFormatter getFormatter(FormatterType type) {
        return formatters.getOrDefault(type, formatters.get(FormatterType.SIMPLE));
    }
}
