// classDiagrams — taskManagement
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Task Management — Class Diagram',
  classes: [
    {
      name: 'Task',
      fields: [
        '- id: String',
        '- title: String',
        '- description: String',
        '- status: TaskStatus',
        '- priority: Priority',
        '- assignee: User',
        '- dueDate: LocalDate'
      ],
      methods: [
        '+ updateStatus(status): void',
        '+ setPriority(priority): void',
        '+ assignTo(user): void'
      ]
    },
    {
      name: 'User',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- boards: List<Board>'
      ],
      methods: [
        '+ createBoard(name): Board',
        '+ getAssignedTasks(): List<Task>'
      ]
    },
    {
      name: 'Board',
      fields: [
        '- id: String',
        '- title: String',
        '- lists: List<TaskList>'
      ],
      methods: [
        '+ addList(name): TaskList',
        '+ removeList(list): void'
      ]
    },
    {
      name: 'TaskList',
      fields: [
        '- id: String',
        '- name: String',
        '- tasks: List<Task>',
        '- board: Board'
      ],
      methods: [
        '+ addTask(task): void',
        '+ removeTask(task): void',
        '+ reorderTasks(order): void'
      ]
    },
    {
      name: 'TaskStatus',
      stereotype: 'enum',
      fields: [
        'TODO',
        'IN_PROGRESS',
        'IN_REVIEW',
        'DONE'
      ],
      methods: []
    },
    {
      name: 'Priority',
      stereotype: 'enum',
      fields: [
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Board',
      to: 'TaskList',
      label: 'contains'
    },
    {
      from: 'TaskList',
      to: 'Task',
      label: 'contains'
    },
    {
      from: 'Task',
      to: 'User',
      label: 'assigned to'
    },
    {
      from: 'Task',
      to: 'TaskStatus',
      label: 'has state'
    },
    {
      from: 'Task',
      to: 'Priority',
      label: 'has priority'
    },
    {
      from: 'User',
      to: 'Board',
      label: 'owns'
    }
  ]
};
