export default {
  title: 'Visibility across package boundaries',
  summary: 'VisibilityRecord declares four access levels. A same-package peer and an outside subclass have different access paths.',
  classes: [{
    name: 'VisibilityRecord', kind: 'public class · visibility package', source: 'visibility/VisibilityRecord.java', description: 'Keeps id and secret private while exposing selected operations.',
    fields: ['- id: String {final}'],
    methods: ['+ VisibilityRecord(id: String)', '+ summary(): String', '# subclassHint(): String', '~ packageHint(): String', '- secret(): String', '+ inspectOwnMembers(): String'],
  }, {
    name: 'VisibilityPeer', kind: 'public final class · visibility package', source: 'visibility/VisibilityPeer.java', description: 'Reads public, protected and package access operations through its parameter.',
    fields: [], methods: ['+ inspect(record: VisibilityRecord): String {static}'],
  }, {
    name: 'VisibilityChild', kind: 'public final class · outside package', source: 'outside/VisibilityChild.java', description: 'Uses inherited protected behavior on itself or another child receiver.',
    fields: [], methods: ['+ VisibilityChild(id: String)', '+ ownHint(): String', '+ childHint(other: VisibilityChild): String'],
  }, {
    name: 'InternalNote', kind: 'package access final class · visibility package', source: 'visibility/VisibilityRecord.java', description: 'A separate top-level type hidden outside its package.', fields: [], methods: [],
  }],
  relationships: [{ from: 'VisibilityChild', to: 'VisibilityRecord', kind: 'Generalization', explanation: 'extends crosses the package boundary. The child may use subclassHint through a VisibilityChild receiver; an arbitrary VisibilityRecord receiver does not grant cross-package protected access.' }, { from: 'VisibilityPeer', to: 'VisibilityRecord', kind: 'Dependency', explanation: 'inspect uses a parameter and retains no record field. Same-package access permits packageHint and subclassHint, but not secret.' }],
  notes: ['Package labels abbreviate com.lld.learning.examples.visibility and com.lld.learning.examples.outside.', 'Private access here concerns separate top-level classes. Java nested types can access private members of their enclosing nest.', 'Inherited public operations are not repeated in the child compartment. VisibilityDemo and implicit constructors are omitted.'],
};
