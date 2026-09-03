// Sequence diagram content for meeting-scheduler.
// Grounded directly in ConflictDetectionService#book and
// MeetingSchedulerConcurrencyTest#sameAttendeeDifferentRooms_onlyOneWins: two organizers racing to
// book the SAME attendee into TWO DIFFERENT rooms. A class diagram shows one lock on
// ConflictDetectionService; it does not show why a per-room lock (car-rental's precedent) would
// have let both of these bookings through.
export default {
  title: 'Meeting Scheduler — Two Rooms, One Shared Attendee, One Global Lock',
  description:
    'ConflictDetectionService uses a single module-wide ReentrantLock, not a per-room lock — because an attendee conflict can span rooms a per-room lock would never see together. This sequence follows two organizers, Alice (booking Falcon) and Carol (booking Griffin), both trying to put Bob into an overlapping meeting at the same moment. Whichever thread wins the race checks Falcon\'s calendar, Griffin is untouched — but crucially it also checks BOB\'s calendar across every room, which is what the loser trips over.',
  flows: [
    {
      id: 'cross-room-attendee-conflict',
      label: 'Alice (Falcon) and Carol (Griffin) both try to book Bob at an overlapping time',
      description:
        'Both requests arrive together (see MeetingSchedulerConcurrencyTest, started via a CountDownLatch). Whichever thread acquires the single ConflictDetectionService lock first checks its room\'s calendar (clean) and then Bob\'s calendar across ALL rooms (also clean at that point) and commits. The second thread then acquires the lock, checks its own room (clean — different room), but its check of Bob\'s calendar now finds the first meeting and is correctly rejected — even though the two meetings are in entirely different rooms.',
      participants: [
        { id: 'alice', name: 'Alice\n(book Falcon)', kind: 'actor' },
        { id: 'carol', name: 'Carol\n(book Griffin)', kind: 'actor' },
        { id: 'service', name: 'MeetingSchedulerService', kind: 'component', stereotype: 'facade' },
        { id: 'conflict', name: 'ConflictDetectionService', kind: 'component' },
        { id: 'lock', name: 'lock\n(ReentrantLock, fair, module-wide)', kind: 'component', stereotype: 'lock' },
        { id: 'repo', name: 'MeetingSchedulerRepository', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['repo'], text: 'No meetings yet. Falcon and Griffin are both free; Bob has nothing booked.' },
        { from: 'alice', to: 'service', text: 'bookMeeting(Falcon, "alice", ["bob"], 10:00-11:00)' },
        { from: 'carol', to: 'service', text: 'bookMeeting(Griffin, "carol", ["bob"], 10:30-12:00)  — arrives ~simultaneously' },
        { from: 'service', to: 'conflict', text: '[Alice] book(Falcon, ...)' },
        { from: 'conflict', to: 'lock', text: '[Alice] lock.lock()  — acquired', activate: 'lock' },
        { from: 'service', to: 'conflict', text: '[Carol] book(Griffin, ...)' },
        { from: 'conflict', to: 'lock', text: '[Carol] lock.lock()  — BLOCKS, Alice holds it' },
        { from: 'conflict', to: 'repo', text: '[Alice] getMeetingsForRoom(Falcon) -> empty, no room conflict' },
        { from: 'conflict', to: 'repo', text: '[Alice] getMeetingsForAttendee("alice"), getMeetingsForAttendee("bob") -> both empty' },
        { from: 'conflict', to: 'repo', text: '[Alice] saveMeeting(Meeting A: Falcon, 10:00-11:00)' },
        { from: 'conflict', to: 'lock', text: '[Alice] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'alice', text: 'return Meeting A (SCHEDULED)', type: 'return' },
        { from: 'lock', to: 'conflict', text: '[Carol] lock() finally returns — Carol is now inside', activate: 'lock' },
        { from: 'conflict', to: 'repo', text: '[Carol] getMeetingsForRoom(Griffin) -> empty, no room conflict' },
        { type: 'note', over: ['repo'], text: 'This is the check a per-room lock would never reach: Bob\'s calendar lives outside either room\'s own lock.' },
        { from: 'conflict', to: 'repo', text: '[Carol] getMeetingsForAttendee("bob") -> [Meeting A, 10:00-11:00] — overlaps 10:30-12:00!' },
        { from: 'conflict', to: 'lock', text: '[Carol] lock.unlock()', deactivate: 'lock' },
        { from: 'service', to: 'carol', text: 'throw AttendeeConflictException("bob already has a conflicting meeting...")', type: 'return' },
        { type: 'note', over: ['alice', 'carol'], text: 'Exactly one booking wins even though the two meetings target completely different rooms — a per-room lock would have let both through. See MeetingSchedulerConcurrencyTest#sameAttendeeDifferentRooms_onlyOneWins, repeated 200x in #repeatedCrossRoomRaceNeverProducesTwoWinners.' },
      ],
    },
  ],
};
