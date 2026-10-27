export default {
  title: 'Question dispatch and hidden members',
  summary: 'One interface operation dispatches to the runtime implementation; hidden fields and static methods follow separate selection rules.',
  classes: [{
    name: 'PracticeQuestion', kind: 'public interface', source: 'PracticeQuestion.java', description: 'Requires a nonblank question using the stripped topic without changing state.',
    fields: [], methods: ['+ ask(topic: String): String {abstract}'],
  }, {
    name: 'OpenPracticeQuestion', kind: 'public class', source: 'OpenPracticeQuestion.java', description: 'Implements ask and declares deliberate field/static hiding examples.',
    fields: ['+ badge: String {final}'], methods: ['+ category(): String {static}', '+ ask(topic: String): String'],
  }, {
    name: 'HintedPracticeQuestion', kind: 'public final class', source: 'HintedPracticeQuestion.java', description: 'Overrides ask; declares a distinct badge field and hides category.',
    fields: ['+ badge: String {final}'], methods: ['+ category(): String {static}', '+ ask(topic: String): String', '+ hint(): String'],
  }],
  relationships: [{ from: 'OpenPracticeQuestion', to: 'PracticeQuestion', kind: 'Realization', explanation: 'implements supplies ask. The interface reference exposes ask, not implementation-only hint.' }, { from: 'HintedPracticeQuestion', to: 'OpenPracticeQuestion', kind: 'Generalization', explanation: 'extends inherits the interface contract and overrides ask, calling super.ask before appending a hint.' }],
  notes: ['The two badge declarations denote distinct fields in a hinted object. Field access and static category selection do not use virtual instance dispatch.', 'Local aliases and overloaded demo helpers are omitted; the lesson’s Java code and recorded calls show their declared-type selection.', 'No multiplicity or ownership follows from subtype relationships.'],
};
