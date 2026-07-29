package com.lld.logging.controller;

import com.lld.logging.model.LogConfiguration;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import com.lld.logging.service.LoggingService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logging")
@CrossOrigin(origins = "*")
public class LoggingController {

    private final LoggingService loggingService;

    public LoggingController(LoggingService loggingService) {
        this.loggingService = loggingService;
    }

    @PostMapping("/configure")
    public LogConfiguration configure(@RequestBody Map<String, String> body) {
        LogLevel level = LogLevel.valueOf(body.get("level").toUpperCase());
        loggingService.configureLevel(level);
        return loggingService.getConfiguration();
    }

    @PostMapping("/appender")
    public LogConfiguration addAppender(@RequestBody Map<String, String> body) {
        loggingService.addAppender(body.get("name"));
        return loggingService.getConfiguration();
    }

    @PostMapping("/log")
    public LogMessage log(@RequestBody Map<String, String> body) {
        String loggerName = body.get("loggerName");
        LogLevel level = LogLevel.valueOf(body.get("level").toUpperCase());
        String message = body.get("message");
        return loggingService.log(loggerName, level, message);
    }

    @GetMapping("/logs")
    public List<LogMessage> getLogs() {
        return loggingService.getLogs();
    }

    @GetMapping("/config")
    public LogConfiguration getConfig() {
        return loggingService.getConfiguration();
    }
}