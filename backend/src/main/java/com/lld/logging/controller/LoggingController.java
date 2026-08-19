package com.lld.logging.controller;

import com.lld.logging.model.*;
import com.lld.logging.service.LoggingService;
import com.lld.logging.service.LoggingSimulationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logging")
@CrossOrigin(origins = "*")
@Tag(name = "Logging Framework API", description = "Endpoints for hierarchical logging, level thresholding, formatters, multi-appenders, and async processing")
public class LoggingController {
    private final LoggingService loggingService;
    private final LoggingSimulationService simulationService;

    public LoggingController(LoggingService loggingService, LoggingSimulationService simulationService) {
        this.loggingService = loggingService;
        this.simulationService = simulationService;
    }

    @PostMapping("/configure")
    @Operation(summary = "Set global active log level threshold")
    public ResponseEntity<LogConfiguration> configure(@RequestBody Map<String, String> body) {
        LogLevel level = LogLevel.valueOf(body.getOrDefault("level", "INFO").toUpperCase());
        return ResponseEntity.ok(loggingService.configure(level));
    }

    @PostMapping("/logger-level")
    @Operation(summary = "Set specific log level override for a named logger")
    public ResponseEntity<LogConfiguration> setLoggerLevel(@RequestBody Map<String, String> body) {
        String logger = body.get("loggerName");
        String levelStr = body.get("level");
        LogLevel level = (levelStr != null && !levelStr.equalsIgnoreCase("DEFAULT"))
                ? LogLevel.valueOf(levelStr.toUpperCase())
                : null;
        return ResponseEntity.ok(loggingService.setLoggerLevel(logger, level));
    }

    @PostMapping("/formatter")
    @Operation(summary = "Set active log formatter strategy (SIMPLE, JSON, PATTERN)")
    public ResponseEntity<LogConfiguration> setFormatter(@RequestBody Map<String, String> body) {
        FormatterType type = FormatterType.valueOf(body.getOrDefault("formatter", "SIMPLE").toUpperCase());
        return ResponseEntity.ok(loggingService.setFormatter(type));
    }

    @PostMapping("/appender/toggle")
    @Operation(summary = "Enable or disable a specific appender sink")
    public ResponseEntity<LogConfiguration> toggleAppender(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        boolean enabled = Boolean.parseBoolean(String.valueOf(body.getOrDefault("enabled", true)));
        return ResponseEntity.ok(loggingService.toggleAppender(name, enabled));
    }

    @PostMapping("/async")
    @Operation(summary = "Enable or disable asynchronous background logging")
    public ResponseEntity<LogConfiguration> setAsyncMode(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.parseBoolean(String.valueOf(body.getOrDefault("enabled", true)));
        return ResponseEntity.ok(loggingService.setAsyncEnabled(enabled));
    }

    @PostMapping("/log")
    @Operation(summary = "Emit a log message through the logger hierarchy and chain of responsibility")
    public ResponseEntity<LogMessage> logMessage(@RequestBody Map<String, Object> body) {
        String loggerName = (String) body.getOrDefault("loggerName", "RootLogger");
        LogLevel level = LogLevel.valueOf(((String) body.getOrDefault("level", "INFO")).toUpperCase());
        String message = (String) body.getOrDefault("message", "");
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) body.get("context");

        LogMessage result = loggingService.log(loggerName, level, message, context);
        if (result == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/logs")
    @Operation(summary = "Get all recorded logs from repository")
    public ResponseEntity<List<LogMessage>> getLogs() {
        return ResponseEntity.ok(loggingService.getLogs());
    }

    @GetMapping("/config")
    @Operation(summary = "Get current global logging configuration and appender telemetry")
    public ResponseEntity<LogConfiguration> getConfig() {
        return ResponseEntity.ok(loggingService.getConfiguration());
    }

    @GetMapping("/appenders/{type}/logs")
    @Operation(summary = "Get raw formatted logs written to a specific appender sink")
    public ResponseEntity<List<String>> getAppenderLogs(@PathVariable String type) {
        return ResponseEntity.ok(loggingService.getAppenderLogs(type));
    }

    @PostMapping("/burst")
    @Operation(summary = "Trigger a burst of concurrent multi-level logs for stress testing")
    public ResponseEntity<List<LogMessage>> triggerBurst(@RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(loggingService.triggerBurstLogs(count));
    }

    @PostMapping("/clear")
    @Operation(summary = "Clear all log entries and appender buffers")
    public ResponseEntity<Void> clear() {
        loggingService.clear();
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // Simulation Sandbox Endpoints (/sim/*)
    // ==========================================

    @PostMapping("/sim/reset")
    @Operation(summary = "Reset simulation sandbox state")
    public ResponseEntity<Void> simReset() {
        simulationService.simReset();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sim/log")
    @Operation(summary = "Emit a log in the isolated simulation sandbox")
    public ResponseEntity<LogMessage> simEmitLog(@RequestBody Map<String, Object> body) {
        String loggerName = (String) body.getOrDefault("loggerName", "SimAppLogger");
        LogLevel level = LogLevel.valueOf(((String) body.getOrDefault("level", "INFO")).toUpperCase());
        String message = (String) body.getOrDefault("message", "Simulated event message");
        @SuppressWarnings("unchecked")
        Map<String, Object> context = (Map<String, Object>) body.get("context");

        LogMessage result = simulationService.simEmitLog(loggerName, level, message, context);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sim/logs")
    @Operation(summary = "Get logs from the simulation sandbox")
    public ResponseEntity<List<LogMessage>> simGetLogs() {
        return ResponseEntity.ok(simulationService.simGetLogs());
    }

    @GetMapping("/sim/telemetry")
    @Operation(summary = "Get simulation telemetry HUD metrics")
    public ResponseEntity<Map<String, Object>> simGetTelemetry() {
        return ResponseEntity.ok(simulationService.simGetTelemetry());
    }

    @GetMapping("/sim/appenders/{type}/logs")
    @Operation(summary = "Get simulation appender sink logs")
    public ResponseEntity<List<String>> simGetAppenderLogs(@PathVariable String type) {
        return ResponseEntity.ok(simulationService.simGetAppenderLogs(type));
    }
}
