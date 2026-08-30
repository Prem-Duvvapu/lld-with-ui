// Sequence diagram content for logging-framework.
// Grounded directly in Logger#log, the level.isGreaterOrEqual(threshold) inline filter,
// LogHandlerChainBuilder's per-level Chain of Responsibility, and appender dispatch —
// corrected after an earlier version invented a "LogLevelFilter" class that performs the
// threshold check as its own chain step. In the real code the threshold check happens
// inline inside Logger#log BEFORE the chain is even built; the Chain of Responsibility
// that actually exists (TraceLogHandler -> DebugLogHandler -> ... -> FatalLogHandler) routes
// an already-accepted message to the ONE handler whose level exactly matches it, not a
// cascading threshold filter.
export default {
  title: 'Logging Framework — Threshold Filter, Level-Routing Chain & Appender Fan-Out',
  description:
    'How Logger#log filters by an inline threshold comparison, formats and persists the message, then hands it to a freshly-built LogHandlerChainBuilder chain that routes it to the ONE LogHandler whose level exactly matches, which fans it out to every effective appender (synchronously, or via AsyncLogDispatcher when async mode is on).',
  flows: [
    {
      id: 'logging-filter-chain-and-dispatch',
      label: 'POST /api/logging/log — threshold check, format, persist, chain-route, fan out to appenders',
      description:
        'An application logs an ERROR message on "RootLogger" (effective threshold INFO). Logger#log passes the inline level.isGreaterOrEqual(threshold) check, builds and formats the LogMessage, saves it to LogRepository, then asks LogHandlerChainBuilder for a fresh chain built for that threshold. The chain walks Trace→Debug→Info→Warn→Error→Fatal; ErrorLogHandler is the one whose level equals ERROR, so it writes to every effective appender (LoggerTest / LogHandlerChainTest cover the routing and threshold-filter behaviour).',
      participants: [
        { id: 'app', name: 'Application\nService', kind: 'actor' },
        { id: 'controller', name: 'LoggingController', kind: 'component', stereotype: 'controller' },
        { id: 'logger', name: 'Logger', kind: 'component', stereotype: 'facade' },
        { id: 'repository', name: 'LogRepository', kind: 'store' },
        { id: 'chainBuilder', name: 'LogHandlerChainBuilder', kind: 'component', stereotype: 'chain' },
        { id: 'errorHandler', name: 'ErrorLogHandler', kind: 'component', stereotype: 'chain' },
        { id: 'consoleAppender', name: 'ConsoleAppender', kind: 'component', stereotype: 'strategy' },
        { id: 'fileAppender', name: 'FileAppender', kind: 'component', stereotype: 'strategy' },
      ],
      steps: [
        { from: 'app', to: 'controller', text: 'POST /api/logging/log {loggerName: "RootLogger", level: "ERROR", message: "Database connection timed out", context: {db: "users"}}' },
        { from: 'controller', to: 'logger', text: 'log(LogLevel.ERROR, "Database connection timed out", context)', activate: 'logger' },
        { from: 'logger', to: 'logger', text: 'getEffectiveLevel() -> INFO ; level.isGreaterOrEqual(INFO)? ERROR >= INFO -> true, not filtered' },
        { from: 'logger', to: 'logger', text: 'build LogMessage {level, loggerName, message, threadName, context, timestamp}; format via activeFormatter' },
        { from: 'logger', to: 'repository', text: 'repository.save(logMessage)', activate: 'repository' },
        { from: 'repository', to: 'logger', text: 'return saved LogMessage (id assigned)', type: 'return', deactivate: 'repository' },
        { from: 'logger', to: 'chainBuilder', text: 'LogHandlerChainBuilder.buildChain(threshold=INFO) -> fresh Info->Warn->Error->Fatal chain', activate: 'chainBuilder' },
        { from: 'chainBuilder', to: 'logger', text: 'return chainHead (InfoLogHandler)', type: 'return', deactivate: 'chainBuilder' },
        { from: 'logger', to: 'errorHandler', text: 'chainHead.handle(saved, effectiveAppenders, formatter, asyncDispatcher, isAsync) — walks Info -> Warn -> Error', activate: 'errorHandler' },
        { type: 'note', over: ['errorHandler'], text: 'message.getLevel() == ERROR matches ErrorLogHandler exactly — the chain stops here, never reaching FatalLogHandler.' },
        { from: 'errorHandler', to: 'consoleAppender', text: '[isAsync=false] appender.append(message, formatter) — for each enabled effective appender' },
        { from: 'errorHandler', to: 'fileAppender', text: 'appender.append(message, formatter)' },
        { from: 'errorHandler', to: 'logger', text: 'return true (handled)', type: 'return', deactivate: 'errorHandler' },
        { from: 'logger', to: 'controller', text: 'return saved LogMessage', type: 'return', deactivate: 'logger' },
        { from: 'controller', to: 'app', text: '200 OK — LogMessage {id, level: ERROR, formattedMessage, appenders it reached}', type: 'return' },
      ],
    },
  ],
};
