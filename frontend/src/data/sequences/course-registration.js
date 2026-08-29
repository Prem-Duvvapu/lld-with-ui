// Sequence diagram content for course-registration.
// Grounded directly in CourseRegistrationService, SectionCapacityManager (per-section lock + quota check),
// and waitlist / prerequisite validation.
export default {
  title: 'Course Registration — Section Capacity Locking & Waitlist Overflow',
  description:
    'How CourseRegistrationService guarantees that section enrollment capacity is strictly enforced under concurrent student registrations. SectionCapacityManager acquires a per-section ReentrantLock to prevent over-enrollment when the final available seat is contested.',
  flows: [
    {
      id: 'section-capacity-race',
      label: 'Two students race for the last seat in a section',
      description:
        'Section CS-101-A has 1 seat remaining (Capacity: 30, Enrolled: 29). Alice and Bob simultaneously submit registration requests. SectionCapacityManager serializes them on sectionLock("CS-101-A"). Alice wins the last seat, while Bob is added to the section waitlist.',
      participants: [
        { id: 'studentA', name: 'Student A\n(Alice)', kind: 'actor' },
        { id: 'studentB', name: 'Student B\n(Bob)', kind: 'actor' },
        { id: 'controller', name: 'CourseRegistration\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CourseRegistration\nService', kind: 'component', stereotype: 'facade' },
        { id: 'capMgr', name: 'SectionCapacity\nManager', kind: 'component' },
        { id: 'secLock', name: 'sectionLock\n("CS-101-A")', kind: 'lock', stereotype: 'ReentrantLock' },
        { id: 'repo', name: 'CourseRegistrationRepository', kind: 'store' },
      ],
      steps: [
        { from: 'studentA', to: 'controller', text: 'POST /api/course-registration/enroll {studentId: "alice", sectionId: "CS-101-A"}' },
        { from: 'controller', to: 'service', text: 'registerStudent("alice", "CS-101-A")', activate: 'service' },
        { from: 'studentB', to: 'controller', text: 'POST /api/course-registration/enroll {studentId: "bob", sectionId: "CS-101-A"}' },
        { from: 'controller', to: 'service', text: 'registerStudent("bob", "CS-101-A")' },
        { from: 'service', to: 'capMgr', text: '[Alice] enrollUnderLock("alice", "CS-101-A")', activate: 'capMgr' },
        { from: 'capMgr', to: 'secLock', text: '[Alice] lock.lock() — ACQUIRED', activate: 'secLock' },
        { from: 'service', to: 'capMgr', text: '[Bob] enrollUnderLock("bob", "CS-101-A")' },
        { from: 'capMgr', to: 'secLock', text: '[Bob] lock.lock() — BLOCKS on CS-101-A' },
        { from: 'capMgr', to: 'repo', text: '[Alice] getSection("CS-101-A") → capacity=30, enrolled=29' },
        { from: 'capMgr', to: 'repo', text: '[Alice] addEnrolledStudent("alice") ; enrolled count becomes 30 (FULL)' },
        { from: 'capMgr', to: 'secLock', text: '[Alice] lock.unlock()', deactivate: 'secLock' },
        { from: 'capMgr', to: 'service', text: '[Alice] RegistrationResult {ENROLLED, section: "CS-101-A"}', type: 'return', deactivate: 'capMgr' },
        { from: 'service', to: 'controller', text: '[Alice] return result', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'studentA', text: '200 OK — Enrolled in CS-101-A', type: 'return' },
        { type: 'note', over: ['secLock'], text: 'Lock freed. Bob unblocks and evaluates capacity.' },
        { from: 'capMgr', to: 'secLock', text: '[Bob] lock.lock() — ACQUIRED', activate: 'secLock' },
        { from: 'capMgr', to: 'repo', text: '[Bob] getSection("CS-101-A") → capacity=30, enrolled=30 (FULL)' },
        { from: 'capMgr', to: 'repo', text: '[Bob] addToWaitlist("bob") ; position = 1' },
        { from: 'capMgr', to: 'secLock', text: '[Bob] lock.unlock()', deactivate: 'secLock' },
        { from: 'capMgr', to: 'service', text: '[Bob] RegistrationResult {WAITLISTED, position: 1}', type: 'return' },
        { from: 'service', to: 'controller', text: '[Bob] return result', type: 'return' },
        { from: 'controller', to: 'studentB', text: '200 OK — Section full; added to waitlist (Position #1)', type: 'return' },
      ],
    },
  ],
};
