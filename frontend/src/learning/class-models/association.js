export default {
  title: 'Optional tutor association',
  summary: 'A learner can retain one subject-matching tutor while multiple learners share the same tutor object.',
  classes: [{
    name: 'AssociationLearner', kind: 'public final class', source: 'association/AssociationLearner.java', description: 'Owns its assignment link and validates before replacement.',
    fields: ['- name: String {final}', '- subject: String {final}', '- tutor: AssociationTutor'],
    methods: ['+ AssociationLearner(name: String, subject: String)', '+ getName(): String', '+ getSubject(): String', '+ getTutor(): AssociationTutor', '+ assignTutor(candidate: AssociationTutor): void', '+ clearTutor(): void', '+ describeAssignment(): String'],
  }, {
    name: 'AssociationTutor', kind: 'public final class', source: 'association/AssociationTutor.java', description: 'Stores its own name and subject independently of assignments.',
    fields: ['- name: String {final}', '- subject: String {final}'],
    methods: ['+ AssociationTutor(name: String, subject: String)', '+ getName(): String', '+ getSubject(): String', '+ describe(): String'],
  }],
  relationships: [{ from: 'AssociationLearner', to: 'AssociationTutor', kind: 'Association', explanation: 'tutor is null when unassigned. assignTutor requires nonnull and an exact subject match after constructor trimming; clearTutor only removes the link. Tutors may be shared and reassigned.', multiplicity: 'Each learner → 0..1 tutor; each tutor ← 0..* learners.', navigation: 'Learner → tutor through its field/getter. Tutor stores no learner list or reverse reference.' }],
  notes: ['getTutor exposes the actual associated object. The tutor’s immutable fields are specific to this example.', 'Sharing and a has-a link do not assert a whole/part relationship. Clearing a link is not tutor deletion or a garbage-collection claim.', 'These are sequential assignment rules, not a concurrent tutor allocation service.'],
};
