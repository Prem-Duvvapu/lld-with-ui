package com.lld.logging.controller;

import com.lld.logging.model.LogConfiguration;
import com.lld.logging.model.LogLevel;
import com.lld.logging.model.LogMessage;
import com.lld.logging.service.LoggingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<LogConfiguration> configure(@RequestBody Map<String, String> body) {
        LogLevel level = LogLevel.valueOf(body.getOrDefault("level", "INFO"));
        return ResponseEntity.ok(loggingService.configure(level));
    }

    @PostMapping("/appender")
    public ResponseEntity<LogConfiguration> addAppender(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "CONSOLE");
        return ResponseEntity.ok(loggingService.addAppender(name));
    }

    @PostMapping("/log")
    public ResponseEntity<LogMessage> logMessage(@RequestBody Map<String, Object> body) {
        String loggerName = (String) body.getOrDefault("loggerName", "RootLogger");
        LogLevel level = LogLevel.valueOf((String) body.getOrDefault("level", "INFO"));
        String message = (String) body.getOrDefault("message", "");
        LogMessage result = loggingService.log(loggerName, level, message);
        if (result == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/logs")
    public ResponseEntity<List<LogMessage>> getLogs() {
        return ResponseEntity.ok(loggingService.getLogs());
    }

    @GetMapping("/config")
    public ResponseEntity<LogConfiguration> getConfig() {
        return ResponseEntity.ok(loggingService.getConfiguration());
    }

    @PostMapping("/clear")
    public ResponseEntity<Void> clear() {
        loggingService.clear();
        return ResponseEntity.ok().build();
    }
}
