// classDiagrams — loggingFramework
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Logging Framework — Class Diagram',
  classes: [
    {
      name: 'LogManager',
      stereotype: 'singleton',
      fields: [
        '- loggers: Map<String, Logger>',
        '- rootLogger: Logger',
        '- activeFormatter: LogFormatter'
      ],
      methods: [
        '+ getLogger(name): Logger',
        '+ setGlobalLevel(level): void',
        '+ setFormatter(formatter): void'
      ]
    },
    {
      name: 'Logger',
      stereotype: 'entity',
      fields: [
        '- name: String',
        '- level: LogLevel',
        '- parent: Logger',
        '- appenders: List<LogAppender>',
        '- activeFormatter: LogFormatter'
      ],
      methods: [
        '+ log(level, msg, ctx): LogMessage',
        '+ getEffectiveLevel(): LogLevel',
        '+ info(msg): LogMessage',
        '+ error(msg): LogMessage'
      ]
    },
    {
      name: 'LogLevel',
      stereotype: 'enum',
      fields: [
        'TRACE(1)',
        'DEBUG(2)',
        'INFO(3)',
        'WARN(4)',
        'ERROR(5)',
        'FATAL(6)'
      ],
      methods: [
        '+ isGreaterOrEqual(threshold): boolean'
      ]
    },
    {
      name: 'LogMessage',
      stereotype: 'model',
      fields: [
        '- id: Long',
        '- level: LogLevel',
        '- loggerName: String',
        '- message: String',
        '- threadName: String',
        '- timestamp: LocalDateTime',
        '- context: Map<String, Object>'
      ],
      methods: []
    },
    {
      name: 'LogHandler',
      stereotype: 'abstract',
      fields: [
        '# level: LogLevel',
        '# nextHandler: LogHandler'
      ],
      methods: [
        '+ handle(msg, appenders, formatter, asyncDispatcher, isAsync): boolean',
        '+ setNext(nextHandler): LogHandler'
      ]
    },
    {
      name: 'LogAppender',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ append(message, formatter): void',
        '+ getStatus(): AppenderStatus',
        '+ isEnabled(): boolean'
      ]
    },
    {
      name: 'ConsoleAppender',
      fields: [
        '- name: String',
        '- enabled: boolean'
      ],
      methods: [
        '+ append(message, formatter): void'
      ]
    },
    {
      name: 'FileAppender',
      fields: [
        '- filePath: String',
        '- maxBytesPerFile: long',
        '- rotatedFiles: List<List<String>>'
      ],
      methods: [
        '+ append(message, formatter): void',
        '- rotate(): void'
      ]
    },
    {
      name: 'DatabaseAppender',
      fields: [
        '- dbRecords: List<String>'
      ],
      methods: [
        '+ append(message, formatter): void'
      ]
    },
    {
      name: 'ElasticsearchAppender',
      fields: [
        '- indexPrefix: String'
      ],
      methods: [
        '+ append(message, formatter): void'
      ]
    },
    {
      name: 'LogFormatter',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ format(message): String',
        '+ getType(): FormatterType'
      ]
    },
    {
      name: 'SimpleTextFormatter',
      fields: [],
      methods: [
        '+ format(message): String'
      ]
    },
    {
      name: 'JsonFormatter',
      fields: [
        '- objectMapper: ObjectMapper'
      ],
      methods: [
        '+ format(message): String'
      ]
    },
    {
      name: 'PatternFormatter',
      fields: [
        '- pattern: String'
      ],
      methods: [
        '+ format(message): String'
      ]
    },
    {
      name: 'AsyncLogDispatcher',
      stereotype: 'worker',
      fields: [
        '- queue: BlockingQueue<LogTask>',
        '- droppedCount: AtomicLong'
      ],
      methods: [
        '+ dispatch(msg, appenders, formatter): boolean'
      ]
    }
  ],
  relationships: [
    {
      from: 'LogManager',
      to: 'Logger',
      label: 'manages'
    },
    {
      from: 'Logger',
      to: 'Logger',
      label: 'parent'
    },
    {
      from: 'Logger',
      to: 'LogLevel',
      label: 'uses'
    },
    {
      from: 'Logger',
      to: 'LogMessage',
      label: 'produces'
    },
    {
      from: 'Logger',
      to: 'LogHandler',
      label: 'dispatches to'
    },
    {
      from: 'LogHandler',
      to: 'LogHandler',
      label: 'next'
    },
    {
      from: 'LogHandler',
      to: 'LogAppender',
      label: 'sends to'
    },
    {
      from: 'LogHandler',
      to: 'AsyncLogDispatcher',
      label: 'delegates to'
    },
    {
      from: 'LogAppender',
      to: 'LogFormatter',
      label: 'uses'
    },
    {
      from: 'ConsoleAppender',
      to: 'LogAppender',
      label: 'implements',
      dashed: true
    },
    {
      from: 'FileAppender',
      to: 'LogAppender',
      label: 'implements',
      dashed: true
    },
    {
      from: 'DatabaseAppender',
      to: 'LogAppender',
      label: 'implements',
      dashed: true
    },
    {
      from: 'ElasticsearchAppender',
      to: 'LogAppender',
      label: 'implements',
      dashed: true
    },
    {
      from: 'SimpleTextFormatter',
      to: 'LogFormatter',
      label: 'implements',
      dashed: true
    },
    {
      from: 'JsonFormatter',
      to: 'LogFormatter',
      label: 'implements',
      dashed: true
    },
    {
      from: 'PatternFormatter',
      to: 'LogFormatter',
      label: 'implements',
      dashed: true
    }
  ]
};
