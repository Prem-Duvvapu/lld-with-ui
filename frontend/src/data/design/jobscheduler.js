export default {
  title: 'Job Scheduler — Design Details',
  requirements: [
    'One-time scheduling: run a job exactly once at (or after) a given instant, never again.',
    'Recurring scheduling by fixed interval: run every N seconds, self-correcting so it does not drift under load.',
    'Recurring scheduling by cron expression: parse a real 5-field Unix cron string and compute the actual next matching instant, not an approximation.',
    'Priority-ordered dispatch: always execute whichever scheduled job is due soonest, across an arbitrary number of jobs, not in creation order.',
    'Cancellation must be safe even mid-dispatch: cancelling a job that a worker is about to execute must never let that execution happen, and must never leave the job in an inconsistent status.',
    'Misfire handling: when a job\'s due time has passed by more than a threshold before a worker was free (the system was busy), apply a configurable policy — run it late, or drop it and jump to the next occurrence — rather than one hardcoded behavior.',
    'Deterministic testability: every scheduling and misfire computation must be exercisable without sleeping for real wall-clock time.',
  ],
  entities: [
    {
      name: 'JobScheduler',
      description: 'The engine: a PriorityBlockingQueue of jobs ordered by nextExecutionTime, a fixed worker-thread pool (live instance only) that repeatedly polls it for due jobs, and a per-job ReentrantLock map that makes cancellation and dispatch mutually exclusive for the same job. One instance backs the live /api/jobscheduler/* endpoints; a second, fully separate instance (its own queue, its own locks, its own ManualClock) backs the isolated /sim/* sandbox.',
      fields: [
        { name: 'clock', type: 'Clock', description: 'SystemClock (live) or ManualClock (sim/tests) — every "now" in the engine goes through this' },
        { name: 'dueQueue', type: 'PriorityBlockingQueue<Job>', description: 'Ordered by nextExecutionTime; jobs are removed before dispatch and re-offered only if they have a future occurrence' },
        { name: 'jobLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'Per-job-id lock — the mutual exclusion between cancel() and dispatch for one job' },
        { name: 'misfireThreshold', type: 'Duration', description: 'How overdue a due time must be before it counts as a misfire rather than an ordinary slightly-late fire' },
      ],
      methods: [
        { name: 'schedule(name, taskType, schedule, misfirePolicy, simulatedDurationMillis)', returns: 'Job', description: 'Computes the first nextExecutionTime and enqueues the job' },
        { name: 'cancel(jobId)', returns: 'void', description: 'Under the per-job lock: transition to CANCELLED and set the cancelled flag, iff currently legal' },
        { name: 'dispatchDueNow()', returns: 'int', description: 'Synchronous pass: pop and process every currently-due job — what the sandbox calls after advancing its ManualClock' },
        { name: 'dispatchIfDue(jobId)', returns: 'boolean', description: 'Dispatch one specific job by id if due — the entry point the cancel/dispatch race demo targets' },
      ],
    },
    {
      name: 'Job',
      description: 'A scheduled unit of work. There is no real arbitrary user code to execute in this demo, so "the work" is represented abstractly by a taskType string plus a recorded (not slept-through) simulatedDurationMillis.',
      fields: [
        { name: 'schedule', type: 'Schedule', description: 'The strategy computing this job\'s next execution time' },
        { name: 'status', type: 'JobStatus', description: 'Current lifecycle state, mutated only through transition()' },
        { name: 'nextExecutionTime', type: 'Instant', description: 'When this job is next due' },
        { name: 'misfirePolicy', type: 'MisfirePolicy', description: 'What happens if this job\'s due time is missed by more than the threshold' },
        { name: 'history', type: 'List<JobExecutionRecord>', description: 'CopyOnWriteArrayList of every firing — completed, failed, or skipped-as-misfired' },
        { name: 'cancelled', type: 'volatile boolean', description: 'One-way flag, read and written only under the per-job lock; volatile is defense-in-depth on top of the lock, not a substitute for it' },
      ],
      methods: [
        { name: 'transition(next)', returns: 'void', description: 'The one gate every status change goes through — throws InvalidJobTransitionException if the move is not legal from the current status' },
      ],
    },
    {
      name: 'JobStatus',
      stereotype: 'enum',
      description: 'SCHEDULED, RUNNING, COMPLETED, FAILED, CANCELLED, MISFIRED, with a declared Map<JobStatus, Set<JobStatus>> of legal transitions (the same idiom as uber.model.RideStatus). isTerminal() is structural, not job-specific: COMPLETED and FAILED both declare SCHEDULED as legal because a recurring job genuinely returns to SCHEDULED after a run — only CANCELLED is unconditionally terminal.',
      fields: [],
      methods: [
        { name: 'canTransitionTo(next)', returns: 'boolean', description: 'Whether this status may move directly to next' },
        { name: 'isTerminal()', returns: 'boolean', description: 'True only for CANCELLED' },
      ],
    },
    {
      name: 'Schedule',
      stereotype: 'interface',
      description: 'Strategy: given a reference instant, compute the next time a job should run. At creation, the reference is "now"; after a fire, JobScheduler passes the occurrence\'s originally-scheduled time (not the actual, possibly-late, fire time) so recurring schedules are self-correcting.',
      fields: [],
      methods: [
        { name: 'nextExecutionTime(from)', returns: 'Optional<Instant>', description: 'Empty means this schedule has nothing left to give' },
      ],
    },
    {
      name: 'OneTimeSchedule',
      description: 'Fires exactly once at a fixed instant, then empty forever. Deliberately stateless: the boundary between "hasn\'t fired yet" and "already fired" falls out of comparing the fixed instant against whichever from JobScheduler happens to pass (creation time the first call, the fired instant itself every call after).',
      fields: [{ name: 'at', type: 'Instant', description: 'The single fire instant' }],
      methods: [],
    },
    {
      name: 'FixedRateSchedule',
      description: 'Fires every fixed interval, forever: from + interval. Because JobScheduler always passes the originally-scheduled due time as from after a fire, the cadence does not drift under load — this is "fixed rate", not "fixed delay".',
      fields: [{ name: 'interval', type: 'Duration', description: 'The repeat interval' }],
      methods: [],
    },
    {
      name: 'CronSchedule',
      description: 'A real 5-field Unix cron parser (minute hour day-of-month month day-of-week) plus a next-fire-time walker that steps forward minute by minute (capped at ~4 simulated years) until every field matches. Supports *, a single number, comma lists, and step values (*/15); range syntax (1-5) is not supported. Day-of-month and day-of-week are both simple AND filters, not POSIX cron\'s OR-when-both-restricted rule. Evaluated in a fixed UTC zone, independent of the JVM/server default.',
      fields: [
        { name: 'minutes / hours / daysOfMonth / months / daysOfWeek', type: 'Set<Integer>', description: 'The parsed, resolved values each field allows' },
      ],
      methods: [],
    },
    {
      name: 'ScheduleFactory',
      description: 'Resolves a ScheduleType (ONE_TIME/FIXED_RATE/CRON) plus a loosely-typed params map straight off the request body to the right Schedule implementation. Takes the caller\'s Clock as a parameter (not injected) since the live and sandbox engines resolve schedules against two different clocks with the same factory bean.',
      fields: [],
      methods: [
        { name: 'create(type, params, clock)', returns: 'Schedule', description: 'Also validates: a ONE_TIME instant must be strictly in the future' },
      ],
    },
    {
      name: 'MisfirePolicy',
      stereotype: 'interface',
      description: 'Strategy for what happens when a job\'s due time has passed by more than the threshold before a worker was free. Returns whether the caller should still execute this occurrence now.',
      fields: [],
      methods: [
        { name: 'handleMisfire(job, now)', returns: 'boolean', description: 'true = caller executes normally; false = the policy already fully handled the job (transitioned it, re-armed it if recurring)' },
      ],
    },
    {
      name: 'FireImmediatelyMisfirePolicy',
      description: 'Run it right away, then reschedule normally — never touches MISFIRED at all; the job is simply executed late through the ordinary SCHEDULED→RUNNING edge. A job that missed several occurrences catches every one of them up in a tight burst.',
      fields: [], methods: [],
    },
    {
      name: 'SkipToNextOccurrenceMisfirePolicy',
      description: 'Drop the missed run entirely and jump straight to the next future occurrence. Transitions SCHEDULED→MISFIRED, records one SKIPPED_MISFIRE history entry, then MISFIRED→SCHEDULED (recurring) or →COMPLETED (a one-time job\'s single occurrence was itself the misfire).',
      fields: [], methods: [],
    },
    {
      name: 'Clock',
      stereotype: 'interface',
      description: 'Abstraction over "now" — SystemClock for the live engine, ManualClock for the isolated /sim/* sandbox and every deterministic test, the same idiom as circuitbreaker.clock.Clock (which returns millis; this one returns Instant, a better fit for cron field matching).',
      fields: [], methods: [{ name: 'now()', returns: 'Instant', description: '' }],
    },
    {
      name: 'JobExecutionRecord',
      description: 'One line of a job\'s history: firedAt, an outcome (COMPLETED / FAILED / SKIPPED_MISFIRE — deliberately separate from JobStatus, since a status is where the job sits now and an outcome is what one particular occurrence did), and a recorded (not slept-through) durationMillis.',
      fields: [], methods: [],
    },
  ],
  designPatterns: [
    { name: 'Strategy Pattern (Schedule)', used: true, explanation: 'OneTimeSchedule, FixedRateSchedule and CronSchedule all implement Schedule.nextExecutionTime(from); ScheduleFactory resolves a ScheduleType to the right one instead of an if/else at the call site.' },
    { name: 'Strategy Pattern (MisfirePolicy)', used: true, explanation: 'FireImmediatelyMisfirePolicy and SkipToNextOccurrenceMisfirePolicy are genuinely different behaviors behind one interface, resolved by MisfirePolicyFactory.' },
    { name: 'Factory Pattern', used: true, explanation: 'ScheduleFactory and MisfirePolicyFactory both centralize type-to-implementation resolution so it is declared once, not scattered across every call site.' },
    { name: 'Facade Pattern', used: true, explanation: 'JobSchedulerService is the single entry point the controller talks to, hiding two separate JobScheduler engines (live + sandbox) and the ScheduleFactory/MisfirePolicyFactory collaborators behind it.' },
    { name: 'State Pattern', used: false, explanation: 'JobStatus is a declared transition table enforced through one gate, the same effect a State pattern would give, but implemented as an enum + Map rather than a class hierarchy — there is no per-state behavior beyond "which moves are legal", so a class per state would be pure ceremony here.' },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'JobSchedulerRepository only stores and looks up jobs; all dispatch ordering, locking and misfire logic lives in JobScheduler; all cron/interval/one-time math lives in the Schedule implementations.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A new schedule kind or misfire policy is a new class plus one factory branch — JobScheduler\'s dispatch loop never needs to change.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every Schedule and every MisfirePolicy is fully interchangeable from JobScheduler\'s point of view; it never inspects a concrete type.' },
    { name: 'Dependency Inversion Principle (DIP)', description: 'JobScheduler depends on the Clock interface, not SystemClock — the entire engine is identical code whether it is driving real dispatch or a sandbox demo.' },
  ],
  oopConcepts: [
    { name: 'Polymorphism', description: 'nextExecutionTime() and handleMisfire() dispatch to completely different logic per concrete Schedule/MisfirePolicy without a single instanceof check in the engine.' },
    { name: 'Encapsulation', description: 'Job.transition() is the only way to change status; no caller ever assigns job.setStatus(...) directly, so an illegal jump is impossible to introduce by accident.' },
    { name: 'Composition over inheritance', description: 'Job holds a Schedule and a MisfirePolicy rather than being subclassed per schedule kind — the same Job class represents a one-time email and a recurring cron report.' },
  ],
  extensibility: [
    { area: 'Cron range syntax (1-5) and named values (MON, JAN)', description: 'CronSchedule\'s parseField() would gain one more atom branch; the rest of the walker is unaffected.', difficulty: 'Easy' },
    { area: 'Per-trigger configurable timezone', description: 'Currently every CronSchedule evaluates in a fixed UTC zone; adding a ZoneId field and threading it through the walker\'s atZone() call is contained to one class.', difficulty: 'Medium' },
    { area: 'Persistent job store surviving a restart', description: 'JobSchedulerRepository is an in-memory ConcurrentHashMap by design (matches this whole portfolio\'s no-database constraint); swapping in a real store means re-hydrating the PriorityBlockingQueue on startup and deciding how to handle jobs whose due time already passed while the process was down — itself a misfire-policy-shaped question.', difficulty: 'Hard' },
    { area: 'Job-level retry policy distinct from misfire policy', description: 'A FAILED execution currently just reschedules like any other run for a recurring job; a dedicated RetryPolicy (backoff, max attempts) would be a third Strategy alongside Schedule and MisfirePolicy.', difficulty: 'Medium' },
    { area: 'Distributed scheduling across multiple instances', description: 'Would need a shared due-queue and a leader-election or per-job distributed lock in place of the in-process ReentrantLock map — a materially different concurrency model, not a small change.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'Cron day-of-month/day-of-week fields are combined with AND, not POSIX cron\'s OR-when-both-restricted rule — simpler to implement and to reason about, at the cost of not matching real cron\'s exact semantics for that one edge case.',
    'Cron range syntax (1-5) is not supported, only *, a single number, comma lists and step values (*/15) — a deliberate scope cut rather than a silent gap, called out here and in the parser\'s own Javadoc.',
    'CronSchedule walks forward minute-by-minute rather than computing each field analytically — O(minutes-until-next-fire) instead of O(1), capped at ~4 simulated years to avoid looping forever on an impossible date (e.g. day-of-month 31 combined with February). Simpler and more obviously correct than a closed-form calendar computation; the cost is invisible for realistic schedules (worst case under a year of simulated minutes) and only shows up on a deliberately impossible expression.',
    'The live engine polls its PriorityBlockingQueue on a fixed short interval from a small worker-thread pool rather than using a DelayQueue or a single timer thread with computed wait times — easier to reason about and to race-test deterministically (dispatchDueNow() is the same code path a poll iteration uses), at the cost of up to one poll interval of dispatch latency and some idle CPU.',
    'MisfirePolicy.handleMisfire(job, now) takes an explicit Instant rather than the single-argument signature a first pass at this design assumed — deciding "skip to next occurrence" genuinely requires knowing what "now" is, and threading it through explicitly (instead of each policy calling a wall clock itself) is what lets the sandbox\'s ManualClock and every test drive the decision deterministically.',
    'A job\'s "work" is represented abstractly (a taskType string plus a recorded, not slept-through, simulatedDurationMillis) rather than executing arbitrary user code — this module is about the scheduling machinery, not a task-execution sandbox, so real work execution (and its own failure/timeout handling) is out of scope.',
  ],
  summary: 'A priority-queue-driven job scheduler supporting one-time, fixed-rate and real cron-expression schedules, with a genuinely enforced status lifecycle and two distinct, configurable misfire policies. Its centerpiece is closing the classic check-then-act race between cancelling a job and a worker dispatching it: both operations serialize on the same per-job ReentrantLock, and dispatch re-checks the cancelled flag inside that lock, so a job popped for execution the instant it is cancelled is provably never run — verified by a 200-round repeated concurrency test, not a single lucky pass. A ManualClock-backed isolated sandbox lets the whole story — scheduling, firing, rescheduling, misfiring, cancelling, racing — play out on command instead of waiting on real wall-clock time.',
  highlights: [
    'A real 5-field cron parser and next-fire-time walker, not a stubbed lookup table — with dedicated tests for every-minute, specific-hour, day-of-week, month-boundary (day 31 skipping short months) and multi-field combinations.',
    'The cancel/dispatch race: same per-job ReentrantLock guards both operations, cancelled is re-checked inside it, and a 200-round repeated test (not a single-shot one) proves a cancelled job\'s task body is never observed to run.',
    'Two misfire policies with genuinely different real-world behavior: Fire Immediately catches up every missed occurrence in a burst; Skip to Next Occurrence drops the whole backlog and jumps straight to the future — both exercised directly and through the /sim/* trigger-misfire step.',
    'A declared JobStatus transition table (mirroring uber.model.RideStatus) where terminality is structural, not job-specific: COMPLETED/FAILED both legally lead back to SCHEDULED because a recurring job\'s next occurrence really does return there, and only CANCELLED is unconditionally terminal.',
  ],
};
