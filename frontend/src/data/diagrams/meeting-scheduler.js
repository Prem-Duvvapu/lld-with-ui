// classDiagrams — meetingScheduler
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Meeting Scheduler — Class Diagram',
  classes: [
    {
      name: 'MeetingSchedulerService',
      stereotype: 'facade',
      fields: [
        '- repository: MeetingSchedulerRepository',
        '- conflictService: ConflictDetectionService'
      ],
      methods: [
        '+ bookMeeting(roomId, organizerId, attendeeIds, title, start, end): Meeting',
        '+ cancelMeeting(meetingId): Meeting',
        '+ getAvailability(roomId, date): List<Meeting>',
        '+ getMeetingsForPerson(personId): List<Meeting>',
        '+ getAllRooms(): List<MeetingRoom>'
      ]
    },
    {
      name: 'ConflictDetectionService',
      fields: [
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ book(roomId, organizerId, attendeeIds, title, start, end): Meeting',
        '+ cancel(meetingId): Meeting',
        '- overlaps(s1, e1, s2, e2): boolean'
      ]
    },
    {
      name: 'MeetingSchedulerRepository',
      fields: [
        '- rooms: ConcurrentHashMap',
        '- meetings: ConcurrentHashMap'
      ],
      methods: [
        '+ getMeetingsForRoom(roomId): List<Meeting>',
        '+ getMeetingsForAttendee(personId): List<Meeting>',
        '+ saveMeeting(meeting): Meeting',
        '+ saveRoom(room): MeetingRoom'
      ]
    },
    {
      name: 'MeetingRoom',
      fields: [
        '- id: String',
        '- name: String',
        '- capacity: int',
        '- location: String'
      ],
      methods: []
    },
    {
      name: 'Meeting',
      fields: [
        '- id: String',
        '- roomId: String',
        '- organizerId: String',
        '- attendeeIds: List<String>',
        '- title: String',
        '- start: LocalDateTime',
        '- end: LocalDateTime',
        '- status: MeetingStatus'
      ],
      methods: [
        '+ allParticipants(): List<String>'
      ]
    },
    {
      name: 'MeetingStatus',
      stereotype: 'enum',
      fields: [
        'SCHEDULED',
        'CANCELLED'
      ],
      methods: [
        '+ blocksCalendar(): boolean'
      ]
    }
  ],
  relationships: [
    { from: 'MeetingSchedulerService', to: 'MeetingSchedulerRepository', label: 'uses' },
    { from: 'MeetingSchedulerService', to: 'ConflictDetectionService', label: 'delegates booking to' },
    { from: 'ConflictDetectionService', to: 'MeetingSchedulerRepository', label: 'reads/writes under lock' },
    { from: 'ConflictDetectionService', to: 'Meeting', label: 'creates' },
    { from: 'Meeting', to: 'MeetingRoom', label: 'booked into' },
    { from: 'Meeting', to: 'MeetingStatus', label: 'has state' }
  ]
};
