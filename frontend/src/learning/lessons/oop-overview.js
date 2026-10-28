import classModel from '../class-models/oop-overview';
import { createElement, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import topicSource from '../examples/oopoverview/Topic.java?raw';
import contractSource from '../examples/oopoverview/PromptStyle.java?raw';
import plainSource from '../examples/oopoverview/PlainPrompt.java?raw';
import hintedSource from '../examples/oopoverview/HintedPrompt.java?raw';
import planSource from '../examples/oopoverview/StudyPlan.java?raw';
import demoSource from '../examples/oopoverview/OopOverviewDemo.java?raw';
import output from '../examples/oop-overview-output.txt?raw';
import snapshots from '../examples/oop-overview-snapshots.json';

// Carry the catalog origin through inline reviews just like prerequisite links.
function ReviewLink({ id, title }) {
  const { state } = useLocation();
  return createElement(Link, { to: `/learn/${id}`, state }, `Revisit ${title}`);
}

// React nodes let the existing paragraph renderer offer real curriculum links.
// These are reviews, not a second publication/prerequisite manifest.
function review(id, title, text, proposed = false) {
  return {
    title: `${title}${proposed ? ' (proposed addition)' : ''}`,
    text: createElement(Fragment, null, text, ' ',
      createElement(ReviewLink, { id, title })),
  };
}

export default {
  id: 'oop-overview',
  classModel,
  summary: 'A capstone after the fifteen concept lessons: choose responsibilities for a study plan, trace its Java objects, and defend the relationships and limits. Use the linked reviews when a decision needs more practice.',
  prerequisites: 'All fifteen OOP fundamentals and relationship topics reviewed below. This is a synthesis assessment, not an introductory shortcut or proof of mastery. The Java files are self-contained and require JDK 17 only.',
  objectives: [
    'Defend a small object model by tracing identity, contracts, state, ownership and collaboration across all fifteen OOP concepts.',
    'Connect each design decision to its canonical concept lesson without treating every relationship as ownership.',
    'Predict shared mutation, interface dispatch, rejection and logical retirement through saved references.',
    'Test a changed requirement and explain which guarantees need more architecture than this sequential example provides.',
  ],
  problem: 'Focus and Weekend plans may select the same catalog topic. Renaming that topic should update future prompts in both plans. Each plan has a positive capacity and may select a particular Topic object only once. Archiving Focus must retire its selections while leaving Weekend and the catalog usable. How can the model distinguish a shared topic from a plan-owned selection, and let callers choose plain or hinted prompts?',
  explanation: [
    { title: 'Decision 1: write observable requirements first', text: 'Two plans have independent membership; a second variable can alias one plan. Topic identity, not its displayed title, defines duplication within a plan. Distinct same-title topics are permitted. Entries start active, removal retires one entry, and archive retires all current entries and empties membership. Archive is idempotent; add and remove on an archived plan fail. Retired entries expose topic metadata and status, but cannot make prompts. Plan names and topic titles are stripped and nonblank; plan capacity is positive. These rules describe this domain, not universal OOP requirements.' },
    { title: 'Decision 2: put each rule at a useful boundary', text: 'Topic validates its mutable catalog title. StudyPlan validates construction, capacity, duplicate identity and membership changes. Its Entry represents one selection with a fixed owner and a retirement guard. PromptStyle defines the small operation needed to render a prompt. Exposing the internal ArrayList would let callers bypass capacity and retirement; entries() instead returns List.copyOf. Extending ArrayList would expose unrelated inherited mutators that also need policing. Delegating to a private list keeps the public API small. That ordinary implementation technique alone would not establish UML composition.' },
    { title: 'Decision 3: separate the objects and their relationships', text: 'StudyPlan [1] ◆—entries— [0..*] Entry places the filled diamond at the plan, with the additional constraint entries.size() <= capacity. Each entry has exactly one fixed plan owner; a plan may have no entries. Entry [0..*] --topic--> [1] Topic is a navigable association: many entries can select one topic; the topic has no reverse directory. At a catalog-selection view, a plan can be interpreted as a shared aggregation of independently managed topics, derived through its entries. That interpretation needs the explicit rule that removing or archiving a plan never retires catalog topics. An ordinary association with written constraints can communicate it just as clearly; do not add a second composition diamond to Topic.' },
    { title: 'Decision 4: justify ownership with operations', text: 'Composition of entries is supported here by private Entry construction, a final owner, no public attachment or transfer operation, identity validation in remove and retirement in remove/archive. Observers may keep an entry without owning it. This model chooses fixed ownership and removal-as-retirement; UML more generally permits detachment before composite deletion when the model allows it. The archived flag on the plan and retired flag on entries implement logical domain termination. They do not destroy Java objects, control garbage collection, securely erase data or revoke already returned strings. Metadata remains readable by design.' },
    { title: 'Decision 5: vary behavior only where it is needed', text: 'Entry.prompt receives a PromptStyle per call and does not retain it. PlainPrompt validates a title and returns a plain prompt. HintedPrompt extends it, overrides the same operation and calls super.format to reuse validation. Both accept the same valid inputs. Inheritance is a small reuse choice here, not a requirement to vary a prompt: two independent implementations could avoid parent coupling, and one fixed format could need no interface at all. A future hint that rejects previously valid titles would break our contract even if javac accepted its override. Entry trusts the documented return contract; a faulty implementation can return blank text, as the Java tests demonstrate.' },
    { title: 'Walk the successful and rejected requests', text: 'Construct topic, focus and weekend, then alias focus. add creates two different entries for the same topic; saving focus.entries() copies membership, not its entries or topic. A PromptStyle reference to HintedPrompt produces the hinted text. Re-adding the identical topic to Focus throws before changing its size or original entry. Rename the shared topic, then archive through alias: Focus becomes empty, its saved entry is retired, and prompting through that alias fails. Weekend still makes a hinted prompt using the renamed topic. earlier remains the old String value. Inspect all five recorded steps and predict the last one before checking the output.' },
    review('classes-and-objects', 'Classes and Objects', 'StudyPlan is a type; focus and weekend are distinct instances. alias == focus is true because assignment copies a reference value. Two different Entry objects can point at the same Topic. Compare references, not names, when asking about identity.'),
    review('constructors', 'Constructors and Initialization', 'StudyPlan(String) delegates with this(name, DEFAULT_CAPACITY). Both creation paths use the same name/capacity checks. Entry construction establishes owner and topic before the reference is returned; later calls change membership, not constructor history.', true),
    review('access-modifiers', 'Access Modifiers', 'The public API exposes add, remove, archive and reads; membership, owner and retirement writes stay private. The enclosing StudyPlan can access its nested Entry private members. Nested visibility is not a security boundary against privileged reflection, nor does the word private automatically preserve a domain invariant.', true),
    review('enums', 'Enums', 'State restricts this plan field to OPEN or ARCHIVED. The requireOpen and archive methods enforce the one-way lifecycle; declaring an enum alone would not prevent an arbitrary transition through a setter. The example has no string-to-state input parser.'),
    review('static-and-instance', 'Static vs Instance Members', 'DEFAULT_CAPACITY is a shared static final primitive constant. capacity, entries and state belong to each plan. A static nested Entry type still has separate owner/topic/retired instance fields and receives its owner explicitly. No static collection stores all selections. Neither a constant nor final makes the model thread-safe.', true),
    review('interfaces', 'Interfaces', 'PromptStyle exposes only format(String), so Entry does not need the concrete hint implementation. The signature is compiler-checked; nonblank output and compatible input validation are behavioral promises that need tests. An interface is not itself a policy selector or a guarantee of correctness.'),
    review('encapsulation', 'Encapsulation', 'Returning the actual mutable membership list would expose the invariant. List.copyOf prevents membership edits through the returned list and detaches that membership from later changes. Its actual Entry elements and their Topic references are still shared, so retirement and renaming remain observable. Unmodifiable does not mean deeply immutable.'),
    review('abstraction', 'Abstraction', 'Callers ask an entry for a prompt and ask a plan to archive without managing the backing list or retirement loop. PromptStyle states a useful behavior boundary. Abstraction chooses what callers need to know; encapsulation protects the implementation and invariants behind that boundary.'),
    review('inheritance', 'Inheritance', 'HintedPrompt is a PlainPrompt subtype and reuses its validated formatting through super. StudyPlan is not a Topic or an ArrayList subtype. Prefer a collaborator when the relation is uses-a or holds-a, and test the behavioral promise before calling an extends relationship a sound substitution.'),
    review('polymorphism', 'Polymorphism', 'The variable style is declared PromptStyle but refers to a HintedPrompt. Its format(String) call reaches the runtime override. The declared contract limits the available API; the runtime receiver supplies the instance implementation. No cast or instanceof branch is needed.'),
    review('overloading-and-overriding', 'Method Overloading vs Overriding', 'The one- and two-argument StudyPlan constructors are overloads selected at compile time; constructors are not inherited methods and do not override. HintedPrompt.format(String) overrides an instance method. An accidental format(Object) would be a different overload and would not replace the contract operation; @Override catches that mistake. The dedicated review covers method overload selection in more detail.', true),
    review('association', 'Association', 'Each entry retains one actual Topic reference; several entries can share it without a reverse Topic-to-Entry API. Navigation, multiplicity and identity are different questions. A retained reference establishes neither exclusive ownership nor automatic deletion.'),
    review('aggregation', 'Aggregation', 'The plan-as-selection view assembles topics that the catalog manages independently. Two plans can include the same topic, and ending one plan does not retire it. UML shared aggregation has domain-specific semantics; use a hollow diamond only if the team agrees what it communicates beyond an ordinary association. The separate owned Entry is not the catalog Topic.'),
    review('composition', 'Composition', 'The plan-owned Entry has a fixed owner and a guarded lifecycle, while outside variables may observe it. Private construction and final fields are mechanisms, not sufficient proof on their own. Audit attachment, removal and archive paths together. General object composition for implementation reuse is broader than UML composite ownership.'),
    review('dependency', 'Dependency', 'Entry.prompt depends on the PromptStyle API and uses the supplied object temporarily. The retained Topic link is both an association and a dependency. Supplying a policy as a parameter does not prove an application follows the Dependency Inversion Principle; this small package has no demonstrated high-level/detail architecture.'),
    { title: 'Choose the tradeoff and state the remaining gaps', text: 'Mutable shared topics make renaming visible everywhere; immutable topic versions would preserve historical wording at extra modeling cost. Identity-based duplicate checks are simple locally; a persisted catalog would need stable IDs and an explicit equality policy. Fixed entry ownership avoids a transfer protocol; adding transfer needs coordinated membership and lifecycle rules. The private nested type keeps this example compact but couples its implementation to StudyPlan. All calls here are sequential and in memory: there is no concurrent mutation protocol, persistence, catalog retirement, authorization or production error contract. A complete concurrent archive/add workflow needs coordination around the entire check-and-change, not just a concurrent collection. These are future requirements, not promises supplied by OOP vocabulary.' },
  ],
  visual: {
    title: 'Inspect plans, shared topics and retired entries',
    summary: 'Recorded object identities · fixed entry ownership · shared catalog lifecycle · per-call policy use',
    snapshots,
  },
  code: [
    { filename: 'oopoverview/Topic.java', source: topicSource },
    { filename: 'oopoverview/PromptStyle.java', source: contractSource },
    { filename: 'oopoverview/PlainPrompt.java', source: plainSource },
    { filename: 'oopoverview/HintedPrompt.java', source: hintedSource },
    { filename: 'oopoverview/StudyPlan.java', source: planSource },
    { filename: 'oopoverview/OopOverviewDemo.java', source: demoSource },
  ],
  output,
  run: 'javac --release 17 -d out oopoverview/Topic.java oopoverview/PromptStyle.java oopoverview/PlainPrompt.java oopoverview/HintedPrompt.java oopoverview/StudyPlan.java oopoverview/OopOverviewDemo.java\njava -cp out com.lld.learning.examples.oopoverview.OopOverviewDemo',
  quiz: {
    prompt: 'After topic.rename("References") and alias.archive(), what happens to saved.get(0).prompt(style), second.prompt(style), and earlier?',
    options: [
      { id: 'independent-lifecycles', text: 'The saved entry throws; Weekend returns the hinted References prompt; earlier still names Objects', correct: true, feedback: 'Correct. alias archives Focus and retires its actual entry, including the one in saved. Weekend owns a separate entry using the shared renamed topic. Runtime dispatch still uses HintedPrompt, and the previously returned String does not change.' },
      { id: 'deep-snapshot', text: 'The saved entry returns the old Objects prompt because List.copyOf deeply froze the selection', feedback: 'List.copyOf detaches membership only. saved contains the actual entry that Focus explicitly retired, so its prompt guard now throws. It did not copy the entry or Topic.' },
      { id: 'shared-owner', text: 'Both prompts throw because sharing a Topic makes both entries owned by Focus', feedback: 'The two entries have different fixed owners. They share only the catalog Topic. Focus.archive retires its own entries and never retires Weekend’s entries or the topic.' },
      { id: 'retroactive-text', text: 'Weekend gives a plain prompt and earlier changes to References when the catalog title changes', feedback: 'style still identifies HintedPrompt, so interface dispatch keeps the hint. The catalog object mutates, but it cannot rewrite the String returned by an earlier call.' },
    ],
  },
  exercise: 'Add per-plan review progress: a new Entry starts unreviewed, and StudyPlan.markReviewed(entry) marks an active entry of that exact plan reviewed. Repeating it succeeds without further change; a retired, null or foreign entry must be rejected without changing any progress or membership. Keep Topic free of review progress so two plans can share one Topic while reviewing independently. Before coding, list the invariants and draw the plan-entry-topic relationships with multiplicities, navigation and lifecycle constraints. Trace two plans with equal names selecting the same topic, review one entry, rename the topic, remove that entry, then archive the other plan. Include a saved membership list and an earlier prompt String in your explanation. Write checks for valid and rejected operations, then defend one alternative design, such as immutable topic versions or independently implemented prompt styles. Identify one added requirement that would need architecture beyond these single-threaded objects.',
  rubric: [
    'Place review state on each Entry, explain why shared Topic.reviewed or a static flag would couple independent plans, and keep mutation behind StudyPlan.',
    'Validate active plan, nonnull entry, owner identity and entry lifecycle before mutation; reuse the ownership rules without relying on equal plan names.',
    'Check initial state, successful and repeated review, two distinct same-title topics, shared-topic independent progress, and every rejected operation with unchanged prior state.',
    'Trace live references versus shallow saved membership and previously returned text through rename, removal and archive; retired entries cannot make prompts.',
    'Justify composition of Entry separately from non-owning catalog selection, give multiplicities and navigation, and state the no-transfer/removal-as-retirement policy without claiming garbage-collection control.',
    'Explain an interface dispatch and an overloaded construction path, compare one simpler alternative, and identify limits such as stable identity, concurrent check-and-change or persistence. Marking this lesson reviewed records a self-check, not certification.',
  ],
  pitfalls: [
    'Fifteen names are a review map, not fifteen reasons to add more classes. State the requirement served by each abstraction and remove one that brings no useful boundary.',
    'Equal titles or plan names are not identity. This local model deliberately accepts distinct Topic objects with equal titles and compares owner references.',
    'A field, private visibility, a final reference, nested construction or an interface does not by itself prove UML composition, immutability, safe substitution or a SOLID architecture.',
    'List.copyOf preserves the actual entry references. A saved list can describe historical membership while those entries change lifecycle state.',
    'Entry.topic() deliberately exposes the mutable shared catalog object, even after retirement. Catalog authorization or frozen historical content would need a different API.',
    'Entry trusts PromptStyle output. The compiler checks signatures, not every behavioral contract; a wrong policy can return blank text or throw, and there is no rollback for its external side effects.',
    'Archiving is explicit domain retirement with readable metadata. It is not JVM destruction, secure erasure, persistence or an AutoCloseable resource protocol.',
    'The browser selects checked recordings. It does not execute Java, enforce these invariants in JavaScript or run learner submissions.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Audit a real policy boundary in Parking Lot',
    text: 'PricingStrategy exposes calculatePrice(Ticket); HourlyPricingStrategy and FlatRatePricingStrategy implement it. PricingStrategyFactory retains injected policy objects in an EnumMap keyed by PricingStrategyType and resolves a request name. ParkingLotRepository.completeExit receives the selected policy as a parameter and calls it with the stored Ticket under ticketLock. The focused capstone test follows factory selection into this real repository call with fixed two-hour CAR tickets: hourly produces ₹40 and flat ₹50. These are production rupee rules, not the study prompt behavior. This mapping supports interface dispatch, enum-backed selection, retained factory references and a per-operation dependency. It does not establish exclusive ticket ownership, a plan-style retirement cascade or all fifteen concepts in one module. Ticket has generated setters, and the factory still names concrete implementations; neither proves encapsulation of every invariant or full DIP. The repository lock is separate from dispatch, and this sequential mapping test is not a concurrency or rollback proof. Use the module tests for its broader workflows and race coverage.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyType.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/model/Ticket.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/test/java/com/lld/parkinglot/ParkingLotPricingStrategyTest.java',
      'backend/src/test/java/com/lld/parkinglot/ParkingLotConcurrencyTest.java',
      'backend/src/test/java/com/lld/learning/OopOverviewExampleTest.java',
    ],
  },
  summaryPoints: [
    'Explain the requirement first, then the responsible object, operation, relationship and test. A vocabulary label is not an invariant proof.',
    'Trace identity, independent membership, shared state and already returned values separately. Encapsulation is an API decision, not a synonym for private fields.',
    'Distinguish compile-time signature selection from runtime instance dispatch, and a compiler-accepted implementation from a contract-preserving one.',
    'Use ownership only when construction, membership and domain termination support it. Explain temporary collaboration separately from retained links.',
    'Without the code, can you defend where review progress belongs, predict a rejected operation, and name the extra boundary needed for concurrent changes? Revisit the specific concept link if that explanation is unclear.',
  ],
  references: [
    { title: 'JLS 17 §4.3.1: Objects and references', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3.1' },
    { title: 'JLS 17 §8: Fields, methods, constructors and nested classes', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html' },
    { title: 'JLS 17 §15.9.3: Choosing a constructor', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.9.3' },
    { title: 'JLS 17 §15.12: Method selection and runtime dispatch', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12' },
    { title: 'Java 17 List.copyOf: unmodifiable lists and mutable elements', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)' },
    { title: 'OMG UML 2.5.1: Properties (§9.5.3), Associations (§11.5), Dependencies (§7.7)', url: 'https://www.omg.org/spec/UML/2.5.1' },
  ],
};
