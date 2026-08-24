// classDiagrams — courseRegistration
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Course Registration — Class Diagram',
  classes: [
    {
      name: 'CourseRegistrationController',
      stereotype: 'controller',
      fields: [],
      methods: [
        '+ register(studentId, sectionId): Registration',
        '+ drop(registrationId): DropOutcome'
      ]
    },
    {
      name: 'CourseRegistrationService',
      stereotype: 'facade',
      fields: [
        '- repository: CourseRegistrationRepository',
        '- capacityManager: SectionCapacityManager'
      ],
      methods: [
        '+ register(studentId, sectionId): Registration',
        '+ drop(registrationId): DropOutcome',
        '- checkPrerequisites(student, course): void',
        '- checkScheduleConflict(repo, student, section): void',
        '- doRegister(repo, mgr, studentId, sectionId): Registration'
      ]
    },
    {
      name: 'SectionCapacityManager',
      fields: [
        '- sectionLocks: Map<String, ReentrantLock>'
      ],
      methods: [
        '+ register(section, studentId): Registration',
        '+ drop(section, registration): Optional<Registration>'
      ]
    },
    {
      name: 'CourseRegistrationRepository',
      fields: [
        '- courses: ConcurrentHashMap',
        '- sections: ConcurrentHashMap',
        '- students: ConcurrentHashMap',
        '- registrations: ConcurrentHashMap',
        '- activeRegistrationIndex: ConcurrentHashMap'
      ],
      methods: [
        '+ getActiveRegistration(studentId, sectionId): Registration',
        '+ getEnrolledSectionsForStudent(studentId): List<Section>',
        '+ indexActive(registration): void',
        '+ unindexActive(registration): void'
      ]
    },
    {
      name: 'Course',
      fields: [
        '- id: String',
        '- code: String',
        '- title: String',
        '- credits: int',
        '- department: String',
        '- prerequisiteCourseCodes: List<String>'
      ],
      methods: []
    },
    {
      name: 'Section',
      fields: [
        '- id: String',
        '- courseId: String',
        '- sectionCode: String',
        '- professorName: String',
        '- capacity: int',
        '- enrolledCount: int',
        '- timeSlot: TimeSlot',
        '- waitlist: Deque<String>'
      ],
      methods: [
        '+ hasAvailableSeat(): boolean'
      ]
    },
    {
      name: 'TimeSlot',
      fields: [
        '- days: Set<DayOfWeek>',
        '- startTime: LocalTime',
        '- endTime: LocalTime',
        '- room: String'
      ],
      methods: [
        '+ conflictsWith(other): boolean'
      ]
    },
    {
      name: 'Student',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- department: String',
        '- completedCourseCodes: Set<String>'
      ],
      methods: []
    },
    {
      name: 'Registration',
      fields: [
        '- id: String',
        '- studentId: String',
        '- courseId: String',
        '- sectionId: String',
        '- status: RegistrationStatus',
        '- registeredAt: LocalDateTime',
        '- droppedAt: LocalDateTime',
        '- waitlistPosition: Integer'
      ],
      methods: []
    },
    {
      name: 'RegistrationStatus',
      stereotype: 'enum',
      fields: [
        'ENROLLED',
        'WAITLISTED',
        'DROPPED',
        'COMPLETED'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'CourseRegistrationController', to: 'CourseRegistrationService', label: 'delegates to' },
    { from: 'CourseRegistrationService', to: 'CourseRegistrationRepository', label: 'reads/writes' },
    { from: 'CourseRegistrationService', to: 'SectionCapacityManager', label: 'delegates capacity decision to' },
    { from: 'SectionCapacityManager', to: 'CourseRegistrationRepository', label: 'reads/writes under lock' },
    { from: 'SectionCapacityManager', to: 'Registration', label: 'creates / promotes' },
    { from: 'Student', to: 'Registration', label: 'makes' },
    { from: 'Registration', to: 'Section', label: 'enrolls in' },
    { from: 'Registration', to: 'RegistrationStatus', label: 'has state' },
    { from: 'Section', to: 'Course', label: 'offers' },
    { from: 'Section', to: 'TimeSlot', label: 'meets at' },
    { from: 'Student', to: 'TimeSlot', label: 'schedule checked against', dashed: true },
    { from: 'Course', to: 'Course', label: 'requires prerequisite', dashed: true }
  ]
};
