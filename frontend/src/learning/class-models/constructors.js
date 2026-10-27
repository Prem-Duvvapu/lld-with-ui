export default {
  title: 'Session construction model',
  summary: 'FocusedSession extends LearningSession and adds its own mutable duration. Constructors are operations, not inherited members.',
  classes: [{
    name: 'LearningSession', kind: 'public class', source: 'LearningSession.java', description: 'Validates and stores the base topic before derived initialization.',
    fields: ['- topic: String {final}'],
    methods: ['# LearningSession(topic: String, trace: List<String>)', '+ getTopic(): String {final}'],
  }, {
    name: 'FocusedSession', kind: 'public final class', source: 'FocusedSession.java', description: 'Offers a default 25-minute overload and an explicit positive duration.',
    fields: ['- minutes: int'],
    methods: ['+ FocusedSession(topic: String, trace: List<String>)', '+ FocusedSession(topic: String, minutes: int, trace: List<String>)', '+ getMinutes(): int', '+ extend(extraMinutes: int): void'],
  }],
  relationships: [{ from: 'FocusedSession', to: 'LearningSession', kind: 'Generalization', explanation: 'The declaration says extends LearningSession. The short constructor delegates with this(...); the longer one calls super(topic, trace). These calls do not create additional session objects.' }],
  notes: ['getTopic is inherited and final; topic remains a private base field. Constructors are not inherited.', 'trace is a parameter, not a retained session field; demo trace plumbing is omitted from relationship rows.', 'A completed base trace event remains if derived validation fails. Construction is not a transaction or rollback guarantee.'],
};
