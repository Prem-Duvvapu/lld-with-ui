// classDiagrams — courseRegistration
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Course Registration — Class Diagram',
  classes: [
    {
      name: 'Student',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- enrolledCourses: List<Registration>',
        '- schedule: Schedule'
      ],
      methods: [
        '+ registerForCourse(course): Registration',
        '+ dropCourse(registration): void',
        '+ viewSchedule(): Schedule'
      ]
    },
    {
      name: 'Course',
      fields: [
        '- id: String',
        '- code: String',
        '- title: String',
        '- credits: int',
        '- capacity: int',
        '- enrolledCount: int',
        '- professor: Professor',
        '- schedule: Schedule'
      ],
      methods: [
        '+ isFull(): boolean',
        '+ incrementEnrollment(): void',
        '+ decrementEnrollment(): void'
      ]
    },
    {
      name: 'Professor',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- department: String',
        '- courses: List<Course>'
      ],
      methods: [
        '+ assignCourse(course): void',
        '+ getCourseList(): List<Course>'
      ]
    },
    {
      name: 'Schedule',
      fields: [
        '- slots: List<TimeSlot>',
        '- semester: String'
      ],
      methods: [
        '+ addSlot(day, start, end): void',
        '+ conflictsWith(other): boolean'
      ]
    },
    {
      name: 'Registration',
      fields: [
        '- id: String',
        '- student: Student',
        '- course: Course',
        '- status: RegistrationStatus',
        '- grade: String',
        '- timestamp: LocalDateTime'
      ],
      methods: [
        '+ confirm(): void',
        '+ cancel(): void',
        '+ assignGrade(grade): void'
      ]
    },
    {
      name: 'RegistrationStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'ENROLLED',
        'DROPPED',
        'COMPLETED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Student',
      to: 'Registration',
      label: 'has'
    },
    {
      from: 'Registration',
      to: 'Course',
      label: 'enrolls in'
    },
    {
      from: 'Course',
      to: 'Professor',
      label: 'taught by'
    },
    {
      from: 'Course',
      to: 'Schedule',
      label: 'has'
    },
    {
      from: 'Student',
      to: 'Schedule',
      label: 'has'
    },
    {
      from: 'Registration',
      to: 'RegistrationStatus',
      label: 'has state'
    }
  ]
};
