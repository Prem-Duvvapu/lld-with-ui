package com.lld.logging.appender;

import com.lld.logging.formatter.JsonFormatter;
import com.lld.logging.formatter.LogFormatter;
import com.lld.logging.model.AppenderStatus;
import com.lld.logging.model.AppenderType;
import com.lld.logging.model.LogMessage;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public class ElasticsearchAppender implements LogAppender {
    private final String name;
    private final String indexPrefix;
    private volatile boolean enabled;
    private final List<String> indexedDocuments = new CopyOnWriteArrayList<>();
    private final AtomicLong logCount = new AtomicLong(0);
    private final JsonFormatter defaultJsonFormatter = new JsonFormatter();

    public ElasticsearchAppender() {
        this("ElasticsearchAppender", "application-logs", true);
    }

    public ElasticsearchAppender(String name, String indexPrefix, boolean enabled) {
        this.name = name;
        this.indexPrefix = indexPrefix;
        this.enabled = enabled;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public AppenderType getType() {
        return AppenderType.ELASTICSEARCH;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public void append(LogMessage message, LogFormatter formatter) {
        if (!enabled) return;
        long docId = logCount.incrementAndGet();
        String jsonPayload = defaultJsonFormatter.format(message);
        String doc = String.format("PUT /%s/_doc/%d\n%s", indexPrefix, docId, jsonPayload);
        indexedDocuments.add(doc);
    }

    @Override
    public List<String> getAppenderLogs() {
        return new ArrayList<>(indexedDocuments);
    }

    @Override
    public AppenderStatus getStatus() {
        return AppenderStatus.builder()
                .name(name)
                .type(AppenderType.ELASTICSEARCH)
                .enabled(enabled)
                .logCount(logCount.get())
                .fileSizeBytes(0)
                .activeRotations(0)
                .destination("https://es-cluster:9200/" + indexPrefix + "-*")
                .build();
    }

    @Override
    public void clear() {
        indexedDocuments.clear();
        logCount.set(0);
    }
}
