// designDetails — loggingFramework
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Logging Framework — Design Details',
  requirements: [
    'Support multiple log levels: TRACE (1), DEBUG (2), INFO (3), WARN (4), ERROR (5), FATAL (6) with numeric severity ranks',
    'Chain of Responsibility Pattern for dynamic log level threshold evaluation and handler traversal',
    'Multiple Appender Sinks (Observer & Strategy): ConsoleAppender, FileAppender (with file rotation app.log.1, app.log.2), DatabaseAppender, ElasticsearchAppender',
    'Formatter Strategy Pattern: SimpleTextFormatter, JsonFormatter, and PatternFormatter with MDC context tags (traceId, userId, threadName)',
    'Asynchronous non-blocking logging via AsyncLogDispatcher using bounded ArrayBlockingQueue (capacity 50) with drop metrics',
    'Hierarchical Loggers: Named parent-child inheritance (Root -> com.lld -> auth / payment) with per-logger level overrides',
    'Thread safety using ReentrantLock, ConcurrentHashMap, CopyOnWriteArrayList, and AtomicLong counters'
  ],
  entities: [
    {
      name: 'Logger',
      description: 'Hierarchical named logger supporting MDC context maps, parent-child level inheritance, and Chain of Responsibility dispatching.',
      fields: [
        {
          name: 'name',
          type: 'String',
          description: 'Fully qualified logger identifier'
        },
        {
          name: 'level',
          type: 'LogLevel',
          description: 'Log level threshold override (inherits from parent if null)'
        },
        {
          name: 'parent',
          type: 'Logger',
          description: 'Parent logger in hierarchy'
        },
        {
          name: 'appenders',
          type: 'List<LogAppender>',
          description: 'Appenders attached to this logger'
        }
      ],
      methods: [
        {
          name: 'log(level, msg, context)',
          returns: 'LogMessage',
          description: 'Processes log message through Chain of Responsibility and Appenders'
        },
        {
          name: 'info(msg)',
          returns: 'LogMessage',
          description: 'Convenience helper for INFO level logging'
        },
        {
          name: 'error(msg)',
          returns: 'LogMessage',
          description: 'Convenience helper for ERROR level logging'
        }
      ]
    },
    {
      name: 'LogHandler (Chain of Responsibility)',
      description: 'Abstract base handler for log level filtering. Concrete handlers (Trace, Debug, Info, Warn, Error, Fatal) form a processing pipeline.',
      fields: [
        {
          name: 'level',
          type: 'LogLevel',
          description: 'Severity level this handler processes'
        },
        {
          name: 'nextHandler',
          type: 'LogHandler',
          description: 'Next handler in execution chain'
        }
      ],
      methods: [
        {
          name: 'handle(msg, appenders, formatter, asyncDispatcher, isAsync)',
          returns: 'boolean',
          description: 'Evaluates severity and dispatches to appenders or forwards to next handler'
        }
      ]
    },
    {
      name: 'LogAppender (Strategy & Observer)',
      description: 'Interface for output destinations. Concrete appenders format and write log messages to Console, Rotating Files, Database, or Elasticsearch.',
      fields: [
        {
          name: 'name',
          type: 'String',
          description: 'Unique appender identifier'
        },
        {
          name: 'enabled',
          type: 'boolean',
          description: 'Active toggle state'
        }
      ],
      methods: [
        {
          name: 'append(msg, formatter)',
          returns: 'void',
          description: 'Writes formatted log message to target sink'
        },
        {
          name: 'getStatus()',
          returns: 'AppenderStatus',
          description: 'Returns telemetry status including file size and rotation counts'
        }
      ]
    },
    {
      name: 'LogFormatter (Strategy Pattern)',
      description: 'Strategy interface formatting LogMessage into text, JSON document, or pattern interpolated strings.',
      fields: [],
      methods: [
        {
          name: 'format(msg)',
          returns: 'String',
          description: 'Formats LogMessage into output string'
        },
        {
          name: 'getType()',
          returns: 'FormatterType',
          description: 'Returns FormatterType enum'
        }
      ]
    },
    {
      name: 'AsyncLogDispatcher (Decorator / Queue Worker)',
      description: 'Non-blocking async producer-consumer using ArrayBlockingQueue and background worker thread.',
      fields: [
        {
          name: 'queue',
          type: 'BlockingQueue<LogTask>',
          description: 'Bounded buffer queue'
        },
        {
          name: 'droppedCount',
          type: 'AtomicLong',
          description: 'Counter tracking overflow dropped logs'
        }
      ],
      methods: [
        {
          name: 'dispatch(msg, appenders, formatter)',
          returns: 'boolean',
          description: 'Enqueues task into queue or increments drop counter if full'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Chain of Responsibility',
      used: true,
      explanation: 'LogHandler chain (Trace -> Debug -> Info -> Warn -> Error -> Fatal) dynamically filters log events based on active threshold before passing to appenders.'
    },
    {
      name: 'Strategy Pattern (Formatters)',
      used: true,
      explanation: 'LogFormatter interface implemented by SimpleTextFormatter, JsonFormatter, and PatternFormatter, resolved dynamically via LogFormatterFactory.'
    },
    {
      name: 'Observer Pattern (Appenders)',
      used: true,
      explanation: 'Loggers broadcast log events to all attached LogAppender sinks (Console, File, Database, Elasticsearch) acting as event observers.'
    },
    {
      name: 'Decorator / Producer-Consumer',
      used: true,
      explanation: 'AsyncLogDispatcher wraps appender execution asynchronously using a bounded ArrayBlockingQueue and worker thread.'
    },
    {
      name: 'Singleton / Registry',
      used: true,
      explanation: 'LogManager acts as a thread-safe central logger registry managing logger hierarchy and root logger configuration.'
    }
  ],
  extensibility: [
    {
      area: 'New Appender Destinations',
      description: 'Implement LogAppender (e.g. CloudWatchAppender, KafkaAppender) and add to LogManager.',
      difficulty: 'Easy'
    },
    {
      area: 'Custom Pattern Formatters',
      description: 'Implement LogFormatter to support custom log format tokens like %X{userId}.',
      difficulty: 'Easy'
    },
    {
      area: 'Dynamic Level Watcher',
      description: 'Reload application log configuration dynamically from external config server without restart.',
      difficulty: 'Medium'
    }
  ],
  solidPrinciples: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Loggers manage level checking; LogHandlers manage chain filtering; LogFormatters handle text layout; LogAppenders handle sink storage.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New appender types (e.g., KafkaAppender, SlackAppender) or formatters (e.g., XmlFormatter) can be added without modifying existing logger code.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'All LogAppenders (Console, File, DB, ES) can be interchanged seamlessly via the LogAppender interface.'
    },
    {
      name: 'Interface Segregation (ISP)',
      description: 'LogAppender and LogFormatter interfaces are concise and focused on a single responsibility.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'Logger depends on LogAppender and LogFormatter interfaces rather than concrete implementations.'
    }
  ],
  concepts: [
    {
      name: 'Composition over Inheritance',
      description: 'Logger has-a List of Appender, not is-a Appender. LoggingFramework has-a root Logger and List of Appender. Behavior is assembled, not inherited.',
      alternative: 'Could use inheritance for specialized loggers. Composition is chosen because loggers differ in configuration, not behavior.'
    }
  ]
};
