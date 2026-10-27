import classModel from '../class-models/association';
import tutorSource from '../examples/association/AssociationTutor.java?raw';
import learnerSource from '../examples/association/AssociationLearner.java?raw';
import demoSource from '../examples/association/AssociationDemo.java?raw';
import output from '../examples/association-output.txt?raw';
import snapshots from '../examples/association-snapshots.json';

export default {
  classModel,
  id: 'association',
  summary: 'Make an object relationship concrete with real references. Follow two learners sharing a tutor, one reassignment, a rejected assignment and deliberate unlinking.',
  prerequisites: 'Classes and Objects: constructing instances, reference variables and instance methods. Private fields and simple validation are explained in the example.',
  objectives: [
    'Distinguish an association between classes from the current links between their objects.',
    'Read direction and multiplicity, and identify which rules the actual Java API enforces.',
    'Predict how sharing, reassignment and clearing affect references without inferring ownership or deletion.',
  ],
  problem: 'A study group lets each learner choose a tutor for the same subject. A tutor can help several learners. If Ada changes tutors, should Ben move too? If both learners unassign their tutor, does that mean the tutor has been deleted?',
  explanation: [
    { title: 'Name the relationship and its current links', text: 'Association describes a relationship in which objects know about or interact with other objects. Here a learner retains a tutor reference and uses it to describe the assignment. The classes define the possible relationship; Ada linked to Mira is one concrete object link. Neither class extends the other. A one-off method call using a parameter can instead be modeled as a dependency; a call alone does not prove a retained structural link.' },
    { title: 'Read the class relationship in both directions', text: 'AssociationLearner [0..*] --tutor--> [0..1] AssociationTutor is the text illustration used below. The tutor role is navigable from a learner through getTutor(). The 0..1 at the tutor end means each learner may have zero or one tutor; 0..* at the learner end permits any number of learners for a tutor, including none. Multiplicity at an end counts objects at that end for one object at the opposite end. The arrow describes navigation, not message timing, inheritance or ownership.' },
    { title: 'Separate a label from enforcement', text: 'The nullable, single tutor field represents at most one current tutor per learner. Starting unassigned and allowing clearTutor makes zero valid. assignTutor rejects null and a subject mismatch before replacing the link. Subject comparison is case-sensitive after trimming constructor input. The tutor stores no learner collection and enforces no capacity limit. A diagram does not add these checks to Java: an exactly-one rule would need a different construction and clearing policy, and a maximum learner count would need explicit tracking and validation.' },
    { title: 'Follow shared references through reassignment', text: 'Ada and Ben can hold the same Mira object reference. getTutor returns that actual reference, not a copy. saved = ada.getTutor() remembers Mira; ada.assignTutor(noor) then changes only Ada’s field. Ben and saved still refer to Mira. The same tutor names would not by themselves prove sharing: the Java tests use reference identity (==). Validation failure leaves the previous field untouched, so attempting to assign SQL tutor Sol cannot erase Ada’s valid Java tutor.' },
    { title: 'Choose navigability deliberately', text: 'A learner can reach its tutor, but AssociationTutor has no learner field or getLearners method. The program cannot discover all learners by navigating backward from that object alone. A service with a directory could search learners separately. If you add a reverse collection, every assign, reassign and clear must keep both directions consistent; Java will not maintain it for you. One-way navigation says nothing about whether several learners may point at the same tutor.' },
    { title: 'Do not turn a reference into an ownership claim', text: 'Tutors are constructed separately, can be shared and remain usable through the demo’s references after learners clear their links. These are independent domain lifecycles in this model. Holding a reference alone does not say who owns an object or who may end its domain existence. Aggregation and composition add whole/part interpretations; shared aggregation needs an explicit domain meaning, while UML composition adds stronger part-ownership constraints. This lesson establishes neither whole/part contract. Their design details belong to the later lessons.' },
    { title: 'Keep domain lifecycle separate from memory reclamation', text: 'clearTutor writes null to one field. It does not destroy the former tutor or invoke a domain deletion operation. Garbage collection considers reachability, not UML diamonds or the word owner. A tutor with no future reachable use may eventually have its storage reclaimed, but that is not a modeled deletion policy or a promise about when collection occurs. The example proves later method calls through retained references and makes no System.gc or finalization claim.' },
  ],
  visual: { title: 'Inspect the learner–tutor links', summary: 'One-way navigation · optional tutor per learner · shared tutor objects', snapshots },
  code: [
    { filename: 'association/AssociationTutor.java', source: tutorSource },
    { filename: 'association/AssociationLearner.java', source: learnerSource },
    { filename: 'association/AssociationDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out association/AssociationTutor.java association/AssociationLearner.java association/AssociationDemo.java\njava -cp out com.lld.learning.examples.association.AssociationDemo',
  quiz: {
    prompt: 'Both learners share Mira. After saved = ada.getTutor() and ada.assignTutor(noor), which references identify Mira?',
    options: [
      { id: 'both-move', text: 'Neither: changing Ada also changes Ben and saved to Noor', feedback: 'Each variable or field stores its own reference. Replacing Ada’s field does not reassign Ben’s field or the saved local variable.' },
      { id: 'separate-links', text: 'Ben’s tutor and saved; Ada’s tutor identifies Noor', feedback: 'Correct. Ada’s link changes independently. Ben and saved still identify the original Mira object; no tutor was copied or deleted.', correct: true },
      { id: 'copy', text: 'Only Ben’s tutor: saved is a separate copy of Mira', feedback: 'getTutor returns the actual tutor reference. Assigning that reference to saved does not construct or clone a tutor.' },
    ],
  },
  exercise: 'Add switchTutor(expectedCurrent, replacement) to your copy of AssociationLearner. It should replace the link only if expectedCurrent is the exact current tutor reference (null may represent the unassigned state); reject a stale expectation and keep the existing null/subject validation for the replacement. Test successful switching, stale expectations, a wrong-subject replacement and the same current tutor supplied again. Save an old reference and keep a second learner linked to that tutor. Explain the resulting links, the 0..1 multiplicity and why no reverse tutor directory or ownership follows from the field. Keep the example single-threaded.',
  rubric: [
    'Compare the expected tutor by reference identity, not by name, and check the expectation before changing the field.',
    'Reuse assignTutor validation for a valid replacement; every rejected request preserves the old link.',
    'Verify the old reference and second learner remain unchanged after a successful switch, including when two distinct tutors have equal names.',
    'Test optional initial assignment, stale expectations, wrong subjects, null replacement and assigning the same object again.',
    'Explain direction, allowed multiplicities and independent domain lifecycle without claiming thread safety, automatic reverse updates or garbage-collection ownership.',
  ],
  pitfalls: [
    'A single reference limits the current value to one object; it does not ensure nonnull values or validate compatible subjects by itself.',
    'The tutor has no reverse learner directory. Drawing or adding one requires a consistency policy for all link mutations, not just a getter.',
    'No maximum learners per tutor is enforced. Zero or more in the model does not mean a test has created infinitely many objects; the concrete demo shares one tutor between two learners.',
    'The tutor is immutable in this example, so returning it does not expose mutable tutor state. Returning a mutable associated object would require a separate API-boundary decision.',
    'These links use direct object references, not only tutor-name strings. Equal display names do not establish object identity or uniqueness.',
    'Neither private fields nor check-before-assignment make a concurrent workflow atomic. This lesson has no persistence, concurrent scheduling or bidirectional synchronization.',
  ],
  module: {
    path: '/uber',
    title: 'Trace the Ride-to-Driver association in Uber',
    text: 'Ride contains both a Driver reference and a driverId string. DriverAssignmentService.assign obtains an existing repository driver and stores it with ride.setDriver(current); Driver has no reverse Ride field. Assignment constraints come from the service’s checks and locks, not from that field alone. release makes the existing driver AVAILABLE again rather than deleting it; it does not clear historical ride references. The tutor example allows sharing immediately, while Uber restricts active assignment and can reuse a driver across successive rides. Distinguish those domain rules from the shared reference mechanism.',
    sources: [
      'backend/src/main/java/com/lld/uber/model/Ride.java',
      'backend/src/main/java/com/lld/uber/model/Driver.java',
      'backend/src/main/java/com/lld/uber/service/DriverAssignmentService.java',
      'backend/src/main/java/com/lld/uber/repository/UberRepository.java',
      'backend/src/test/java/com/lld/uber/UberConcurrencyTest.java',
    ],
  },
  summaryPoints: [
    'An association describes possible object relationships; a stored reference is one current link that can be shared or replaced.',
    'Navigation direction, multiplicity and domain validation answer different questions. Trace the fields and operations that implement each claim.',
    'Holding or clearing a reference does not by itself establish ownership, a whole/part relationship or a deletion policy.',
  ],
  references: [
    { title: 'OMG UML 2.5.1: Associations (§11.5)', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'Java 17 Language Specification: Objects and References', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3.1' },
    { title: 'Java 17 Language Specification: Reachability (§12.6.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.6.1' },
  ],
};
