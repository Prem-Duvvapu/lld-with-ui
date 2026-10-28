export default {
  title: 'Class state and instance state',
  summary: 'StudyCounter separates shared class members from fields on each object; FocusCounter demonstrates static hiding and instance overriding.',
  classes: [{
    name: 'StudyCounter', kind: 'public class', source: 'memberstate/StudyCounter.java', description: 'Counts completed base constructor bodies separately from each object’s completed work.',
    fields: ['+ DEFAULT_MINUTES: int {static final}', '- created: int {static}', '- completed: int', '- id: int {final}', '- topic: String {final}'],
    methods: ['- initializeClass(): int {static}', '- initializeInstance(): int', '+ StudyCounter(topic: String)', '+ complete(): void', '+ completed(): int', '+ id(): int', '+ topic(): String', '+ description(): String', '+ createdCount(): int {static}', '+ category(): String {static}', '+ initializationTrace(): List<String> {static}'],
  }, {
    name: 'FocusCounter', kind: 'public class', source: 'memberstate/FocusCounter.java', description: 'Shares the base counter while changing category selection and description behavior.',
    fields: [], methods: ['+ FocusCounter(topic: String)', '+ category(): String {static}', '+ description(): String'],
  }, {
    name: 'InitializationLog', kind: 'public final class', source: 'memberstate/InitializationLog.java', description: 'Records initialization events independently of StudyCounter initialization.',
    fields: ['- EVENTS: List<String> {static final}'], methods: ['- InitializationLog()', '+ record(event: String): void {static}', '+ snapshot(): List<String> {static}'],
  }],
  relationships: [{ from: 'FocusCounter', to: 'StudyCounter', kind: 'Generalization', explanation: 'extends overrides instance description and hides static category. It declares no separate created field.' }, { from: 'StudyCounter', to: 'InitializationLog', kind: 'Dependency', explanation: 'Initialization and initializationTrace call static log operations. StudyCounter retains no log object field.' }],
  notes: ['created counts completed base constructor bodies, including subclass construction whose later code may fail. It is not a count of currently reachable objects.', 'DEFAULT_MINUTES is a compile-time constant. Static storage does not make created++ atomic, and this example is single-threaded.', 'Each object has its own completed, id and topic fields, including objects of the subtype. The final EVENTS reference still points to a mutable list.'],
};
