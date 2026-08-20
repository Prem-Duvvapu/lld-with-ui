// designDetails — courseRegistration
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Course Registration — Design Details',
  requirements: [
    'Course catalog — courses with title, code, description, credits, prerequisites, and schedule (days, time, room)',
    'Student enrollment — students can view courses, register for courses, and drop registered courses within deadlines',
    'Registration workflow: DRAFT to SUBMITTED to APPROVED to ENROLLED to DROPPED — with REJECTED from SUBMITTED',
    'Prerequisite checking — system validates that students have completed prerequisite courses before enrollment',
    'Capacity management — courses have maximum enrollment; waitlist functionality when course is full',
    'Waitlist — students can join a waitlist for full courses; auto-enroll when a seat opens (FIFO)',
    'Conflicting schedule detection — system prevents enrollment in courses with overlapping time slots',
    'Professor assignment — courses are taught by professors who can view enrolled students and manage course materials'
  ],
  entities: [
    {
      name: 'RegistrationService',
      description: 'Core orchestrator managing registration lifecycle — course search, enrollment, dropping, and waitlist management.',
      fields: [
        {
          name: 'courseRepo',
          type: 'Repository<Course>',
          description: 'Data store for course catalog'
        },
        {
          name: 'studentRepo',
          type: 'Repository<Student>',
          description: 'Data store for student records'
        },
        {
          name: 'registrationRepo',
          type: 'Repository<Registration>',
          description: 'Data store for registrations'
        }
      ],
      methods: [
        {
          name: 'searchCourses(criteria)',
          returns: 'List<Course>',
          description: 'Searches courses by code, title, professor, department'
        },
        {
          name: 'enroll(studentId, courseId)',
          returns: 'Registration',
          description: 'Creates registration with prerequisite and conflict checks'
        },
        {
          name: 'dropCourse(registrationId)',
          returns: 'void',
          description: 'Drops enrollment, notifies next waitlisted student'
        },
        {
          name: 'approveRegistration(registrationId)',
          returns: 'void',
          description: 'Approves pending registration (admin/professor action)'
        },
        {
          name: 'rejectRegistration(registrationId, reason)',
          returns: 'void',
          description: 'Rejects registration with reason'
        }
      ]
    },
    {
      name: 'Course',
      description: 'Academic course with catalog info, schedule, capacity, prerequisites, and enrolled/waitlisted student lists.',
      fields: [
        {
          name: 'code',
          type: 'String',
          description: 'Unique course code (e.g., CS101)'
        },
        {
          name: 'title',
          type: 'String',
          description: 'Course title'
        },
        {
          name: 'description',
          type: 'String',
          description: 'Detailed course description'
        },
        {
          name: 'credits',
          type: 'int',
          description: 'Credit hours'
        },
        {
          name: 'professor',
          type: 'Professor',
          description: 'Instructor teaching the course'
        },
        {
          name: 'schedule',
          type: 'Schedule',
          description: 'Days, time, and room'
        },
        {
          name: 'capacity',
          type: 'int',
          description: 'Maximum number of enrolled students'
        },
        {
          name: 'prerequisites',
          type: 'List<Course>',
          description: 'Courses that must be completed before enrollment'
        },
        {
          name: 'enrolledStudents',
          type: 'List<Student>',
          description: 'Currently enrolled students'
        },
        {
          name: 'waitlist',
          type: 'Queue<Student>',
          description: 'Students waiting for an open seat (FIFO)'
        }
      ],
      methods: [
        {
          name: 'hasAvailableSeat()',
          returns: 'boolean',
          description: 'Checks if enrollment is below capacity'
        },
        {
          name: 'enrollStudent(student)',
          returns: 'boolean',
          description: 'Adds student if seat available, otherwise adds to waitlist'
        },
        {
          name: 'dropStudent(student)',
          returns: 'void',
          description: 'Removes student, auto-enrolls next from waitlist'
        },
        {
          name: 'checkPrerequisites(student)',
          returns: 'boolean',
          description: 'Validates all prerequisite courses are completed'
        },
        {
          name: 'checkScheduleConflict(student)',
          returns: 'boolean',
          description: 'Checks for overlapping time slots with student\'s other courses'
        }
      ]
    },
    {
      name: 'Student',
      description: 'Student with academic record, completed courses, current enrollments, and registration history.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique student identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Full name'
        },
        {
          name: 'department',
          type: 'String',
          description: 'Academic department/major'
        },
        {
          name: 'completedCourses',
          type: 'List<Course>',
          description: 'Courses passed with grade'
        },
        {
          name: 'currentCourses',
          type: 'List<Registration>',
          description: 'Currently enrolled courses'
        },
        {
          name: 'schedule',
          type: 'List<Schedule>',
          description: 'All time slots for current enrollments'
        }
      ],
      methods: [
        {
          name: 'hasCompleted(course)',
          returns: 'boolean',
          description: 'Checks if student has passed a prerequisite course'
        },
        {
          name: 'getEnrolledCredits()',
          returns: 'int',
          description: 'Returns total credits of current enrollments'
        }
      ]
    },
    {
      name: 'Registration',
      description: 'Enrollment record linking student to course. Tracks application status, approval, and grade.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique registration identifier'
        },
        {
          name: 'student',
          type: 'Student',
          description: 'Enrolled student'
        },
        {
          name: 'course',
          type: 'Course',
          description: 'Registered course'
        },
        {
          name: 'status',
          type: 'RegistrationStatus',
          description: 'DRAFT, SUBMITTED, APPROVED, ENROLLED, DROPPED, REJECTED'
        },
        {
          name: 'submittedAt',
          type: 'LocalDateTime',
          description: 'When registration was submitted'
        },
        {
          name: 'approvedAt',
          type: 'LocalDateTime',
          description: 'When registration was approved'
        }
      ],
      methods: [
        {
          name: 'submit()',
          returns: 'void',
          description: 'Submits registration for approval'
        },
        {
          name: 'approve()',
          returns: 'void',
          description: 'Approves registration'
        },
        {
          name: 'reject(reason)',
          returns: 'void',
          description: 'Rejects registration with reason'
        },
        {
          name: 'drop()',
          returns: 'void',
          description: 'Drops the course'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'State',
      used: true,
      explanation: 'RegistrationStatus enum with transitions: DRAFT to SUBMITTED to APPROVED to ENROLLED to DROPPED, with REJECTED from SUBMITTED. Each state determines valid operations.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'RegistrationService is a singleton ensuring a single source of truth for course capacity. Prevents over-enrollment from concurrent requests.'
    },
    {
      name: 'Observer',
      used: true,
      explanation: 'When a student drops a course, the waitlist observer is notified. The next waitlisted student is automatically enrolled. This decouples drop logic from waitlist logic.'
    },
    {
      name: 'Factory',
      used: false,
      explanation: 'A CourseFactory could create courses with default schedule templates, prerequisite chains, and capacity limits based on department and level.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Different enrollment strategies (FirstComeFirstServed, MeritBased, LotteryBased) could be swapped via EnrollmentStrategy interface without changing RegistrationService.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Course manages catalog and capacity. Student manages academic record. Registration manages enrollment status. RegistrationService orchestrates workflow and validation.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New registration statuses add to enum with transitions. New enrollment strategies implement EnrollmentStrategy. New validation rules extend existing validation chain.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'RegistrationService depends on Course and Student abstractions. Course depends on Schedule. High-level enrollment logic doesn\'t depend on low-level schedule representation.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Prerequisite checking is centralized in Course.checkPrerequisites(). Schedule conflict detection is in Course.checkScheduleConflict(). Waitlist FIFO logic is in Course.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'The registration model follows the natural academic workflow: draft, submit, approve, enroll, drop. Waitlist is a simple FIFO queue. No complex scheduling algorithms needed.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Registration Status',
      description: 'Registration encapsulates its status with submit(), approve(), reject(), drop() methods that validate transitions. External code cannot set status directly.',
      alternative: 'Could expose setStatus(). Encapsulated transitions enforce academic workflow rules at model level.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Course has-a Schedule, List of prerequisites, List of enrolled students. Student has-a List of completed courses, List of current registrations. System composed of independent entities.',
      alternative: 'Could create hierarchy of course types (LectureCourse extends Course). Composition is chosen because courses vary in capacity and schedule, not category.'
    },
    {
      name: 'Polymorphism — Waitlist Behavior',
      description: 'Waitlist interface with FIFOWaitlist, PriorityWaitlist (seniors first), DepartmentWaitlist (same department gets priority). Course delegates waitlist management to the strategy.',
      alternative: 'Could use single Queue implementation. Polymorphic waitlist allows different fairness policies without changing Course.'
    }
  ],
  extensibility: [
    {
      area: 'New Enrollment Policy',
      description: 'Implement EnrollmentStrategy interface (FirstComeFirstServed, MeritBased with GPA sorting, LotteryBased). RegistrationService delegates without changing core workflow.',
      difficulty: 'Medium'
    },
    {
      area: 'Academic Calendar / Terms',
      description: 'Add Term entity with enrollment periods (early registration, regular, late with fees). Course gets term association. Registration validated against enrollment deadlines.',
      difficulty: 'Medium'
    },
    {
      area: 'Grade Management',
      description: 'Add Grade entity linked to Registration. Professors enter grades. Student transcript generated from completed registrations with grades. Existing models unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Cross-Department Enrollment Limits',
      description: 'Add department enrollment quotas per course. Non-department students waitlisted if quota exceeded. Extends existing capacity management logic.',
      difficulty: 'Medium'
    }
  ]
};
