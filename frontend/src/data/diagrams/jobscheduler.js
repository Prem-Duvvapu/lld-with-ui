// classDiagrams — jobscheduler
export default {
  title: 'Job Scheduler — Class Diagram',
  classes: [
    {
      name: 'JobScheduler',
      stereotype: 'singleton',
      fields: [
        '- clock: Clock',
        '- dueQueue: PriorityBlockingQueue<Job>',
        '- jobLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- misfireThreshold: Duration',
      ],
      methods: [
        '+ schedule(name, taskType, schedule, misfirePolicy, simulatedDurationMillis): Job',
        '+ cancel(jobId): void',
        '+ dispatchDueNow(): int',
        '+ dispatchIfDue(jobId): boolean',
      ],
    },
    {
      name: 'Job',
      fields: [
        '- schedule: Schedule',
        '- status: JobStatus',
        '- nextExecutionTime: Instant',
        '- misfirePolicy: MisfirePolicy',
        '- history: List<JobExecutionRecord>',
        '- volatile cancelled: boolean',
      ],
      methods: [
        '+ transition(next): void',
      ],
    },
    {
      name: 'JobStatus',
      stereotype: 'enum',
      fields: ['SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'MISFIRED'],
      methods: [
        '+ canTransitionTo(next): boolean',
        '+ isTerminal(): boolean',
      ],
    },
    {
      name: 'Schedule',
      stereotype: 'interface',
      fields: [],
      methods: ['+ nextExecutionTime(from): Optional<Instant>'],
    },
    {
      name: 'OneTimeSchedule',
      fields: ['- at: Instant'],
      methods: [],
    },
    {
      name: 'FixedRateSchedule',
      fields: ['- interval: Duration'],
      methods: [],
    },
    {
      name: 'CronSchedule',
      fields: ['- minutes / hours / daysOfMonth / months / daysOfWeek: Set<Integer>'],
      methods: [],
    },
    {
      name: 'ScheduleFactory',
      fields: [],
      methods: ['+ create(type, params, clock): Schedule'],
    },
    {
      name: 'MisfirePolicy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ handleMisfire(job, now): boolean'],
    },
    {
      name: 'FireImmediatelyMisfirePolicy',
      fields: [],
      methods: [],
    },
    {
      name: 'SkipToNextOccurrenceMisfirePolicy',
      fields: [],
      methods: [],
    },
    {
      name: 'MisfirePolicyFactory',
      fields: [],
      methods: ['+ get(name): MisfirePolicy'],
    },
    {
      name: 'Clock',
      stereotype: 'interface',
      fields: [],
      methods: ['+ now(): Instant'],
    },
    {
      name: 'JobExecutionRecord',
      fields: [
        '- firedAt: Instant',
        '- status: JobExecutionOutcome',
        '- durationMillis: long',
      ],
      methods: [],
    },
  ],
  relationships: [
    { from: 'OneTimeSchedule', to: 'Schedule', label: 'implements', dashed: true },
    { from: 'FixedRateSchedule', to: 'Schedule', label: 'implements', dashed: true },
    { from: 'CronSchedule', to: 'Schedule', label: 'implements', dashed: true },
    { from: 'ScheduleFactory', to: 'Schedule', label: 'creates' },
    { from: 'FireImmediatelyMisfirePolicy', to: 'MisfirePolicy', label: 'implements', dashed: true },
    { from: 'SkipToNextOccurrenceMisfirePolicy', to: 'MisfirePolicy', label: 'implements', dashed: true },
    { from: 'MisfirePolicyFactory', to: 'MisfirePolicy', label: 'creates' },
    { from: 'JobScheduler', to: 'Job', label: 'schedules' },
    { from: 'JobScheduler', to: 'Clock', label: 'reads time from' },
    { from: 'JobScheduler', to: 'ScheduleFactory', label: 'uses' },
    { from: 'Job', to: 'Schedule', label: 'has' },
    { from: 'Job', to: 'JobStatus', label: 'has status' },
    { from: 'Job', to: 'MisfirePolicy', label: 'has' },
    { from: 'Job', to: 'JobExecutionRecord', label: 'contains' },
  ],
};
