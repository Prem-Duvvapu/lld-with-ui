export default {
  title: 'Companion classes: requests, outcomes and one retained booking',
  summary: 'Selected declarations from the sequential Java example. These are structural relationships; the separate activity view describes control flow through one request.',
  classes: [
    {
      name: 'BookingRequest', kind: 'public record', source: 'activity/BookingRequest.java',
      description: 'Raw room ID and attendee count. Generated record construction permits invalid values so that the service can reject them as business outcomes.',
      fields: ['- roomId: String {final}', '- attendees: int {final}'],
      methods: ['+ BookingRequest(roomId: String, attendees: int)', '+ roomId(): String', '+ attendees(): int'],
    },
    {
      name: 'BookingResult', kind: 'public record', source: 'activity/BookingResult.java',
      description: 'Scalar outcome and explanation. No request, service or console reference is retained. Status strings are this example’s vocabulary, not UML keywords.',
      fields: ['- status: String {final}', '- message: String {final}'],
      methods: ['+ BookingResult(status: String, message: String)', '+ status(): String', '+ message(): String'],
    },
    {
      name: 'RoomBookingService', kind: 'public final class', source: 'activity/RoomBookingService.java',
      description: 'Validates before checking the fixed slot. Only confirmation stores a request; rejection preserves the earlier reference. No clock, persistence or synchronization is provided.',
      fields: ['- booking: BookingRequest'],
      methods: ['+ request(request: BookingRequest): BookingResult', '- isValid(request: BookingRequest): boolean', '+ available(): boolean', '+ booking(): BookingRequest'],
    },
  ],
  relationships: [
    {
      from: 'RoomBookingService', to: 'BookingRequest', kind: 'Association',
      explanation: 'The booking field retains the accepted immutable request. A caller can also retain that same object; neither composition nor exclusive ownership is asserted.',
      multiplicity: 'Each service retains 0..1 BookingRequest; a request can be supplied to multiple independent services, so no exclusive reverse bound is claimed.',
      navigation: 'Service → BookingRequest through booking; BookingRequest has only scalar components and no service reference.',
    },
    {
      from: 'RoomBookingService', to: 'BookingResult', kind: 'Dependency',
      explanation: 'request constructs and returns a BookingResult on every branch without storing it in a field. A returned value is a use dependency, not an ordered activity arrow between classes.',
      navigation: 'Service uses BookingResult construction and return type; BookingResult has no service reference.',
    },
  ],
  notes: [
    'Records have generated accessors and equality methods. This view lists their components, canonical constructors and accessors; generated Object overrides, the implicit service constructor, JDK types and ActivityDemo formatting are omitted.',
    'The records contain only String/int data, so retaining a request cannot expose a mutable attendee count. A record declaration in general does not guarantee deep immutability of arbitrary components.',
    'The service is sequential and in memory. A second request on a different service can confirm the same room and fixed slot. No global availability, authentication or concurrency guarantee is claimed.',
    'No inheritance, realization, aggregation or composition relationship is needed here. Activity decision and merge diamonds are control nodes, unrelated to class ownership diamonds.',
  ],
};
