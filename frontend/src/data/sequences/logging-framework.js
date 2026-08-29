// Sequence diagram content for logging-framework.
// Grounded directly in LoggingService, LogLevel filtering (Chain of Responsibility),
// and Appender strategy dispatch (ConsoleAppender, FileAppender, DatabaseAppender).
export default {
  title: 'Logging Framework — Chain of Responsibility Filter & Multi-Appender Fan-Out',
  description:
    'How LoggingFramework filters messages by severity level and fans out formatted messages across configured appenders (Console, File, Database) via Chain of Responsibility and Strategy patterns.',
  flows: [
    {
      id: 'logging-filter-and-dispatch',
      label: 'Log event passes level filter → Formatted and dispatched to appenders',
      description:
        'An application service logs an ERROR message. LoggingService filters the message through the LogLevel hierarchy (INFO < WARN < ERROR), formats the message with timestamp and thread context, and asynchronously dispatches to ConsoleAppender and FileAppender.',
      participants: [
        { id: 'app', name: 'Application\nService', kind: 'actor' },
        { id: 'controller', name: 'Logging\nController', kind: 'component', stereotype: 'controller' },
        { id: 'logger', name: 'Logger / \nLoggingService', kind: 'component', stereotype: 'facade' },
        { id: 'filterChain', name: 'LogLevelFilter\n(Chain of Resp.)', kind: 'component', stereotype: 'chain' },
        { id: 'formatter', name: 'LogFormatter', kind: 'component' },
        { id: 'consoleAppender', name: 'Console\nAppender', kind: 'component', stereotype: 'strategy' },
        { id: 'fileAppender', name: 'File\nAppender', kind: 'component', stereotype: 'strategy' },
      ],
      steps: [
        { from: 'app', to: 'controller', text: 'POST /api/logging/log {level: "ERROR", message: "Database connection timed out", context: {db: "users"}}' },
        { from: 'controller', to: 'logger', text: 'log(LogLevel.ERROR, "Database connection timed out", context)', activate: 'logger' },
        { from: 'logger', to: 'filterChain', text: 'isLoggable(LogLevel.ERROR, threshold=INFO)', activate: 'filterChain' },
        { from: 'filterChain', to: 'logger', text: 'return true (ERROR >= INFO) ✓', type: 'return', deactivate: 'filterChain' },
        { from: 'logger', to: 'formatter', text: 'format(LogEvent {ERROR, "Database connection timed out", timestamp, thread})', activate: 'formatter' },
        { from: 'formatter', to: 'logger', text: 'return "[2026-08-29 08:30:00.123] [main] ERROR Database connection timed out"', type: 'return', deactivate: 'formatter' },
        { from: 'logger', to: 'consoleAppender', text: 'append(formattedLog) — write to standard error stream' },
        { from: 'logger', to: 'fileAppender', text: 'append(formattedLog) — flush to rotating app.log file' },
        { from: 'logger', to: 'controller', text: 'return LogResult {status: DELIVERED, appenders: ["Console", "File"]}', type: 'return', deactivate: 'logger' },
        { from: 'controller', to: 'app', text: '200 OK — Log event recorded', type: 'return' },
      ],
    },
  ],
};
