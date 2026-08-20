package com.lld.logging.formatter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lld.logging.model.FormatterType;
import com.lld.logging.model.LogMessage;

import java.util.LinkedHashMap;
import java.util.Map;

public class JsonFormatter implements LogFormatter {
    private final ObjectMapper objectMapper;

    public JsonFormatter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public String format(LogMessage message) {
        try {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("timestamp", message.getTimestamp() != null ? message.getTimestamp().toString() : null);
            map.put("level", message.getLevel() != null ? message.getLevel().name() : null);
            map.put("logger", message.getLoggerName());
            map.put("thread", message.getThreadName());
            map.put("message", message.getMessage());
            if (message.getContext() != null && !message.getContext().isEmpty()) {
                map.put("context", message.getContext());
            }
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return "{\"error\":\"json_format_failed\",\"rawMessage\":\"" + message.getMessage() + "\"}";
        }
    }

    @Override
    public FormatterType getType() {
        return FormatterType.JSON;
    }
}
