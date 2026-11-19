export default {
  title: 'Companion class model: the Java that enforces this lifecycle',
  summary: 'A source-curated type view, separate from the state graph. DRAFT and HELD are enum values, not Java classes. A Reservation stores one ReservationState value and validates every command before mutation.',
  classes: [
    {
      name: 'Reservation', kind: 'public final class', source: 'statemachine/Reservation.java',
      description: 'Sequential mutable domain object. Explicit logical-minute inputs drive commands; there is no clock, scheduler, database or production controller. Terminal objects retain readable fields.',
      fields: ['+ HOLD_MINUTES: long = 10 {static final}', '- state: ReservationState', '- expiresAtMinute: Long', '- lastMinute: long', '- heldEntries: int', '- heldExits: int', '- inspections: int'],
      methods: ['+ Reservation()', '+ hold(now: long): void', '+ renew(now: long): void', '+ inspect(now: long): void', '+ confirm(now: long): void', '+ expire(now: long): void', '+ cancel(now: long): void', '- requireLiveTime(now: long): void', '- requireState(expected: ReservationState): void', '- requireUnexpiredHeld(now: long): void', '- enterHeld(): void', '- exitHeld(): void', '+ state(): ReservationState', '+ expiresAtMinute(): Long', '+ lastMinute(): long', '+ heldEntries(): int', '+ heldExits(): int', '+ inspections(): int', '+ isTerminated(): boolean'],
    },
    {
      name: 'ReservationState', kind: 'public enum', source: 'statemachine/ReservationState.java',
      description: 'Four named domain outcomes/statuses. isTerminal identifies CONFIRMED and CANCELLED. A final UML vertex is not a fifth enum value and this enum is unrelated to JVM Thread.State.',
      fields: ['DRAFT {enum constant}', 'HELD {enum constant}', 'CONFIRMED {enum constant}', 'CANCELLED {enum constant}'],
      methods: ['+ isTerminal(): boolean'],
    },
  ],
  relationships: [
    { from: 'Reservation', to: 'ReservationState', kind: 'Association',
      explanation: 'The private non-null state field retains exactly one enum value. Many Reservation objects may share the same enum constant. This typed link is not a transition arrow, composition or a separate state object per reservation.',
      multiplicity: 'each Reservation → 1 ReservationState value; each enum value ← 0..* reservations',
      navigation: 'Reservation reads state and calls isTerminal. ReservationState stores no Reservation reference.' },
  ],
  notes: [
    'This selected implementation view omits StateMachineDemo, JDK types and generated enum members. All listed declarations come from the displayed Java. Visibility and modifier braces are Java teaching annotations.',
    'State machine describes one instance over time; class model describes types and stored links. Neither diagram is an automatic source parser or Java runner.',
    'One enum plus guarded methods suffices here; no class-per-state State pattern, generic UML engine or thread-safety claim is made. The counters make external re-entry and internal handling observable only in this small example.',
  ],
};
