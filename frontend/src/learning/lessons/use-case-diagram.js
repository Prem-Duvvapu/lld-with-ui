import classModel from '../class-models/use-case-diagram';
import useCaseModel from '../diagrams/use-case-diagram';
import memberSource from '../examples/usecase/Member.java?raw';
import loanSource from '../examples/usecase/Loan.java?raw';
import portalSource from '../examples/usecase/LibraryPortal.java?raw';
import demoSource from '../examples/usecase/UseCaseDemo.java?raw';
import output from '../examples/use-case-diagram-output.txt?raw';
import snapshots from '../examples/use-case-diagram-snapshots.json';

export default {
  id: 'use-case-diagram',
  classModel,
  diagram: useCaseModel,
  summary: 'Decide whose goals a system serves before choosing its classes. Model external roles, a clear subject boundary and meaningful outcomes; read participation, include, extend and justified generalization without turning the picture into a program flow.',
  prerequisites: 'How to Learn LLD: scope, requirements, responsibilities and observable outcomes. The notation starts from goals rather than class inheritance. Basic Java method and collection reading helps with the companion example; review Classes and Objects if needed. Class Diagram is useful background but is not a required prerequisite.',
  objectives: [
    'Name the subject and boundary, identify external roles and separate stakeholder goals from internal implementation steps.',
    'Read plain participation lines and direct include, extend and generalization toward the correct targets.',
    'Specify an independently meaningful base, extension condition and extension point; justify specialization with a domain policy.',
    'Write a textual scenario and check selected observables against Java while explaining what a use-case diagram cannot prove.',
  ],
  problem: 'A library stakeholder asks for borrowing, renewal and staff returns. A developer draws Member, Loan, HashMap and validate() as four actors, connects them in execution order, and makes borrowing extend receipt printing. The picture hides who benefits and implies a receipt is essential. How can you recover the actual requirements before arguing about implementation?',
  explanation: [
    { title: 'Start with the subject and external roles', text: 'Our subject is the Library lending portal software. The rectangle names that subject; ellipses inside describe behavior it offers. Visual containment states applicability and scope, not UML ownership of those use cases. Member and Librarian are roles outside the software that exchange requests and results with it. Many people can play Member, and one librarian can also act as a borrower. An internal Member Java instance is a data representation; it is not the external person. Hardware or another system can also play an actor role if it actually interacts across the chosen boundary. A repository, method, database table or UI button is not automatically an actor.' },
    { title: 'Find goals before factoring behavior', text: 'Borrow book yields a confirmed loan, Renew loan yields a later due day, and Record return makes a copy available again. These are useful outcomes, not steps such as click Borrow, allocate HashMap entry or call a constructor. Name the goal from the stakeholder’s perspective and record its success and failure outcomes. Check eligibility is deliberately factored required behavior reused by two goals; not every ellipse must be an independently initiated customer goal. Issue receipt is additional behavior. A programmer’s reusable helper alone is insufficient reason to introduce either relationship.' },
    { title: 'Read participation without inventing a sequence', text: 'A plain solid line connects Member to Borrow book and Renew loan, and Librarian to Record return. These lines show participation, not a directed request, a return message, an execution step or an implemented permission check. No association line joins two use cases for this same subject. Relative position and bent connector routes have no timing meaning. Borrow book need not precede Renew loan merely because it is higher on the page; a textual precondition says renewal needs an existing active loan. Use a sequence or activity view when ordered interactions or branching are the question.' },
    { title: 'Include required incorporated behavior', text: 'Borrow book and Renew loan each have a dashed arrow labeled «include» pointing to Check eligibility. The including case depends on the included behavior. Here every attempt invokes the active-membership check; a rejection ends the attempt before changing a loan. A successful base cannot skip that requirement. This is required incorporation at the specified location, not a general rule that every include must be the first action or that all later actions run after a failure. Copy availability, borrower ownership and renewal limits remain additional base rules. The arrow neither points to the caller nor establishes flow between the two including cases.' },
    { title: 'Extend an independently meaningful base', text: 'Issue receipt has a dashed «extend» arrow toward Borrow book. Borrow book owns the extension point loan confirmed: the loan has been stored and its base goal is already useful. When receiptRequested is true at that point, receipt text is added to the result; otherwise borrowing succeeds with a null receipt. The condition belongs to this extension and the point belongs to the base. Extending behavior is inserted into the same behavior execution, not necessarily a later separate user transaction. UML also permits an unconditional extension when no condition is supplied; this example intentionally makes the condition explicit. Error alternatives do not automatically require separate extend ellipses, and optional implementation branches alone do not justify one.' },
    { title: 'Justify a hollow triangle with a policy', text: 'This library requires every librarian to be a registered member who retains all member borrowing and renewal capabilities under the same membership restrictions, and adds staff return duties. Thus Librarian specializes Member: the solid line’s hollow triangle points to the general actor Member. An inactive staff membership blocks borrowing just as it blocks any member, while staff can still record returns. This is a stated role policy, not a claim that every real library works this way. Without that policy, model independent roles and explicit participation instead. Actor generalization does not require a Java Librarian extends Member class; our code uses role data. Use-case generalization similarly points to the general use case and requires a defensible refinement preserving its goal contract, not a next step or a helper call. We make no use-case generalization claim here.' },
    { title: 'Write the behavior that the ellipses omit', text: 'Borrow book scenario: the Member requests a known available title, optionally requesting a receipt. Preconditions: a caller-supplied member identity and a catalog copy exist; membership acceptance is checked in the behavior, not assumed. Incorporate Check eligibility; reject inactive membership. Verify the title and availability; reject unknown or unavailable copies without changing existing loans. Confirm a loan due on day 14. At loan confirmed insert Issue receipt if requested, then return the confirmed loan with optional text. Success postcondition: one active loan for that title, with or without a receipt. Renew loan requires the caller’s own active loan and permits one seven-day renewal; Record return requires the Librarian role and an active loan. These rules come from text and code, not from ellipse placement.' },
    { title: 'Compare the goal view with the bounded Java', text: 'LibraryPortal.borrow and renew both call checkEligibility; the optional issueReceipt call records a visible trace after loan confirmed. Tests compile the displayed Java 17 files and verify output, recorded scalar states and rejection boundaries. Those calls illustrate our stated requirements; UML use cases are specifications of behavior, not automatically one Java method each. Member.librarian is caller-supplied role data, not authentication. Staff borrowing passes the same active check; recordReturn separately checks staff status. Loan uses a title as one physical copy and day offsets 14/21 rather than a clock. The companion class model describes selected implementation types, while the use-case diagram describes external roles and offered behavior. Neither view is inferred from the other.' },
    { title: 'Keep the recurring library example honest', text: 'This continues the library domain from Class Diagram with a separate, explicitly bounded lending implementation. That earlier structural example permits multiple Loan links to one shared Book and focuses on owned receipt retirement. This portal adds a one-active-copy rule, membership eligibility and an optional receipt String; it does not retroactively add those rules to the earlier Java. A full library implementation would reconcile both models and one set of requirements. Here we use related vocabulary to compare viewpoints and state the exact policy differences rather than claiming the codebases implement the same contract.' },
    { title: 'Change the boundary deliberately and state limits', text: 'If the subject becomes the entire staffed library, employees performing its internal work may move inside the subject; roles and interactions must be reconsidered. A real email provider would be external to this software if it exchanged delivery requests, but this example only returns a String, so no provider actor is invented. The diagram omits fines, inventory acquisition, authentication and physical handling. It specifies no protocol, call ordering, concurrency, persistence, response time or security guarantee. The Java is sequential, caller-trusting and in memory; its traces show only selected successful method outcomes, not a general UML interpreter or frontend Java execution.' },
  ],
  visual: {
    title: 'Recorded goal outcomes and incorporated behavior',
    summary: 'Canonical Java verifies these scalar observations and trace strings. They are evidence for this example’s scenarios, not execution semantics for the use-case connectors.',
    snapshots,
  },
  code: [
    { filename: 'usecase/Member.java', source: memberSource },
    { filename: 'usecase/Loan.java', source: loanSource },
    { filename: 'usecase/LibraryPortal.java', source: portalSource },
    { filename: 'usecase/UseCaseDemo.java', source: demoSource },
  ],
  run: 'javac --release 17 -d out usecase/Member.java usecase/Loan.java usecase/LibraryPortal.java usecase/UseCaseDemo.java\njava -cp out com.lld.learning.examples.usecase.UseCaseDemo',
  output,
  quiz: {
    prompt: 'Predict: an active member borrows UML without a receipt, renews it, then tries to record its return. Which behavior and outcome follow?',
    options: [
      { id: 'base-and-guard', text: 'Both borrowing and renewal check eligibility; no receipt is issued; member return is rejected and the loan stays active at day 21.', correct: true, feedback: 'Correct. Required checking is incorporated by both goals. The receipt condition is false, so the base completes without it. Record return requires a librarian; rejection leaves the renewed loan active at day 21.' },
      { id: 'receipt-required', text: 'Borrowing fails because extend means the receipt is required before the base can complete.', feedback: 'The extend arrow goes from Issue receipt to an independently meaningful Borrow book. Without a request, loan confirmation is still a complete result. Include, not this optional extension, represents required incorporated checking.' },
      { id: 'check-once', text: 'Only borrowing checks eligibility; renewal follows the arrow back to borrowing and reuses the earlier acceptance.', feedback: 'Each base includes Check eligibility independently. Both Java methods invoke it for their own attempt. A dashed include arrow points to required behavior; it neither reverses to a caller nor caches an earlier decision.' },
      { id: 'role-everyone', text: 'Member return succeeds because a generalization triangle gives every Member all Librarian duties.', feedback: 'Specialized Librarian retains Member participation and adds Record return. That does not give every general Member the specialist duty. The ordinary member’s request is rejected by the explicit role check, not by a triangle executing code.' },
    ],
  },
  exercise: 'Independently model a community workshop registration service. A Participant can Register and Change session; both must incorporate Check eligibility. Registration is complete with a confirmed place. If an accessible seat was requested, Arrange accessible seat augments registration at the named place confirmed extension point. A Coordinator can Record attendance. First state whether coordinators retain every participant capability under the same rules; justify actor generalization only if your policy says so. Draw the software boundary, external roles, goals and correctly directed connectors. Write a registration scenario with preconditions, success and rejection postconditions, the extension condition and point, and explain one thing the diagram cannot tell you. Predict and then verify a Java 17 example or explicit acceptance checks for no extension, requested extension, ineligible registration/change and unauthorized attendance. Propose how the actors change if your subject expands to the entire workshop organization; do not turn constructors or repositories into actors.',
  rubric: [
    'Scope: name the software subject; keep interacting people outside and goals inside; explain that boundary containment expresses applicability, not use-case ownership. Distinguish proposed policies from source-backed behavior.',
    'Goals and participation: use useful outcomes rather than click/validate/save steps. Draw plain solid actor–case lines and do not infer call order, messages or authorization enforcement from them.',
    'Include: Register and Change session point with dashed open arrows toward Check eligibility; both successful goals incorporate it. An ineligible attempt rejects without reserving or changing a place.',
    'Extend: Arrange accessible seat points toward Register; record condition accessible seat requested and base-owned extension point place confirmed. Explain why registration without the extension still achieves the stated base goal. Reconsider this goal definition if accessibility is mandatory for the participant’s usable outcome.',
    'Generalization: accept independent roles, or Coordinator → Participant with a hollow triangle at Participant only under a policy preserving all participant capabilities and restrictions. Do not infer Java inheritance, organizational rank or reverse permission inheritance.',
    'Evidence and limits: verify selected outcomes and rejection non-mutation against your scenario; identify the implementation/authentication assumptions and at least one omitted timing, security or concurrency question. Reassess external actors when the boundary expands.',
  ],
  pitfalls: [
    'A system boundary names the subject. Its contents are not a class ownership claim, and internal classes are not automatically actors.',
    'A primary goal is valuable behavior. A factored included case or extension can be a behavior fragment; do not force every helper or optional branch into a new ellipse.',
    'The include arrow targets the included behavior; the extend arrow targets the independent base. A condition without a base-owned extension point leaves this model’s extension underspecified.',
    'Actor specialization preserves the general role’s capabilities; it does not grant specialized duties to everyone in the general role. The example’s role flag neither authenticates users nor proves production authorization.',
    'Plain participation lines, layout and arrow direction do not give a flow sequence. The trace order comes from the chosen Java and textual scenario, not from a use-case arrow.',
    'Borrowing returns a live Loan reference and immutable trace snapshot; a receipt is only text. Package-visible Loan mutators are a teaching boundary, not tamper resistance. No thread safety, physical printing or email service is implemented.',
  ],
  module: {
    title: 'Review Parking Lot’s goals and proposed boundary',
    path: '/parking-lot',
    text: 'Inspect ParkingLotService and its controller: entry allocates a spot and returns a ticket; scanTicket previews a price on a throwaway ticket; payAndExit calls completeExit and releases the spot. These support proposed goals Park vehicle, Preview exit charge and Pay and exit for a parking software subject. Driver and Attendant are candidate external roles to confirm with a stakeholder; the code exposes endpoints and gate types but does not implement these user roles or role-based authorization. An ENTRY/EXIT Gate model is not evidence for a separately communicating hardware actor. completeExit records a payment method/status rather than proving an external payment-provider interaction. A scan can happen before payment in the UI, but payAndExit does not require a prior scan, so do not draw include just because two screens appear in that order. No dedicated module use-case view or full actor contract is claimed. Compare these observed behaviors with your proposed scope and label every additional policy.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/controller/ParkingLotController.java',
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/main/java/com/lld/parkinglot/model/Gate.java',
    ],
  },
  summaryPoints: [
    'Name the subject, identify external roles and useful outcomes, and write the policy before drawing relationships.',
    'Participation is plain; include points to incorporated behavior; extend points to an independent base with a specified condition and extension point.',
    'Point a hollow generalization triangle to the general actor or case only when a domain policy supports specialization.',
    'Use textual scenarios and implementation evidence for observables; use other views for ordered interactions, structure and lifecycle.',
  ],
  references: [
    { title: 'OMG UML 2.5.1 — §18.1 use cases, actors, subjects, include/extend semantics and notation; §18.2 classifier constraints', url: 'https://www.omg.org/spec/UML/2.5.1/PDF' },
    { title: 'OMG UML 2.5.1 — §9.2 classifier generalization and §9.9.7 Generalization', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'JLS 17 — §8.10 record classes (the Borrowing result and copied trace)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.10' },
  ],
};
