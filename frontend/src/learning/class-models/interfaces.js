export default {
  title: 'Formatter contract and implementations',
  summary: 'Callers can use the MessageFormatter contract while implementations supply different formatting behavior.',
  classes: [{
    name: 'MessageFormatter', kind: 'public interface', source: 'MessageFormatter.java', description: 'Requires rejection of null/blank text and formatting without changing caller input.',
    fields: [], methods: ['+ format(text: String): String {abstract}'],
  }, {
    name: 'PlainFormatter', kind: 'public final class', source: 'PlainFormatter.java', description: 'Returns trimmed text.', fields: [], methods: ['+ format(text: String): String'],
  }, {
    name: 'TaggedFormatter', kind: 'public final class', source: 'TaggedFormatter.java', description: 'Stores a validated tag and prefixes trimmed text.',
    fields: ['- tag: String {final}'], methods: ['+ TaggedFormatter(tag: String)', '+ format(text: String): String', '+ getTag(): String'],
  }],
  relationships: [{ from: 'PlainFormatter', to: 'MessageFormatter', kind: 'Realization', explanation: 'implements supplies the public format operation with plain behavior.' }, { from: 'TaggedFormatter', to: 'MessageFormatter', kind: 'Realization', explanation: 'implements supplies the same operation with tagged behavior. getTag is available through the concrete type, not the interface API.' }],
  notes: ['The interface operation is implicitly public abstract. An implements declaration checks signatures, not every written behavioral requirement.', 'The demo’s local formatter variables are not stored associations. No ownership or multiplicity is implied by realization.'],
};
