// designDetails — courseRegistration
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Course Registration — Design Details',
  requirements: [
    'Course catalog — courses with code, title, description, credits, department and a list of prerequisite course codes',
    'Sections — one or more offered instances of a course, each with its own professor, capacity and weekly TimeSlot (days, start/end time, room)',
    'Registration is synchronous, not a submit-then-approve workflow: a student either lands a confirmed seat (ENROLLED) immediately or joins the FIFO waitlist (WAITLISTED) — there is no DRAFT/SUBMITTED/APPROVED admin gate',
    'Capacity management — a section has a fixed capacity; registering into a full section waitlists the student instead of rejecting the request outright',
    'Waitlist promotion — dropping a confirmed (ENROLLED) registration frees the seat and automatically promotes the FIFO-head waitlisted student to ENROLLED, atomically with the drop',
    'Prerequisite checking — registration is rejected with the specific missing course code(s) unless the student has completed every prerequisite of the course',
    'Schedule-conflict detection — registration is rejected if the target section\'s weekly TimeSlot overlaps any section the student is currently ENROLLED in (day overlap AND time overlap, both required)',
    'Duplicate-registration guard — a student cannot hold two simultaneous active (ENROLLED or WAITLISTED) registrations for the same section; dropping first is required before re-registering'
  ],
  entities: [
    {
      name: 'CourseRegistrationService',
      description: 'Facade the controller talks to exclusively. Runs prerequisite and schedule-conflict validation, then delegates the concurrency-critical enroll-or-waitlist decision to SectionCapacityManager. Also owns an isolated repository + lock-manager pair for the /sim/* sandbox so the interactive demo can never touch live registrations.',
      fields: [
        { name: 'repository', type: 'CourseRegistrationRepository', description: 'Live catalog, students and registrations' },
        { name: 'capacityManager', type: 'SectionCapacityManager', description: 'Owns the per-section lock guarding enrollment' }
      ],
      methods: [
        { name: 'register(studentId, sectionId)', returns: 'Registration', description: 'Prerequisite check, schedule-conflict check, then an atomic capacity-checked enroll-or-waitlist' },
        { name: 'drop(registrationId)', returns: 'DropOutcome', description: 'Drops the registration; if it held a confirmed seat, promotes the next waitlisted student under the same section lock' },
        { name: 'getStudentRegistrations(studentId)', returns: 'List<Registration>', description: 'Every registration a student has ever made, any status' }
      ]
    },
    {
      name: 'SectionCapacityManager',
      description: 'The concurrency core of the module — adapted from airline.SeatLockManager and carrental.ReservationLockService, but guarding a capacity counter and a FIFO waitlist queue instead of a single seat flag or a set of date ranges.',
      fields: [
        { name: 'sectionLocks', type: 'Map<String, ReentrantLock>', description: 'One fair lock per section id, created lazily via computeIfAbsent' }
      ],
      methods: [
        { name: 'register(section, studentId)', returns: 'Registration', description: 'Under the section\'s lock: re-checks enrolledCount < capacity, enrolls or waitlists, persists the Registration — all as one atomic unit' },
        { name: 'drop(section, registration)', returns: 'Optional<Registration>', description: 'Under the same lock: releases the seat if it was ENROLLED, then promotes the FIFO-head waitlisted student — so a drop and a concurrent new registration can never both claim the freed seat' }
      ]
    },
    {
      name: 'Course',
      description: 'Catalog entry. Prerequisites are stored as course codes, not embedded Course references, to avoid a self-referential object graph.',
      fields: [
        { name: 'id / code', type: 'String', description: 'e.g. "CS201"' },
        { name: 'credits', type: 'int', description: 'Credit hours' },
        { name: 'department', type: 'String', description: 'Owning department' },
        { name: 'prerequisiteCourseCodes', type: 'List<String>', description: 'Course codes that must appear in a student\'s completedCourseCodes before registration' }
      ],
      methods: []
    },
    {
      name: 'Section',
      description: 'One offered instance of a Course — the "seat pool" this module protects. enrolledCount and waitlist are mutated only inside SectionCapacityManager\'s lock; nothing else touches them directly.',
      fields: [
        { name: 'capacity / enrolledCount', type: 'int', description: 'Fixed seat count and the current confirmed occupancy' },
        { name: 'waitlist', type: 'Deque<String>', description: 'FIFO queue of studentIds waiting for a seat — addLast on join, pollFirst on promotion' },
        { name: 'timeSlot', type: 'TimeSlot', description: 'Weekly meeting time used by the schedule-conflict check' }
      ],
      methods: [
        { name: 'hasAvailableSeat()', returns: 'boolean', description: 'enrolledCount < capacity — read only under the section lock' }
      ]
    },
    {
      name: 'TimeSlot',
      description: 'A recurring weekly meeting time. conflictsWith() is the pure schedule-conflict primitive: two slots conflict only if they share at least one day AND their [start, end) ranges overlap.',
      fields: [
        { name: 'days', type: 'Set<DayOfWeek>', description: 'Which weekdays this slot meets' },
        { name: 'startTime / endTime', type: 'LocalTime', description: 'Half-open interval — back-to-back slots (end == start) do not conflict' }
      ],
      methods: [
        { name: 'conflictsWith(other)', returns: 'boolean', description: 'Day-set intersection AND half-open time-interval overlap, both required' }
      ]
    },
    {
      name: 'Student',
      description: 'Enrollment identity and academic record used by the prerequisite check.',
      fields: [
        { name: 'completedCourseCodes', type: 'Set<String>', description: 'Course codes already passed — read by CourseRegistrationService.checkPrerequisites' }
      ],
      methods: []
    },
    {
      name: 'Registration',
      description: 'Links a student to a section for one term. status is only ever mutated while SectionCapacityManager holds the section\'s lock, so ENROLLED-vs-WAITLISTED is always consistent with the section\'s own counters.',
      fields: [
        { name: 'status', type: 'RegistrationStatus', description: 'ENROLLED, WAITLISTED, DROPPED, COMPLETED' },
        { name: 'waitlistPosition', type: 'Integer', description: '1-based FIFO position recorded at the moment of waitlisting; null once ENROLLED' }
      ],
      methods: []
    }
  ],
  designPatterns: [
    {
      name: 'Facade',
      used: true,
      explanation: 'CourseRegistrationService is the single entry point the controller talks to, coordinating CourseRegistrationRepository and SectionCapacityManager without the controller knowing either exists.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'CourseRegistrationRepository wraps ConcurrentHashMaps per entity (courses, sections, students, registrations) plus an activeRegistrationIndex for O(1) duplicate/promotion lookups, behind get/save methods — nothing else touches a Map directly.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Waitlist ordering is a hardcoded FIFO Deque. A WaitlistPriorityStrategy interface (FIFO, senior-first, same-department-first) resolved via a factory would let the ordering policy vary per section without changing SectionCapacityManager.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'Waitlist promotion currently happens inline inside SectionCapacityManager.drop(). A RegistrationEventObserver notified on ENROLLED/WAITLISTED/PROMOTED transitions would let a notification-email or audit-log feature attach without touching the capacity manager.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'CourseRegistrationService orchestrates validation and workflow. SectionCapacityManager owns the one contended invariant (capacity + waitlist consistency). CourseRegistrationRepository owns storage. TimeSlot owns conflict arithmetic. Each has exactly one reason to change.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new validation rule (e.g. a term enrollment deadline) is a new check in the register() pipeline, not a rewrite of SectionCapacityManager. A new waitlist ordering policy is a new Strategy implementation, not a change to the Deque-based queue logic.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'CourseRegistrationService depends on CourseRegistrationRepository and SectionCapacityManager by type, both constructor-injected by Spring; nothing is instantiated with `new` inside the service except the isolated sim-engine pair.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Registration validation (prerequisite + schedule-conflict + capacity) lives in exactly one code path, doRegister(), shared by the live /register endpoint, the sim engine\'s simRegister, and simRace — the demo can never silently diverge from production behaviour.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Registration is a two-state outcome (ENROLLED or WAITLISTED) decided by one boolean check under one lock — no submit/approve/reject workflow, no separate waitlist entity, just a Deque on the Section and a status on the Registration.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Section capacity invariant',
      description: 'enrolledCount and waitlist are only ever written inside SectionCapacityManager\'s lock. No other class — not even CourseRegistrationService — increments enrolledCount directly, so the capacity invariant cannot be broken by a future call site that forgets to lock.',
      alternative: 'Could expose setEnrolledCount() on Section directly. Routing every mutation through one locked method is what makes the concurrency guarantee provable rather than "usually true".'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Section has-a TimeSlot and has-a Deque<String> waitlist; Registration has-a studentId/sectionId reference pair rather than embedding full Student/Section objects. Independent aggregates linked by id, not an inheritance hierarchy.',
      alternative: 'A shared "Enrollable" base class for Course/Section was considered and rejected — they are not interchangeable, one is a catalog entry and the other is a scheduled, capacity-limited offering of it.'
    },
    {
      name: 'Immutability where it matters — TimeSlot conflict check',
      description: 'TimeSlot.conflictsWith() is a pure function of two TimeSlot values with no side effects, callable from tests, the live register() path and the sim engine identically.',
      alternative: 'Conflict logic could live inline in the service per call site — kept as one static-shaped method instead so a test can exercise every boundary case (back-to-back, contained interval, multi-day) without standing up a repository.'
    }
  ],
  extensibility: [
    {
      area: 'Waitlist Priority Policy',
      description: 'Extract the Deque<String> waitlist ordering behind a WaitlistPriorityStrategy interface (FIFO / seniority / same-department-first), resolved by a factory. SectionCapacityManager delegates enqueue/dequeue instead of calling addLast/pollFirst directly.',
      difficulty: 'Medium'
    },
    {
      area: 'Registration Deadlines / Academic Terms',
      description: 'Add a Term entity with an enrollment window. register() checks LocalDate.now() against the term\'s window before delegating to SectionCapacityManager — no change to the capacity-lock logic itself.',
      difficulty: 'Medium'
    },
    {
      area: 'Grade Management',
      description: 'Add a nullable grade field to Registration plus a COMPLETED transition at term end. Existing ENROLLED/WAITLISTED/DROPPED handling is untouched.',
      difficulty: 'Easy'
    },
    {
      area: 'Cross-Section Enrollment Caps',
      description: 'A student-level cap on total concurrent ENROLLED credits would need a second check in doRegister() summing credits across repository.getEnrolledSectionsForStudent() — reads the same method the schedule-conflict check already uses.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'No admin approval gate: the original brief for this module sketched a DRAFT→SUBMITTED→APPROVED→ENROLLED workflow. That was cut in favor of the synchronous "immediate hold/confirm" shape shared with airline and movie-ticket bookings — a full submit-then-approve pipeline is a different (valid) design for registrar-gated programs, but adds a state machine with no bearing on the concurrency problem this module exists to demonstrate.',
    'Capacity lock granularity: a single global registration lock would be simplest but would serialise every registration across every section in the catalog, including two students registering for two unrelated courses. Per-section ReentrantLocks (keyed via computeIfAbsent, the same idiom as uber\'s DriverAssignmentService and carrental\'s ReservationLockService) let disjoint sections proceed fully in parallel.',
    'Waitlist position is a snapshot, not live: Registration.waitlistPosition is recorded once, at the moment a student joins the queue. It is not recalculated as students ahead of them drop. This keeps drop() a single Deque.pollFirst() instead of an O(n) rewrite of every remaining registration\'s position on every drop; the tradeoff is a waitlisted student\'s displayed position can understate how close they actually are.',
    'Duplicate-registration check is a fast-fail outside full atomicity with cross-student races: AlreadyRegisteredException is checked at the top of the same locked register() call that does the capacity check, so it is fully race-safe against a single student double-clicking register — the read and the enroll-or-waitlist decision share one lock acquisition.'
  ],
  summary: 'Capacity-limited course sections with FIFO waitlist promotion, prerequisite checking and schedule-conflict detection. The defining engineering problem is the same shape as a seat hold — "is there room, and if not, queue instead of reject" — but the resource being protected is a capacity counter plus a waitlist queue, not a single seat flag. SectionCapacityManager\'s per-section ReentrantLock re-checks enrolledCount < capacity inside the critical section, and drop() promotes the next waitlisted student under that same lock so a drop and a concurrent new registration can never both claim the freed seat.',
  highlights: [
    'Per-section ReentrantLock (computeIfAbsent) guarding a capacity counter AND a FIFO waitlist Deque as one atomic unit — not a boolean check-then-act, a counter-plus-queue check-then-act.',
    'Waitlist promotion happens inside the SAME lock acquisition as the drop that freed the seat, closing the race where a brand-new registration could steal a seat out from under an already-queued student.',
    'Prerequisite and schedule-conflict validation run through one shared doRegister() path used identically by the live endpoint, simRegister, and the concurrent simRace demo — the sandbox cannot silently diverge from production behaviour.',
    'Isolated /api/course-registration/sim/* engine with its own repository + SectionCapacityManager instance, including a simRace endpoint that fires N concurrent registrations at one section via a CountDownLatch so the race is visible live in the UI, not just in a JUnit test.'
  ]
};
