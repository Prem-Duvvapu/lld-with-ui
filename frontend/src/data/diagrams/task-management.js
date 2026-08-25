// classDiagrams — taskManagement
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Grounded in the actual backend: com.lld.taskmanagement.{controller,service,repository,
// model,state,strategy,exception}. Every class/relationship below matches a real Java class.

export default {
  title: 'Task Management — Class Diagram',
  classes: [
    {
      name: 'TaskController',
      stereotype: 'controller',
      fields: ['- service: TaskService'],
      methods: [
        '+ createTask(boardId, body): Task',
        '+ updateStatus(id, status): Task',
        '+ claimTask(id, body): Task',
        '+ getOrderedTasks(boardId, policy): List<Task>',
        '+ simClaimRace(body): Map',
        '+ simTransitionRace(body): Map'
      ]
    },
    {
      name: 'TaskService',
      stereotype: 'facade',
      fields: [
        '- repository, simRepository: TaskRepository',
        '- orderingFactory: TaskOrderingStrategyFactory',
        '- taskLocks, simTaskLocks: ConcurrentHashMap<Long, ReentrantLock>'
      ],
      methods: [
        '+ createTask(boardId, title, desc, priority, assignee, dueDate): Task',
        '+ moveTask(taskId, target): Task',
        '+ claimTask(taskId, actor): Task',
        '+ getOrderedTasks(boardId, policy): List<Task>',
        '+ simClaimRace(taskId, actors, step): Map',
        '+ simTransitionRace(taskId, first, second, step): Map',
        '- doMoveTask(repo, locks, taskId, target): Task',
        '- doClaimTask(repo, locks, taskId, actor): Task'
      ]
    },
    {
      name: 'TaskRepository',
      stereotype: 'repository',
      fields: [
        '- tasks: ConcurrentHashMap<Long, Task>',
        '- boards: ConcurrentHashMap<Integer, Board>'
      ],
      methods: [
        '+ saveTask(task): Task',
        '+ findTaskById(id): Task',
        '+ findTasksByBoard(boardId): List<Task>',
        '+ findTasksByBoardAndStatus(boardId, status): List<Task>',
        '+ saveBoard(board): Board',
        '+ findBoardById(id): Board'
      ]
    },
    {
      name: 'Board',
      stereotype: 'entity',
      fields: ['- id: int', '- name: String', '- createdAt: long'],
      methods: []
    },
    {
      name: 'Task',
      stereotype: 'entity',
      fields: [
        '- id: long', '- boardId: int', '- title: String', '- description: String',
        '- status: TaskStatus', '- priority: Priority', '- assignee: String',
        '- dueDate: Long', '- createdAt: long', '- updatedAt: long'
      ],
      methods: ['+ transitionTo(target): void']
    },
    {
      name: 'TaskState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getStatus(): TaskStatus',
        '+ allowedNext(): Set<TaskStatus>',
        '+ isTerminal(): boolean',
        '+ canTransitionTo(target): boolean'
      ]
    },
    {
      name: 'TodoState',
      stereotype: 'state',
      fields: ['+ INSTANCE: TodoState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'InProgressState',
      stereotype: 'state',
      fields: ['+ INSTANCE: InProgressState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'ReviewState',
      stereotype: 'state',
      fields: ['+ INSTANCE: ReviewState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'BlockedState',
      stereotype: 'state',
      fields: ['+ INSTANCE: BlockedState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'DoneState',
      stereotype: 'state',
      fields: ['+ INSTANCE: DoneState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'CancelledState',
      stereotype: 'state',
      fields: ['+ INSTANCE: CancelledState'],
      methods: ['+ allowedNext(): Set<TaskStatus>']
    },
    {
      name: 'TaskStates',
      stereotype: 'factory',
      fields: ['- BY_STATUS: EnumMap<TaskStatus, TaskState>'],
      methods: ['+ of(status): TaskState']
    },
    {
      name: 'TaskOrderingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ name(): String', '+ order(tasks): List<Task>']
    },
    {
      name: 'FifoWithinPriorityStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ order(tasks): List<Task>']
    },
    {
      name: 'DueDateFirstStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ order(tasks): List<Task>']
    },
    {
      name: 'WeightedScoreStrategy',
      stereotype: 'strategy',
      fields: ['- PRIORITY_MULTIPLIER: double', '- URGENCY_WINDOW_DAYS: double'],
      methods: ['+ order(tasks): List<Task>', '- score(task): double']
    },
    {
      name: 'TaskOrderingStrategyFactory',
      stereotype: 'factory',
      fields: ['- strategies: EnumMap<OrderingPolicy, TaskOrderingStrategy>'],
      methods: ['+ forPolicy(policy): TaskOrderingStrategy']
    },
    {
      name: 'TaskException',
      stereotype: 'exception',
      fields: [],
      methods: []
    },
    {
      name: 'TaskStatus',
      stereotype: 'enum',
      fields: ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'],
      methods: []
    },
    {
      name: 'Priority',
      stereotype: 'enum',
      fields: ['LOW(1)', 'MEDIUM(2)', 'HIGH(3)', 'CRITICAL(4)'],
      methods: []
    },
    {
      name: 'OrderingPolicy',
      stereotype: 'enum',
      fields: ['FIFO_PRIORITY', 'DUE_DATE_FIRST', 'WEIGHTED_SCORE'],
      methods: []
    }
  ],
  relationships: [
    { from: 'TaskController', to: 'TaskService', label: 'delegates to' },
    { from: 'TaskService', to: 'TaskRepository', label: 'uses' },
    { from: 'TaskService', to: 'TaskOrderingStrategyFactory', label: 'resolves via' },
    { from: 'TaskService', to: 'TaskException', label: 'throws', dashed: true },
    { from: 'TaskRepository', to: 'Task', label: 'stores' },
    { from: 'TaskRepository', to: 'Board', label: 'stores' },
    { from: 'Task', to: 'TaskStatus', label: 'has status' },
    { from: 'Task', to: 'Priority', label: 'has priority' },
    { from: 'Task', to: 'TaskStates', label: 'resolves state via' },
    { from: 'TaskStates', to: 'TaskState', label: 'resolves' },
    { from: 'TodoState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'InProgressState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'ReviewState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'BlockedState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'DoneState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'CancelledState', to: 'TaskState', label: 'implements', dashed: true },
    { from: 'TaskOrderingStrategyFactory', to: 'TaskOrderingStrategy', label: 'resolves' },
    { from: 'TaskOrderingStrategyFactory', to: 'OrderingPolicy', label: 'keyed by' },
    { from: 'FifoWithinPriorityStrategy', to: 'TaskOrderingStrategy', label: 'implements', dashed: true },
    { from: 'DueDateFirstStrategy', to: 'TaskOrderingStrategy', label: 'implements', dashed: true },
    { from: 'WeightedScoreStrategy', to: 'TaskOrderingStrategy', label: 'implements', dashed: true },
    { from: 'Task', to: 'TaskException', label: 'throws', dashed: true }
  ]
};
