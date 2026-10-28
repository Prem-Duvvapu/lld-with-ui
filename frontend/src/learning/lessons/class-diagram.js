import classModel from '../class-models/class-diagram';
import resourceSource from '../examples/classdiagram/Resource.java?raw';
import labelledSource from '../examples/classdiagram/Labelled.java?raw';
import bookSource from '../examples/classdiagram/Book.java?raw';
import shelfSource from '../examples/classdiagram/Shelf.java?raw';
import loanSource from '../examples/classdiagram/Loan.java?raw';
import demoSource from '../examples/classdiagram/ClassDiagramDemo.java?raw';
import output from '../examples/class-diagram-output.txt?raw';
import snapshots from '../examples/class-diagram-snapshots.json';

export default {
  id: 'class-diagram',
  classModel,
  summary: 'Read a class model as a set of structural claims, then check those claims against a small library example. Separate types from instances, required links from optional links, and ownership rules from Java reference syntax.',
  prerequisites: 'Association and inheritance, plus interfaces, aggregation, composition and dependency. Review their published lessons if a connector or ownership policy is unfamiliar. You will read Java generic lists, null checks and a private nested constructor.',
  objectives: [
    'Choose a conceptual, design or implementation viewpoint and state the information it deliberately leaves out.',
    'Read type, attribute and operation compartments, visibility, parameter types, return types and abstract/static annotations.',
    'Distinguish six relationship kinds and justify their direction, endpoint counts and navigation from code and explicit domain rules.',
    'Reconcile a selected class view with Java and assess a new model without inventing ownership, call order or runtime guarantees.',
  ],
  problem: 'A shelf can share books with another shelf. A loan must name one book and may issue one receipt. Closing a loan retires its receipt but must not retire the shared book. If every Java reference is drawn with a filled diamond, the picture promises the wrong ownership. How can a reviewer tell which structural claims the implementation actually supports?',
  explanation: [
    { title: 'Choose a viewpoint before drawing boxes', text: 'A conceptual view describes domain vocabulary and relationships without committing to Java fields. A design view assigns software responsibilities and contracts. An implementation view records selected actual declarations. These are useful viewpoints, not three mandatory UML diagram types. Our library model is an implementation view with explicit domain constraints. Resource, Book, Shelf and Loan are types; first, second, book and saved in the demo are references to particular instances. The recorded illustration traces instances at selected steps. A class diagram describes possible structure across instances, not the current heap or the order of calls.' },
    { title: 'Read one class box as a contract', text: 'Use the three compartments: type name/kind, attributes, operations. In Loan, - book: Book {final} means a private Book field whose reference cannot be reassigned. + issueReceipt(): Receipt is a public operation with no parameters and a Receipt result. In Resource, # Resource(title: String) is a protected Java constructor: the parameter is named title, its type is String, and there is no return type. + is public, - private, # protected and ~ package visibility. Java protected also grants same-package access and has cross-package receiver restrictions; the symbol is not a complete Java access rule. Fields describe stored state; operations describe offered behavior, not their full algorithms or exception paths.' },
    { title: 'Separate standard notation from our annotations', text: 'UML attributes use name: Type and operations use name(parameter: Type): ReturnType. Interfaces may be marked «interface». Standard notation can underline static members and italicize abstract classifiers/operations. UML also permits a textual {abstract} classifier annotation. Our accessible viewer spells out kind and uses modifier braces and Java generic types; these are explanatory Java annotations, not a claim of a complete UML interchange format. Receipt is a static nested class: static here describes nesting, not static receipt fields or shared receipt instances. An empty Book fields compartment means no fields declared in this view; Book still has inherited Resource state. The implicit Shelf constructor and JDK plumbing are omitted deliberately.' },
    { title: 'Follow triangles and the dashed use arrow', text: 'Select Generalization: Book / Resource. A solid line with a hollow triangle points to Resource, the general type named after extends. Select Realization: Book / Labelled. A dashed line with a hollow triangle points to the implemented interface. Book supplies label() for both the abstract superclass operation and the interface contract. Neither arrow means that constructing one Book also creates a separate Resource collaborator. Select Dependency: Shelf / Labelled. The dashed open arrow points to the supplier used by preview. A use dependency need not retain a field, and a retained association also entails reliance; the selected diagram does not draw every such dependency.' },
    { title: 'Read both ends of a relationship', text: 'A conventional Loan–Book association puts 1 near Book and 0..* near Loan. For one Loan, count linked Books: exactly one. For one Book, count linked Loans: zero or more. The code rejects null in the Loan constructor, never reassigns book and permits multiple Loans for one Book. It does not enforce exclusive checkout. 0..1 means optional and at most one; 1..* would require at least one. A Java List alone proves neither a nonempty collection nor non-null or unique entries. Shelf starts empty, checks null and suppresses duplicate Book identity. The same Book can appear in different shelves. A snapshot with one member is not evidence for a mandatory lower bound of one.' },
    { title: 'Keep multiplicity separate from navigation', text: 'Navigation asks which direction the implementation can follow a link. Loan can return its book; Book stores no reverse list of loans. Nevertheless the reverse multiplicity is 0..*: other code can create many Loans that refer to that Book. In conventional drawings a navigable association end can use an open arrowhead; omitted arrowheads do not necessarily assert two-way traversal. This viewer leaves association and diamond connectors without arrowheads and states both multiplicities and navigation in text. Read those statements when inspecting a selected pair. List<Book> in Shelf and the Shelf–Book edge describe the same stored membership, rather than two independent links.' },
    { title: 'Justify diamonds with domain rules', text: 'Association is the neutral retained-link choice for Loan–Book. For Shelf–Book we choose shared aggregation, a hollow diamond at Shelf, to emphasize shareable grouping: clear removes membership only. Its precise ownership semantics need a stated domain convention; a plain association would also be reasonable here. Composition uses a filled diamond at Loan for Loan–Receipt. The private creation path fixes one owner, repeated issuance returns the same receipt, and close retires it and prevents new issuance. A receipt cannot be attached to another loan through this API. Static nesting and final fields alone would prove none of those policies. UML composite deletion also deletes its current object parts; a permitted earlier removal can avoid that cascade. Here close defines logical domain retirement while the Java objects remain reachable. Our no-transfer policy is a choice stronger than composite ownership at at most one whole at a time.' },
    { title: 'Walk from source to model and back', text: 'Begin with Loan(Book): the non-null guard and final field justify exactly one Book per Loan. Check issueReceipt: initial null permits zero receipts; the one field and create-once branch bound it at one. Check close and Receipt.read: closure clears receipt text and rejects later reads, while the saved Java reference still exists. Follow Book extends Resource implements Labelled to the two triangle relationships. Follow Shelf.preview to the parameter-use dependency and Shelf.add/clear to shareable membership. Then reverse the check: for each displayed member, find its declaration; for each diamond or bound, find an enforcing path or state the domain assumption. If you cannot support a claim, revise it instead of trusting the picture.' },
    { title: 'Know which questions need another view', text: 'A class diagram helps review responsibilities and structural coupling. It does not tell you whether issueReceipt happens before close in a particular run, model alternate failures as a sequence, or prove thread safety. This example is single-threaded, has no central lending registry and allows multiple domain links without a concurrency protocol. Domain retirement is a behavior of reachable objects, not JVM destruction or a garbage-collection deadline. No persistence schema or secure erasure follows from a diamond. A broader library design could reuse this domain for use-case, sequence, activity and state-machine views, but those lessons and models remain separate work.' },
  ],
  visual: {
    title: 'Recorded instances: membership, required links and an optional part',
    summary: 'These counts, identity checks and lifecycle outcomes are verified from the canonical Java. The class model below states possible structure across all these steps.',
    snapshots,
  },
  code: [
    { filename: 'classdiagram/Resource.java', source: resourceSource },
    { filename: 'classdiagram/Labelled.java', source: labelledSource },
    { filename: 'classdiagram/Book.java', source: bookSource },
    { filename: 'classdiagram/Shelf.java', source: shelfSource },
    { filename: 'classdiagram/Loan.java', source: loanSource },
    { filename: 'classdiagram/ClassDiagramDemo.java', source: demoSource },
  ],
  run: 'javac --release 17 -d out classdiagram/Resource.java classdiagram/Labelled.java classdiagram/Book.java classdiagram/Shelf.java classdiagram/Loan.java classdiagram/ClassDiagramDemo.java\njava -cp out com.lld.learning.examples.classdiagram.ClassDiagramDemo',
  output,
  quiz: {
    prompt: 'Predict the last steps: after first.clear() and loan.close(), what can saved.read() and book.label() do, and what is the Loan–Receipt multiplicity?',
    options: [
      { id: 'retire', text: 'read rejects; the book label still works; each loan has 0..1 receipt.', correct: true, feedback: 'Correct. clear removes only shelf membership. close retires the owned receipt and read rejects, while Book remains independent. receipt starts null and creation is bounded at one; keeping a reference after close does not turn 0..1 into a mandatory 1.' },
      { id: 'destroy', text: 'Both objects are destroyed by the filled diamond, so neither method can run.', feedback: 'A diamond does not execute Java or destroy reachable objects. The saved receipt can still answer isActive and isFor; read rejects because its implementation checks retirement. The loan does not own the Book lifecycle.' },
      { id: 'many', text: 'Both reads work, and every issueReceipt call adds another receipt (0..*).', feedback: 'issueReceipt constructs only when receipt is null and otherwise returns the same part. close marks that part inactive; read then throws. There is no receipt collection or 0..* creation path.' },
      { id: 'required', text: 'read rejects and the book works, but a public Receipt return type proves exactly 1 receipt at all times.', feedback: 'A return type alone does not establish an association lower bound. The new Loan has a null receipt and receipt() can return null. Only issueReceipt guarantees a receipt on successful return; the stored relationship is 0..1.' },
    ],
  },
  exercise: 'Independently model a club workshop: each Booking must refer to exactly one existing Participant, each Participant may have many Bookings, and a Booking may create at most one Badge that becomes unreadable when the Booking is cancelled. Participants survive cancellation and may be grouped in many Rosters. First draw a design class view with visibility, typed fields/operations, relationship kinds, counts at both ends and navigation. State whether Roster membership needs a diamond. Then write a small Java 17 implementation and a driver: reject a null participant, share one participant across two bookings/rosters, create a badge twice, cancel one booking, and try its saved badge. Show the predicted results before running. Justify the workshop model from its own requirements; nesting alone does not enforce ownership. Optionally add a temporary Labelled-style preview and explain its dependency.',
  rubric: [
    'Scope and responsibilities: identify Participant, Booking, Badge and Roster, distinguish types from driver instances, and state that this is a selected design view.',
    'Notation: label public/private/protected or package members accurately; write parameter and result types; distinguish constructor, abstract operation and static annotations where used.',
    'Counts and navigation: Booking → 1 Participant, Participant ← 0..* Bookings; Booking → 0..1 Badge with 1 fixed Booking owner per created Badge; Roster and Participant may each link to 0..* of the other. Explain navigation separately and support every bound with code or a stated rule.',
    'Ownership: keep Participant as an independent association. Put a filled diamond at Booking only if construction, no sharing/transfer and cancellation enforce the chosen Badge lifecycle. Accept ordinary Roster association or explicitly explained shared aggregation.',
    'Behavior evidence: reject null before accepting a Booking, return the same Badge on repeated creation, reject new creation after cancellation, and reject reading a saved cancelled Badge. Verify the other booking and shared participant still work.',
    'Limits: explain that saved references can survive cancellation, Java final/nesting are insufficient ownership evidence, and this exercise alone proves neither exclusive attendance nor thread safety. Compare output with your prediction and revise a wrong model claim.',
  ],
  pitfalls: [
    'A class box is a type declaration view, not one allocated object. Generalization does not add a second superclass object, and inherited state can exist even when omitted from the subclass compartment.',
    'Diamond placement matters: the diamond is at the whole, while a generalization/realization triangle is at the supplier type. Diagram selection order is not runtime call order.',
    'A Java reference or collection is not sufficient evidence for composition, multiplicity or two-way navigation. Always read initialization, validation and mutation paths.',
    'Loan.close retires the receipt but retains it; the 0..1 count includes that retired part. It neither deletes the book nor schedules JVM destruction. This is one explicit domain lifecycle convention.',
    'The diagram omits JDK and demo dependencies, implicit constructors and inherited declarations. Its generic syntax and modifier braces are teaching annotations. It is not a complete UML editor or automatic source parser.',
  ],
  module: {
    title: 'Reconcile a class view with Parking Lot source',
    path: '/parking-lot',
    text: 'Use Parking Lot’s Class Diagram as a review prompt, then check the linked Java rather than treating a drawing as proof. HourlyPricingStrategy implements PricingStrategy and declares calculatePrice(Ticket): double: draw its realization and the method’s dependency on Ticket. Ticket stores spotId as a String, not a ParkingSpot object, so an identifier-based domain association needs an explicit lookup convention; do not invent direct Java navigation or composite ownership. Lombok annotations generate accessors and constructors on Ticket and ParkingSpot: an implementation view should state whether it includes those generated operations. Neither this subset of declarations nor a dashboard interaction proves every bound or relationship in the module’s broader diagram.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/model/Ticket.java',
      'backend/src/main/java/com/lld/parkinglot/model/ParkingSpot.java',
    ],
  },
  summaryPoints: [
    'Name the viewpoint, scope and omissions before interpreting a class diagram.',
    'Read the box and connector precisely; distinguish declaration, relationship, multiplicity, navigation and lifecycle claims.',
    'Prove counts and ownership with construction and mutation paths; an instance snapshot or Java field is insufficient.',
    'Use source and behavior checks together. Move ordered interactions and state transitions into suitable additional views.',
  ],
  references: [
    { title: 'OMG UML 2.5.1 specification — clauses 7 (dependencies/visibility), 9 (classifiers), 11 (structured classifiers/associations)', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'JLS 17, Chapter 8 — classes, fields, methods and constructors', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html' },
    { title: 'JLS 17, §6.6 — access control', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html#jls-6.6' },
  ],
};
