// designDetails — taskManagement
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Task Management — Design Details',
  requirements: [
    'Users can create, update, delete, and view tasks — each task has title, description, priority, status, and due date',
    'Task status workflow: TODO to IN_PROGRESS to REVIEW to DONE — with optional BLOCKED state from any active state',
    'Task priorities: LOW, MEDIUM, HIGH, CRITICAL — tasks can be filtered and sorted by priority',
    'Users can assign tasks to other users and comment on tasks for collaboration',
    'Task board view — tasks organized in columns by status (Kanban-style) with drag-and-drop status changes',
    'Activity log — all task changes (status updates, assignments, comments) are recorded with timestamps and user info',
    'Notifications — users receive updates when tasks assigned to them are modified or when comments are added'
  ],
  entities: [
    {
      name: 'User',
      description: 'System user who can create, assign, and work on tasks. Has a dashboard showing assigned tasks and activity feed.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique user identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Display name of the user'
        },
        {
          name: 'email',
          type: 'String',
          description: 'Email for notifications'
        },
        {
          name: 'assignedTasks',
          type: 'List<Task>',
          description: 'Tasks currently assigned to this user'
        }
      ],
      methods: [
        {
          name: 'createTask(details)',
          returns: 'Task',
          description: 'Creates a new task owned by this user'
        },
        {
          name: 'changeStatus(task, newStatus)',
          returns: 'void',
          description: 'Updates task status if the transition is valid'
        },
        {
          name: 'addComment(task, text)',
          returns: 'Comment',
          description: 'Adds a comment to the given task'
        }
      ]
    },
    {
      name: 'Task',
      description: 'Core entity representing a unit of work. Has status, priority, assignee, comments, and activity log.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique task identifier'
        },
        {
          name: 'title',
          type: 'String',
          description: 'Short task summary'
        },
        {
          name: 'description',
          type: 'String',
          description: 'Detailed task description'
        },
        {
          name: 'status',
          type: 'TaskStatus',
          description: 'TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED'
        },
        {
          name: 'priority',
          type: 'Priority',
          description: 'LOW, MEDIUM, HIGH, CRITICAL'
        },
        {
          name: 'assignee',
          type: 'User',
          description: 'User responsible for completing this task'
        },
        {
          name: 'dueDate',
          type: 'LocalDate',
          description: 'Deadline for task completion'
        },
        {
          name: 'comments',
          type: 'List<Comment>',
          description: 'Discussion thread on this task'
        }
      ],
      methods: [
        {
          name: 'changeStatus(newStatus)',
          returns: 'boolean',
          description: 'Transitions to new status if the state machine allows it'
        },
        {
          name: 'assignTo(user)',
          returns: 'void',
          description: 'Reassigns the task to another user'
        },
        {
          name: 'addComment(comment)',
          returns: 'void',
          description: 'Appends a comment to the task'
        }
      ]
    },
    {
      name: 'TaskBoard',
      description: 'Kanban-style board that groups tasks by status column. Provides drag-and-drop status updates and filtering.',
      fields: [
        {
          name: 'columns',
          type: 'Map<TaskStatus, List<Task>>',
          description: 'Tasks grouped by their current status'
        },
        {
          name: 'filters',
          type: 'FilterCriteria',
          description: 'Active filters (priority, assignee, date range)'
        }
      ],
      methods: [
        {
          name: 'moveTask(taskId, targetStatus)',
          returns: 'void',
          description: 'Moves task between columns with status validation'
        },
        {
          name: 'getFilteredTasks()',
          returns: 'List<Task>',
          description: 'Returns tasks matching active filters'
        }
      ]
    },
    {
      name: 'ActivityLog',
      description: 'Immutable record of all task state changes. Provides an audit trail for compliance and historical view.',
      fields: [
        {
          name: 'entries',
          type: 'List<ActivityEntry>',
          description: 'Chronological list of all changes'
        }
      ],
      methods: [
        {
          name: 'logChange(taskId, user, action, details)',
          returns: 'void',
          description: 'Records a new activity entry'
        },
        {
          name: 'getHistory(taskId)',
          returns: 'List<ActivityEntry>',
          description: 'Returns all changes for a specific task'
        }
      ]
    },
    {
      name: 'NotificationService',
      description: 'Manages user notifications for task assignments, status changes, and comments. Supports email and in-app notification delivery.',
      fields: [
        {
          name: 'observers',
          type: 'Map<String, List<User>>',
          description: 'Users subscribed to notifications per task'
        }
      ],
      methods: [
        {
          name: 'subscribe(user, taskId)',
          returns: 'void',
          description: 'Subscribes user to task notifications'
        },
        {
          name: 'notify(taskId, event)',
          returns: 'void',
          description: 'Sends notification to all subscribers of the task'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'NotificationService acts as the subject. When a task changes, it notifies all subscribed observers (users). Users receive updates without the Task class knowing about notification delivery.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'TaskStatus enum with valid transition rules implements the State pattern. BLOCKED can be entered from any active state, DONE is terminal. Invalid transitions are rejected by the state machine.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'TaskManagementService and NotificationService are singletons ensuring consistent state. A single board service prevents conflicting task modifications across the system.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Task prioritization strategies (EarliestDeadlineFirst, HighestPriorityFirst) could be used for auto-sorting the board. Each strategy would implement a Comparator without changing board logic.'
    },
    {
      name: 'Factory',
      used: false,
      explanation: 'A TaskFactory could create pre-configured tasks for common templates (BugTask, FeatureTask, ChoreTask) with default priorities and status workflows.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Task manages its own state and data. TaskBoard handles display and filtering. ActivityLog records changes. NotificationService sends alerts. Each has one clear responsibility.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New task statuses can be added to TaskStatus enum with defined transitions. New notification channels (Slack, SMS) implement NotificationChannel interface. Core task workflow unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'TaskBoard depends on Task and TaskStatus abstractions. NotificationService depends on NotificationChannel interface. High-level modules don\'t depend on low-level details.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Status transition validation is centralized in TaskStatus enum. Comment creation logic is in CommentService. Activity logging is automatic, not manually coded per action.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'The Kanban model is intuitive: columns = statuses. Moving a task is changing its status. State machine has clear, simple transition rules. No complex workflow engine needed.'
    }
  ],
  oopConcepts: [
    {
      name: 'Polymorphism — Status Behavior',
      description: 'TaskStatus enum drives different behaviors: DONE tasks cannot be edited, BLOCKED tasks appear in a warning column. Same status field produces different behavior polymorphically.',
      alternative: 'Could use boolean flags (isDone, isBlocked). Enum makes invalid states (both DONE and IN_PROGRESS) unrepresentable.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'TaskBoard has-a Map of Task lists. User has-a List of Task. Task has-a List of Comment. System composes behaviors rather than inheriting from a base entity.',
      alternative: 'Could extend a BaseEntity for all domain objects. Composition is chosen because relationships are structural, not behavioral.'
    },
    {
      name: 'Encapsulation — Status Transitions',
      description: 'Task encapsulates its status and only exposes changeStatus() which validates the transition. External code cannot directly set the status field, preventing illegal state changes.',
      alternative: 'Could expose a setStatus() setter. Encapsulated transitions enforce business rules at the model level.'
    }
  ],
  extensibility: [
    {
      area: 'New Task Status',
      description: 'Add a new constant to TaskStatus enum. Define valid incoming and outgoing transitions. Existing state machine handles new status automatically.',
      difficulty: 'Easy'
    },
    {
      area: 'Sprint/Agile Support',
      description: 'Add Sprint entity with start/end dates. Group tasks into sprints. Add SprintBoard as a view filtering tasks by sprint. Existing task and board models unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'File Attachments',
      description: 'Add Attachment entity linked to Task. File upload handled by AttachmentService. Existing task fields and workflow unchanged.',
      difficulty: 'Medium'
    },
    {
      area: 'Recurring Tasks',
      description: 'Add recurrence rules to Task. A ScheduledTaskService creates new task instances based on recurrence when previous instance is completed.',
      difficulty: 'Medium'
    }
  ]
};
