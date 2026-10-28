export default {
  title: 'StudySeat responsibility model',
  summary: 'Reservation requirements become private state and guarded operations on one StudySeat.',
  classes: [{
    name: 'StudySeat', kind: 'public class', source: 'howtolearn/StudySeat.java',
    description: 'Accepts one reservation at a time and validates cancellation.',
    fields: ['- seatId: String {final}', '- reservedBy: String'],
    methods: ['+ StudySeat(seatId: String)', '+ getSeatId(): String', '+ getReservedBy(): String', '+ isReserved(): boolean', '+ reserve(learnerId: String): void', '+ cancel(learnerId: String): void', '- requireText(value: String, label: String): String {static}'],
  }],
  relationships: [],
  noRelationships: 'reservedBy stores a String identifier. No Learner class or object association is implemented by this example.',
  notes: ['reservedBy is null when free. reserve rejects an occupied seat; cancel requires a matching trimmed learner ID before clearing it.', 'These are sequential checks. A class diagram and private fields do not provide authentication, persistence or concurrent reservation safety.'],
};
