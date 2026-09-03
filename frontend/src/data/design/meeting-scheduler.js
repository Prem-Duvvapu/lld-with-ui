// designDetails — meetingScheduler
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Meeting Scheduler — Design Details',
  requirements: [
    'Room catalog — bookable MeetingRoom entities with a name, capacity and location',
    'Meeting booking — an organizer books a room for [start, end) with a title and a list of attendee ids',
    'Room-level conflict prevention — a room may never carry two non-cancelled meetings with overlapping times',
    'Attendee-level conflict prevention — the organizer or any attendee already booked into an overlapping meeting, in ANY room, is rejected — not just a room-availability check',
    'Cancellation — cancelling a meeting frees its room and every participant\'s calendar for that slot immediately',
    'Availability lookup — list every booked slot for a given room on a given date',
    'Per-person lookup — list every meeting a given person organizes or attends, across all rooms',
  ],
  entities: [
    {
      name: 'MeetingSchedulerService',
      description: 'Facade orchestrating the whole module. Holds a second, isolated repository + conflict-detection pair for the /sim/* sandbox, so the interactive demo can never touch live room or meeting data.',
      fields: [
        {
          name: 'repository',
          type: 'MeetingSchedulerRepository',
          description: 'In-memory storage for live rooms and meetings'
        },
        {
          name: 'conflictService',
          type: 'ConflictDetectionService',
          description: 'Owns the single lock that guards booking and cancellation'
        }
      ],
      methods: [
        {
          name: 'bookMeeting(roomId, organizerId, attendeeIds, title, start, end)',
          returns: 'Meeting',
          description: 'Validates the time range, then delegates the atomic conflict-check-and-create to ConflictDetectionService'
        },
        {
          name: 'cancelMeeting(meetingId)',
          returns: 'Meeting',
          description: 'Marks the meeting CANCELLED, freeing its room and every participant\'s calendar'
        },
        {
          name: 'getAvailability(roomId, date)',
          returns: 'List<Meeting>',
          description: 'Every non-cancelled meeting in this room on the given date, earliest first'
        },
        {
          name: 'getMeetingsForPerson(personId)',
          returns: 'List<Meeting>',
          description: 'Every meeting where this person organizes or attends, across all rooms'
        }
      ]
    },
    {
      name: 'ConflictDetectionService',
      description: 'The concurrency core of the module. Serialises booking and cancellation with a SINGLE fair ReentrantLock — a deliberate departure from the per-resource lock used elsewhere in this repo (e.g. car-rental\'s per-vehicle lock), because a meeting has two conflict dimensions (the room, and every participant\'s calendar) that don\'t share a lockable key. See the Tradeoffs section for the full argument.',
      fields: [
        {
          name: 'lock',
          type: 'ReentrantLock',
          description: 'One fair lock for the entire module, guarding both book() and cancel()'
        }
      ],
      methods: [
        {
          name: 'book(roomId, organizerId, attendeeIds, title, start, end)',
          returns: 'Meeting',
          description: 'Checks the room\'s calendar, then every participant\'s calendar, for an overlap; only creates the meeting if both checks pass, all under one lock acquisition'
        },
        {
          name: 'cancel(meetingId)',
          returns: 'Meeting',
          description: 'Marks a meeting CANCELLED under the same lock'
        }
      ]
    },
    {
      name: 'MeetingSchedulerRepository',
      description: 'In-memory storage. Plain ConcurrentHashMaps per entity — safe for independent reads/writes of different keys, but insufficient on its own to prevent an overlapping booking; that invariant lives entirely in ConflictDetectionService.',
      fields: [
        {
          name: 'rooms',
          type: 'Map<String, MeetingRoom>',
          description: 'All rooms, keyed by id'
        },
        {
          name: 'meetings',
          type: 'Map<String, Meeting>',
          description: 'All meetings, keyed by id, regardless of status'
        }
      ],
      methods: [
        {
          name: 'getMeetingsForRoom(roomId)',
          returns: 'List<Meeting>',
          description: 'Every meeting ever booked into this room, regardless of status — the caller filters by what still blocks the calendar'
        },
        {
          name: 'getMeetingsForAttendee(personId)',
          returns: 'List<Meeting>',
          description: 'Every meeting where this person is the organizer or a listed attendee'
        }
      ]
    },
    {
      name: 'MeetingRoom',
      description: 'A bookable physical room. Deliberately carries no lock of its own, unlike carrental.model.Vehicle — see ConflictDetectionService.',
      fields: [
        { name: 'id', type: 'String', description: 'Generated id, e.g. MR-001' },
        { name: 'name', type: 'String', description: 'Display name, e.g. "Falcon"' },
        { name: 'capacity', type: 'int', description: 'Seats in the room' },
        { name: 'location', type: 'String', description: 'Human-readable location, e.g. floor/wing' }
      ],
      methods: []
    },
    {
      name: 'Meeting',
      description: 'A booked slot in one room. Tracks its own organizer and attendee list so ConflictDetectionService can check every participant\'s calendar without a separate join table.',
      fields: [
        { name: 'roomId', type: 'String', description: 'The room this meeting occupies' },
        { name: 'organizerId', type: 'String', description: 'The person who booked the meeting' },
        { name: 'attendeeIds', type: 'List<String>', description: 'Everyone else invited' },
        { name: 'start', type: 'LocalDateTime', description: 'Inclusive start' },
        { name: 'end', type: 'LocalDateTime', description: 'Exclusive end' },
        { name: 'status', type: 'MeetingStatus', description: 'SCHEDULED or CANCELLED' }
      ],
      methods: [
        {
          name: 'allParticipants()',
          returns: 'List<String>',
          description: 'organizerId plus every attendeeId — the full set of calendars this meeting occupies'
        }
      ]
    },
    {
      name: 'MeetingStatus',
      description: 'A meeting\'s lifecycle. Only two states — there is no reschedule/move operation, so the state space stays intentionally small.',
      fields: [],
      methods: [
        {
          name: 'blocksCalendar()',
          returns: 'boolean',
          description: 'True only for SCHEDULED — the one rule ConflictDetectionService needs from this enum'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Facade',
      used: true,
      explanation: 'MeetingSchedulerService is the single entry point the controller talks to, coordinating MeetingSchedulerRepository and ConflictDetectionService without the controller knowing either exists.'
    },
    {
      name: 'Repository',
      used: true,
      explanation: 'MeetingSchedulerRepository wraps ConcurrentHashMaps behind get/save/update methods, so ConflictDetectionService and MeetingSchedulerService never touch a Map directly.'
    },
    {
      name: 'State (via typed enum)',
      used: true,
      explanation: 'MeetingStatus.blocksCalendar() is the one rule the rest of the module needs from a meeting\'s lifecycle — lighter than car-rental\'s ReservationStatus (which needs a full transition table) because there is only ever one legal move: SCHEDULED to CANCELLED.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Considered for room selection (e.g. "cheapest available room ≥ capacity N"), but every booking here names its room explicitly rather than asking the system to pick one, so there is no policy to make swappable yet.'
    },
    {
      name: 'Observer',
      used: false,
      explanation: 'A NotificationObserver could alert attendees when they are booked or a meeting they are in gets cancelled, without ConflictDetectionService or MeetingSchedulerService managing notification logic directly.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'MeetingSchedulerService orchestrates the workflow and validates input. ConflictDetectionService owns concurrency safety for the one contended invariant (no overlapping bookings, on either dimension). MeetingSchedulerRepository owns storage. Each has exactly one reason to change.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Interval-overlap logic exists in exactly one private method, ConflictDetectionService.overlaps(), used identically for the room check and every participant check — the two can never silently drift apart.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'MeetingSchedulerService depends on MeetingSchedulerRepository\'s get/save methods, never on the underlying Map — the storage implementation could change without touching the service.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new room attribute (e.g. video-conferencing equipment) is a new field on MeetingRoom. It touches no conflict-detection logic, since conflicts are about time overlap, not room attributes.'
    }
  ],
  oopConcepts: [
    {
      name: 'Encapsulation — Calendar-Blocking Rule',
      description: 'MeetingStatus.blocksCalendar() is the only place that knows whether a given status still occupies the calendar. ConflictDetectionService and MeetingSchedulerService both call it rather than comparing against MeetingStatus.SCHEDULED directly, so a future third status (e.g. TENTATIVE) only requires one method to change.',
      alternative: 'Comparing status == MeetingStatus.SCHEDULED at every call site was rejected — a new status would require finding and updating every comparison.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Meeting has-a roomId and has-a list of attendeeIds rather than extending a shared base or modeling attendees as a separate joined entity. allParticipants() composes organizerId and attendeeIds into one list on demand.',
      alternative: 'A separate Attendance join entity was considered and rejected as unnecessary indirection — nothing in this module needs attendance records to outlive the meeting itself.'
    }
  ],
  extensibility: [
    {
      area: 'Room Capacity Enforcement',
      description: 'Reject a booking whose organizer + attendeeIds count exceeds MeetingRoom.capacity. A pure validation addition in MeetingSchedulerService.bookMeeting(), no change to ConflictDetectionService.',
      difficulty: 'Easy'
    },
    {
      area: 'Recurring Meetings',
      description: 'Add a RecurrenceRule to Meeting and expand it into individual Meeting instances at booking time, each independently conflict-checked through the existing book() path.',
      difficulty: 'Medium'
    },
    {
      area: 'Attendee Notifications',
      description: 'Add a NotificationObserver invoked from ConflictDetectionService.book()/cancel() so attendees hear about a new booking or a cancellation — same shape as inventory\'s StockAlertNotifier.',
      difficulty: 'Medium'
    },
    {
      area: 'Room Suggestion',
      description: 'Add a RoomSuggestionStrategy that, given a capacity and time range, returns the first free matching room instead of requiring the caller to name one — the Strategy slot this module deliberately left open.',
      difficulty: 'Medium'
    }
  ],
  tradeoffs: [
    'Single global lock vs. per-room lock: car-rental\'s per-vehicle ReentrantLock (keyed via computeIfAbsent) is the natural precedent for "lock the resource being booked" — but it only works because a vehicle reservation has ONE conflict dimension (the vehicle). A meeting has TWO: the room, and every participant\'s calendar, and a participant can appear in meetings across any number of different rooms. A per-room lock cannot make attendee-conflict checking safe — two threads booking the same person into two different rooms at overlapping times would each acquire a different room\'s lock, each see that person\'s calendar as clean, and both succeed. ConflictDetectionService uses one lock for the whole module instead, trading booking throughput (only one booking is validated at a time, module-wide) for actual correctness across both dimensions — the right tradeoff here, since booking volume in a scheduler is nowhere near contended enough for throughput to matter, and a double-booked room or double-booked attendee is a real, visible failure.',
    'No room capacity enforcement: MeetingRoom.capacity is stored but not currently checked against attendee count at booking time. Left as a listed extensibility item rather than built in, since it is pure validation with no interaction with the concurrency design.',
    'No past-time restriction: bookMeeting() rejects end <= start but not a start time in the past, unlike a production scheduler. This keeps the demo/test surface simple — seed data and tests can use fixed or relative-to-now times without fighting a moving "now" boundary.',
    'No reschedule operation: moving a meeting to a new time/room is modeled as cancel-then-rebook rather than a dedicated move() method, keeping MeetingStatus to two states and reusing the exact same conflict-checking path a fresh booking uses, rather than a second, parallel one.'
  ],
  summary: 'Room-and-person conflict-checked meeting booking. The defining engineering problem is not "is this room free" as an isolated boolean but "does this booking conflict with anything, on either of two independent dimensions (the room, and every participant\'s calendar, which spans rooms)" — answered by a single module-wide ReentrantLock rather than car-rental\'s per-resource lock, because no single lockable key covers both dimensions at once.',
  highlights: [
    'ConflictDetectionService serialises booking and cancellation behind ONE lock rather than a per-room lock — documented as a deliberate departure from car-rental\'s per-vehicle-lock precedent, because attendee conflicts span rooms and a per-room lock cannot see them.',
    'A single overlaps() check is reused for both the room-level scan and every participant-level scan, so the room and attendee conflict rules can never drift apart.',
    'MeetingStatus keeps a two-state lifecycle (SCHEDULED/CANCELLED) instead of a full transition table — the smallest state machine that still needs a rule at all.',
    'Isolated /api/meetingscheduler/sim/* engine backed by its own MeetingSchedulerRepository + ConflictDetectionService instance, so the interactive demo can race a real room-conflict and a real cross-room attendee-conflict without any risk to live bookings.'
  ]
};
