// designDetails — taskManagement
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Grounded in the actual backend: com.lld.taskmanagement.{state,strategy,exception,service}.
// Board and Task are the only two persisted entities — User/Comment/ActivityLog/Notification
// described in an earlier draft of this file were never implemented and have been removed so
// this document matches the real code.

export default {
  title: 'Task Management — Design Details',
  requirements: [
    'Users can create, view, reassign, reprioritize, move, and delete tasks on a Kanban board — each task has a title, description, priority, status, assignee, and optional due date',
    'Task status follows a declared state machine: TODO -> IN_PROGRESS -> REVIEW -> DONE, with BLOCKED reachable from IN_PROGRESS/REVIEW and CANCELLED reachable from any non-terminal status — illegal jumps (e.g. TODO straight to DONE) are rejected, not silently coerced',
    'A board can be queried in three interchangeable orders — FIFO within priority, due-date-first, or a weighted priority+urgency score — without the caller needing to know how any of them compute the order',
    'Two actors racing to claim the same unassigned task must never both succeed; two actors racing to move the same task to two different terminal statuses must never both apply',
    'Multiple boards are supported (a "Main Board" is created eagerly); requesting an unknown board or task returns a typed 404, not a generic error',
    'An isolated `/sim/*` sandbox lets a demo reset, seed, move, claim, reorder, and race against a board that can never corrupt production data'
  ],
  entities: [
    {
      name: 'Board',
      description: 'A Kanban board. Holds only its own identity (id, name, createdAt) — the tasks that belong to it are looked up from TaskRepository by boardId rather than embedded, so a board and its tasks can never drift out of sync.',
      fields: [
        { name: 'id', type: 'int', description: 'Unique board identifier' },
        { name: 'name', type: 'String', description: 'Display name, e.g. "Main Board"' },
        { name: 'createdAt', type: 'long', description: 'Epoch millis the board was created' }
      ],
      methods: []
    },
    {
      name: 'Task',
      description: 'Core entity representing a unit of work. transitionTo() is the single place status ever changes — it delegates the legality check to the TaskState for the current status and throws IllegalTaskTransitionException on an illegal request.',
      fields: [
        { name: 'id', type: 'long', description: 'Unique task identifier' },
        { name: 'boardId', type: 'int', description: 'Foreign key to the owning Board' },
        { name: 'title', type: 'String', description: 'Short task summary' },
        { name: 'description', type: 'String', description: 'Detailed task description' },
        { name: 'status', type: 'TaskStatus', description: 'TODO, IN_PROGRESS, REVIEW, BLOCKED, DONE, CANCELLED' },
        { name: 'priority', type: 'Priority', description: 'LOW, MEDIUM, HIGH, CRITICAL — each carries an integer weight' },
        { name: 'assignee', type: 'String', description: 'Actor responsible for the task, or null if unclaimed' },
        { name: 'dueDate', type: 'Long', description: 'Epoch millis deadline, or null for "no due date"' },
        { name: 'createdAt', type: 'long', description: 'Epoch millis the task was created' },
        { name: 'updatedAt', type: 'long', description: 'Epoch millis of the last mutation' }
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Validates target against the current TaskState\'s declared allowedNext() set and applies it, or throws IllegalTaskTransitionException' }
      ]
    },
    {
      name: 'TaskState',
      description: 'State-pattern interface — one singleton implementation per TaskStatus (TodoState, InProgressState, ReviewState, BlockedState, DoneState, CancelledState). Each declares the exact Set<TaskStatus> it may legally move to next; DONE and CANCELLED declare an empty set (terminal).',
      fields: [],
      methods: [
        { name: 'allowedNext()', returns: 'Set<TaskStatus>', description: 'The declared legal next statuses for this state' },
        { name: 'isTerminal()', returns: 'boolean', description: 'True when allowedNext() is empty' },
        { name: 'canTransitionTo(target)', returns: 'boolean', description: 'True when target is in allowedNext()' }
      ]
    },
    {
      name: 'TaskOrderingStrategy',
      description: 'Strategy-pattern interface for board queries — TaskService never branches on which ordering was requested, it calls only strategy.order(tasks). Three implementations: FifoWithinPriorityStrategy, DueDateFirstStrategy, WeightedScoreStrategy, resolved via an EnumMap-backed TaskOrderingStrategyFactory.',
      fields: [],
      methods: [
        { name: 'order(tasks)', returns: 'List<Task>', description: 'Returns a new, reordered list — never mutates the input' }
      ]
    },
    {
      name: 'TaskService',
      description: 'Facade the controller delegates to wholesale. Owns the production TaskRepository plus a completely isolated sandbox TaskRepository for the /sim/* engine, and a per-task ReentrantLock map guarding every check-then-act status/assignment mutation.',
      fields: [
        { name: 'taskLocks', type: 'ConcurrentHashMap<Long, ReentrantLock>', description: 'Fair per-task locks; computeIfAbsent, never nested' }
      ],
      methods: [
        { name: 'moveTask(taskId, target)', returns: 'Task', description: 'Locks the task, re-validates the transition against the CURRENT status, applies or throws' },
        { name: 'claimTask(taskId, actor)', returns: 'Task', description: 'Locks the task, assigns only if currently unassigned, else throws TaskAlreadyAssignedException' },
        { name: 'getOrderedTasks(boardId, policy)', returns: 'List<Task>', description: 'Resolves the strategy via the factory and delegates ordering to it' }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'com.lld.taskmanagement.state — one singleton class per TaskStatus (TodoState, InProgressState, ReviewState, BlockedState, DoneState, CancelledState), each declaring its own Set<TaskStatus> of legal next statuses. Task#transitionTo() is the single enforcement point; illegal requests throw IllegalTaskTransitionException (409) rather than being silently applied or ignored.'
    },
    {
      name: 'Strategy + Factory',
      used: true,
      explanation: 'com.lld.taskmanagement.strategy — FifoWithinPriorityStrategy, DueDateFirstStrategy, and WeightedScoreStrategy all implement TaskOrderingStrategy; TaskOrderingStrategyFactory resolves an OrderingPolicy to its strategy via an EnumMap, the same shape as inventory.strategy.ReorderStrategyFactory. TaskService never branches on the policy itself.'
    },
    {
      name: 'Facade',
      used: true,
      explanation: 'TaskService is the single entry point the controller calls; it hides the repository, the lock map, the state machine, and the strategy factory behind a small method surface.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'TaskRepository is a plain in-memory store with no business logic — validation, locking, and the state machine all live one layer up in TaskService, which is what lets the exact same repository shape be reused, isolated, for the /sim/* sandbox.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'Each TaskState implementation exposes exactly one static INSTANCE, resolved by TaskStates — no state class is ever instantiated more than once.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Task owns its own transition legality (via TaskState). TaskRepository only stores. TaskOrderingStrategy only orders. TaskService only coordinates locking and validation. Each class has exactly one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new ordering policy is one new TaskOrderingStrategy implementation plus one EnumMap entry in the factory — TaskService is never touched. A new status would mean one new TaskState class plus one TaskStates registry entry.'
    },
    {
      name: 'Liskov Substitution (LSP)',
      description: 'Any TaskState implementation is interchangeable behind the TaskState interface; any TaskOrderingStrategy is interchangeable behind TaskOrderingStrategy. TaskService and Task depend only on the interface, never on a concrete class.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'TaskService depends on the TaskOrderingStrategy interface and the TaskState interface, not on concrete strategies or states. The concrete wiring happens once, in TaskOrderingStrategyFactory and TaskStates.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Live and sim operations funnel through the same private doMoveTask/doClaimTask/doCreateTask methods in TaskService, parameterized by which TaskRepository and lock map to use — the state machine and locking logic exist exactly once.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — State Behavior',
      description: 'TaskState.allowedNext() returns a different Set<TaskStatus> per concrete class; Task#transitionTo() calls it polymorphically without an if/else chain over TaskStatus values.',
      alternative: 'Could use a single Map<TaskStatus, Set<TaskStatus>> on the TaskStatus enum itself (uber\'s RideStatus does exactly this). The class-per-state shape was chosen here to mirror trafficsignal\'s SignalState pattern and to give each state room for state-specific behavior later.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Task has-a TaskStatus (delegating legality to TaskState); TaskService has-a TaskRepository, a lock map, and a TaskOrderingStrategyFactory. No domain class extends another.',
      alternative: 'A shared abstract Entity base with id/createdAt could reduce a few duplicated fields, at the cost of forcing every future entity into one inheritance tree.'
    },
    {
      name: 'Encapsulation — Status Transitions',
      description: 'Task#status has no public setter; the only way to change it is transitionTo(target), which always validates first. External code cannot force an illegal status directly.',
      alternative: 'A bare setStatus() setter would let any caller bypass the state machine entirely — the encapsulated transitionTo() is what makes "illegal transitions are impossible, not just discouraged" true.'
    }
  ],
  extensibility: [
    {
      area: 'New task status',
      description: 'Add a TaskStatus constant, one new TaskState singleton class declaring its allowedNext() set, and one line in TaskStates\' registry. Every existing caller of transitionTo() picks it up automatically.',
      difficulty: 'Easy'
    },
    {
      area: 'New ordering strategy',
      description: 'Add an OrderingPolicy constant, one class implementing TaskOrderingStrategy, and one put() in TaskOrderingStrategyFactory\'s constructor. TaskService and the controller need no changes.',
      difficulty: 'Easy'
    },
    {
      area: 'Multi-board workflows (sprints)',
      description: 'Board already exists as a first-class entity with its own id; a Sprint entity could wrap a date range around a Board without touching Task or the state machine at all.',
      difficulty: 'Medium'
    },
    {
      area: 'Notifications on transition',
      description: 'An Observer (StockAlertNotifier-shaped) could be added to TaskService, publishing a TaskChangedEvent from inside the same lock that already applies transitionTo() — the same idiom inventory uses for crossing-detection alerts.',
      difficulty: 'Medium'
    }
  ]
};
