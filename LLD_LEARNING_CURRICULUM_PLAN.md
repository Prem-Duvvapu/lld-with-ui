# LLD Learning Curriculum Plan

Saved: 2026-10-17. Updated: 2026-10-28. Status: coverage audit and eighteen
lessons implemented: How to Learn LLD, all fifteen individual OOP/relationship
concepts, their connected overview/capstone and the dedicated Class Diagram lesson.
All eighteen lessons include source-curated class models. Phase 2 content,
assessment and local visual review are complete. Phase 3 has begun with one of
five UML lessons; the remaining 51 topic deliveries and final integration/release
gates remain open. This implementation status is not a claim of deployment before
the current lesson's release checks pass.

This plan covers the requested learning curriculum inside `lld-with-ui`. It is
separate from the existing 60-module implementation roadmap and the UI/UX work
tracked in `COMPLETION_HANDOFF.md`. Saving this document does not complete any
curriculum delivery milestone.

## Direction and current foundation

Build a connected journey: **Understand → Visualize → Read code → Experiment →
Practice → Explain**. Keep the existing modules and routes working. The shared
Learning Hub remains the entry point to the four independent applications.

Existing foundations include the module learning path, design explanations,
diagrams, Java implementations, and simulation controls. These are reusable
assets, not evidence that every requested concept lesson already exists. Audit
each proposed module example against its implementation before linking it.
In particular, a generic Factory label does not prove Factory Method or Abstract
Factory is implemented.

Proposed navigation:
- Learn LLD: `/learn` and `/learn/:lessonId` (implemented for the published lessons).
- Practice Systems: existing module library and `/learning-path`.
- Interview Preparation: `/interview-prep`.
- My Learning: resume, bookmarks, revision, and lesson progress within the learning experience.

Interview preparation remains proposed. My Learning currently means local notes,
bookmarks, resume, and review marks in the lesson/catalog, not a separate dashboard.
Only published lessons open as content; planned topics remain visibly unavailable.

## Complete topic coverage

### 1. How to Learn LLD

Explain LLD versus DSA and HLD, prerequisites, readiness checks, and how to move
from requirements to responsibilities, objects, and interactions. Offer beginner,
revision, and interview-oriented paths. Teach the problem before naming a pattern.
Explain how lessons connect to practice modules and how to assess understanding.

### 2. Fifteen must-know OOP concepts

The supplied fundamentals and relationships enumerate eleven concepts. The final
four below are proposed additions to make the requested fifteen explicit.

| Group | Lessons |
|---|---|
| Fundamentals | Classes and Objects; Enums; Interfaces; Encapsulation; Abstraction; Inheritance; Polymorphism |
| Class relationships | Association; Aggregation; Composition; Dependency |
| Proposed additions | Constructors and Initialization; Access Modifiers; Method Overloading vs Overriding; Static vs Instance Members |

Use one canonical lesson per concept; the fifteen-concept overview links to these
lessons rather than duplicating them. Include object inspection, interface
dispatch, exposed versus encapsulated state, inheritance versus composition,
ownership and multiplicity, and method-behavior prediction exercises.

Assessment: model a small domain and explain responsibilities and relationships.

### 3. Design principles

- DRY Principle, YAGNI Principle, KISS Principle.
- SOLID: Single Responsibility, Open/Closed, Liskov Substitution, Interface
  Segregation, and Dependency Inversion.
- SOLID Principles with Pictures and SOLID Principles with Code: connected views
  of the same examples, with before/after diagrams, Java refactorings, and tests.

Teach tradeoffs, misuse, and overengineering, not only definitions. Assessment:
justify the smallest useful refactoring and explain what should remain unchanged.

### 4. All 23 design patterns

The supplied list names 22 patterns. Add Interpreter as an explicit proposed
addition to cover the complete GoF catalog; the publisher lists it under
[Behavioral Patterns](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780321770462).
The inventory below contains five creational, seven structural, and eleven
behavioral patterns, with no duplicate names.

| Family | Required patterns |
|---|---|
| Creational (5) | Singleton; Factory Method; Abstract Factory; Builder; Prototype |
| Structural (7) | Adapter; Bridge; Composite; Decorator; Facade; Flyweight; Proxy |
| Behavioral (11) | Iterator; Interpreter; Observer; Strategy; Command; State; Template Method; Visitor; Mediator; Memento; Chain of Responsibility |

Every pattern needs a motivating problem, a plain solution first, responsibilities,
class diagram, tested Java example, execution explanation, use/avoid guidance,
tradeoffs, exercise, and a verified module link where a genuine example exists.
Do not retrofit patterns into modules just to fill a coverage checkbox.

Comparison lessons:
- Factory Method vs Abstract Factory vs simple factory.
- Strategy vs State; Template Method vs Strategy.
- Adapter vs Decorator vs Proxy; Bridge vs Adapter.
- Observer vs Mediator.
- Singleton vs dependency-managed lifecycle.

Assessment: select and defend a design without being given a pattern name;
sometimes the correct answer is not to introduce a pattern.

### 5. UML

| Lesson | Required focus |
|---|---|
| Class Diagram | Responsibilities, visibility, relationships, multiplicity |
| Use Case Diagram | Actors, system boundary, goals |
| Sequence Diagram | Request flow, alternate paths, failures |
| Activity Diagram | Decisions, parallel work, completion |
| State Machine Diagram | States, events, guards, legal transitions |

Use a recurring example across all five views. Introduce class-diagram basics
during OOP, and sequence/state basics before patterns that depend on them.
Assessment: create mutually consistent diagrams and explain their limitations.

### 6. Concurrency and multi-threading

Concurrency 101 is the section overview; Introduction to Concurrency is its first
lesson, avoiding duplicate introductions.

| Group | Required lessons |
|---|---|
| Foundations | Introduction to Concurrency; Concurrency vs Parallelism; Processes vs Threads; Thread Lifecycle and States; Race Conditions and Critical Sections |
| Synchronization primitives | Mutex (Mutual Exclusion); Semaphores; Condition Variables; Coarse-grained vs Fine-grained Locking; Reentrant Locks; Try-Lock and Timed Locking; Compare-and-Swap (CAS) |
| Challenges | Deadlock; Livelock |
| Patterns | Signaling Pattern; Thread Pool Pattern; Producer-Consumer Pattern; Reader-Writer Pattern |

Supporting additions: atomicity, visibility, happens-before, interruption,
starvation, and fairness. Distinguish Java thread states from simplified diagrams.

Clearly distinguish illustrated deterministic interleavings from actual Java
experiments. The backend owns real experimental state and events; browser
playback does not control JVM scheduling. Experiments must be bounded, isolated
from live module state, cancellable where appropriate, and tested without relying
on arbitrary sleeps. Reuse existing experiments only after auditing them.

Assessment: identify a broken invariant, reproduce it, choose synchronization,
and explain correctness and contention tradeoffs.

### 7. How to answer an LLD interview problem

1. Clarify requirements, actors, scope, and exclusions.
2. Establish use cases and invariants.
3. Identify responsibilities, entities, and value objects.
4. Define relationships, interfaces, and contracts.
5. Walk through one complete interaction.
6. Handle invalid operations, errors, and state transitions.
7. Address concurrency where relevant.
8. Introduce only justified patterns.
9. Explain tests, extensibility, and tradeoffs.
10. Summarize the design and its limitations.

Provide worked reasoning, partially guided exercises, independent mock problems,
configurable timed practice, and a self-assessment rubric with weak/strong answer
examples. Do not imply automated grading or mastery from a completion checkbox.

## Shared lesson experience

1. Understand: objectives, prerequisites, motivating problem.
2. Visualize: annotated diagram with an accessible textual explanation.
3. Inspect: Java code and tested expected behavior.
4. Explore: meaningful interaction or trace when it improves understanding.
5. Contrast: common mistakes, alternatives, and tradeoffs.
6. Practise: prediction, debugging, refactoring, or modeling exercise.
7. Apply: verified links to relevant existing modules.
8. Review: summary, questions, and suggested next lesson.

Not every lesson needs animation. Prerequisites guide learners without unnecessary
locks. Include search, resume, previous/next navigation, bookmarks, and useful
loading/error/empty states. Keep lesson progress separate from module-reviewed
status and the other applications' storage.

## Delivery phases and exit gates

The reference slice and the Phase 0 evidence mapping are implemented. Content delivery
for the remaining topics is still open; an audited gap is not a published lesson.

- [x] **Phase 0 — Coverage audit:** map every requested topic to source evidence,
  missing content, prerequisites, exercises, and intended module connections.
- [x] **Phase 1 — Reference lesson:** deliver Classes and Objects end-to-end,
  including the shared renderer, accessible visuals, tested code, exercise,
  navigation, and progress. Review this vertical slice before scaling content.
- [x] **Phase 2 — OOP and relationships:** all fifteen individual concepts, the
  connected overview/capstone and domain-model exercise/rubric are delivered.
  All published lessons have source-curated rendered class models and
  complete text alternatives. Combined local assessment/visual verification passes;
  production release evidence is recorded on the class-model PR. The dedicated
  UML lessons and whole-curriculum release remain separate gates.
- [ ] **Phase 3 — UML and principles:** Class Diagram is implemented; Use Case,
  Sequence, Activity and State Machine diagrams and all requested principles
  remain. Complete connected SOLID picture/code examples as part of this phase.
- [ ] **Phase 4 — Patterns:** deliver all 23 in small reviewed batches, including
  comparisons, tradeoffs, verified code, and exercises.
- [ ] **Phase 5 — Concurrency:** deliver foundations, primitives, challenges,
  and patterns, with accurately labeled illustrations and safe Java experiments.
- [ ] **Phase 6 — Interview preparation:** deliver the framework, worked example,
  guided and independent mocks, timing, and self-assessment rubric.
- [ ] **Phase 7 — Integration and release:** verify complete topic coverage,
  practice links, navigation, accessibility, mobile usability, performance,
  persistence behavior, and regression safety across existing routes.

Estimate remaining effort after the reference lesson establishes the real content
and implementation cost. Do not publish empty topic pages as completed lessons.

### Reference-slice evidence (2026-10-21)

- `frontend/src/learning/curriculum.js` is the canonical inventory: 69 stable topic
  IDs, one published lesson, 68 planned topics, and five explicit proposed additions.
  It accounts for all fifteen OOP concepts, 23 patterns, five UML diagrams and the
  requested concurrency topics. The subsequent Phase 0 audit replaced the initial
  minimum-foundation links with topic-specific, cycle-checked prerequisite guidance.
- `frontend/src/learning/lessons/classes-and-objects.js` supplies the problem,
  objectives, explanatory text/illustration, source, prediction feedback, exercise,
  rubric, pitfalls, summary, references and verified Parking Lot source links.
- `ClassesAndObjectsExampleTest` compiles the two displayed Java files with release
  17 and checks independent instances, alias identity, validation, every illustrated
  snapshot, and the actual command-line output. No application server is started.
- The curriculum and learning-flow suites cover search, availability, lazy loading,
  storage validation/failures, bounded notes, cross-tab updates, resume, bookmarks,
  review marks, stale imports, and recovery. The route boundary is tested separately.
- Browser verification uses production assets with explicit route/content failures,
  both themes, keyboard interaction, reduced motion and 320/390/768/1280px layouts.
  It is intercepted browser evidence, not live HTTP end-to-end or user research.

### Coverage-audit evidence (2026-10-23)

`LLD_CURRICULUM_COVERAGE.md` maps all 69 canonical IDs to an outcome, conceptual
prerequisites, an inspected source/mapping decision, an exercise and the precise
delivery gap. Its 24 evidence groups distinguish implementation/call sites/tests
from generic pattern labels. The source register explicitly declines unsupported
module mappings rather than inventing examples for missing patterns.

The canonical manifest carries the same prerequisite graph. `curriculumCoverage`
tests guard one row per topic, graph consistency/cycles, evidence links and the
specific teaching errors caught by the audit. Source inspection established the
roles; the tests alone do not certify every architectural interpretation.

The audit also corrected ATM's fictional Transaction.execute/Template Method claim
and KV's unsupported lock-free, immutable-value and crash-durability claims. A real
class-initialized ATM state Singleton and the feature-flag Boolean-tree interpretation
are retained as narrower source reuse examples. No new topic is marked published.

The first Phase 2 batch delivers Enums and Interfaces with canonical Java, recorded
illustrations, prediction feedback, an exercise/rubric and verified Parking links.
`OopExamplesTest` compiles the displayed examples and checks outputs, fixture facts,
shared input contracts, locale independence and negative compiler cases. The shared
renderer now supports named fields for different concepts and links published
prerequisites. This is three published topics, not all fifteen OOP concepts.

Validation for this batch: 2,376 backend tests / 288 suites and 699 frontend tests /
40 files pass; Maven package, frontend lint (14 existing warnings), production
build and both chunk budgets pass. Eight intercepted browser contexts cover 184
views at 320/390/768/1280px in light/dark themes, including content/route failures,
reload recovery, keyboard controls, per-lesson persistence and navigation. Browser
checks also reproduce and prevent collapsed input whitespace and split mobile
implementation names (RCA-107). No application servers were started; this is not
a live HTTP end-to-end sign-off.

Next delivery work is the rest of Phase 2 plus the two introductory guides, followed by the UML,
principles, pattern, concurrency, interview and integration gates below. Preserve
the audit's explicit gaps until their own implementation or validation evidence
exists. KV map/log ordering now has an implementation fix and deterministic
regressions (RCA-106); complete simulation-event serialization and final module UX
review remain open. This does not publish another curriculum lesson.

The next Phase 2 batch adds Constructors, Access Modifiers and Encapsulation.
Canonical Java covers this/super delegation and later mutation, compiler-checked
visibility in two packages, and a deliberately leaked list versus a guarded owner
with detached snapshots. `StateBoundariesExampleTest` compiles all ten displayed
files and checks the trace/output, access decisions, constructor rejections and
state invariants. The manifest now owns durations and a prerequisite-respecting
publication sequence; published supplemental topics retain their proposed labels.
This is six of fifteen OOP/relationship concepts, not Phase 2 completion. The
introductory guides, other nine concepts, foundational class diagrams/domain-model
assessment and later curriculum phases remain open.

Validation for this batch: 2,395 backend tests / 289 suites, 710 frontend tests /
41 files, Maven package, frontend lint (14 existing warnings), production build
and both chunk budgets pass. Frontend validation uses one worker with the normal
test timeouts. A 320-view browser pass covers all six lessons in both themes and
320/390/768/1280px, including recorded fields, code/output, import-failure recovery,
keyboard controls, independent saved notes/review/bookmarks, proposed labels,
durations and prerequisite/next navigation. These intercepted checks complement
the Java/compiler evidence and do not close module-wide UX or live backend review.

## Technical boundaries

- Use one curriculum manifest for stable IDs, prerequisites, ordering, publication
  status, and progress mapping. Keep lesson content separate from module design data.
- Reuse shared components and lazy-load routes/content; preserve existing URLs,
  module resolvers, diagram ownership, and the single global theme toggle.
- Source displayed Java examples from compile-tested examples where practical,
  rather than maintaining drifting copies of code strings.
- Keep business logic and real experiments in Java. Never execute arbitrary
  learner-submitted Java on the server as part of this scope.
- Reuse theme tokens; verify both themes, keyboard/focus behavior, reduced motion,
  textual alternatives, contrast, and mobile layouts.
- Follow repository branch/PR/CI rules for implementation batches. Do not start
  application servers automatically.

## Definition of complete

- Every requested topic has reviewed content, an explicit learning outcome,
  explained practice, and traceable coverage in the audit matrix.
- The fifteen OOP concepts, 23 patterns, five UML diagrams, and all listed
  concurrency topics are accounted for; proposed additions remain identifiable.
- Java examples compile and pass relevant tests; diagrams match the code and
  actual module-pattern claims have implementation evidence.
- Navigation, progress, search, recovery states, responsive layouts, and
  accessibility are verified. Completion tracking is not presented as mastery.
- Existing modules continue working; relevant local checks and required CI pass.
- The separate UI/UX completion matrix is closed with evidence before claiming
  the whole project is complete, not merely this curriculum.

## Authoritative reference starting points

- [Java 17 language specification: Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html)
- [Java 17 concurrency APIs](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/package-summary.html)
- [OMG UML 2.5.1 specification](https://www.omg.org/spec/UML/2.5.1)


## Six-lesson integration — 2026-10-27

The How to Learn LLD guide is first in the recommended sequence and introduces
requirements, responsibilities, invariants and observable tests before optional
Java. Overloading/overriding, static/instance members, aggregation, composition
and dependency complete the remaining five individual OOP topics. All use
canonical Java 17 files, recorded output/snapshots, explained predictions,
exercises/rubrics and verified links to real module call paths.

The manifest has sixteen published lessons and 53 planned topics. Published
prerequisites precede dependents; proposed-addition labels remain visible after
publication. The redesigned catalog takes reading estimates, outcomes and
publication state from this metadata without importing lesson content.

The relationship lessons distinguish domain ownership/deletion policies from
Java reachability; a mutable collection or a private/final field is not by itself
proof of composition. Dependency injection and interface use are not presented
as automatic proof of DIP. The counters lesson distinguishes base-constructor
completion from successful most-derived construction and does not claim static
state is persistent, a singleton or inherently thread-safe.

Phase 2 remains open for the connected overview/capstone, foundational class
visuals and its model-assessment gate. UML, principles, patterns, concurrency,
interview delivery and the separate 60-module UX work retain their own gates.

Local integration validation passes 2726 backend tests in 302 suites and 838
frontend tests across 57 files, plus Maven package, lint (14 existing warnings),
production build and both chunk budgets. Artifacts are recorded under
`/home/prem/validation/lld-six-lessons/`. Browser and actual deployed release
evidence belong to this batch's PR; Java fixture checks alone do not establish
visual fidelity or hosted backend availability.


## Connected OOP capstone — 2026-10-27

`/learn/oop-overview` is a synthesis lesson after all fifteen individual concepts.
Its five recorded states follow separate plans, shared topics, owned entries,
per-call prompt policies, rejected duplicates and retirement through an alias.
The independent exercise adds per-entry review progress and asks the learner to
explain invariants, relationship multiplicities and one alternative design.

The manifest declares all fifteen recommended prerequisites and places the
capstone last in the published sequence; the Learning guides group contains both
the introductory workflow and this advanced review. Catalog outcomes stay in the
manifest. Inline concept review links retain catalog navigation context.
`OopOverviewExampleTest` compiles the six displayed Java files and verifies
output, snapshots, negative compiler cases and supported module mappings.

The capstone assessment/rubric is delivered, with review remaining a personal
self-check. Phase 2 retains its foundational class-diagram and final review gate;
publication alone does not establish that the visual curriculum is complete.

Capstone integration validation passes 2744 backend tests in 303 suites and 849
frontend tests across 58 files, plus package/lint/build and chunk budgets. The
four completed-visit regressions verify that a Next suggestion promoted to Continue
retains focus on the same lesson (RCA-124). Browser artifacts use frozen production
builds under `/home/prem/validation/lld-oop-capstone/`; release results are recorded
with the capstone PR.

The capstone frozen-build matrix passes 136 browser checks across both themes and
320/390/768/1280px: recorded fields, source/output fidelity, keyboard code panning,
actual-visit hero promotion, inline/prerequisite return context, notes/bookmarks,
review denominators, failed content import and explicit reload. These scoped
checks do not claim all existing module workflows or the later class-model UI.


## Foundational class models and Phase 2 review — 2026-10-28

All seventeen published lessons now include selected class/interface/enum
compartments sourced from their displayed canonical Java. A native selector
keeps the complete overview or shows one curated relationship pair. Connectors
distinguish generalization, realization, dependency, association, shared
aggregation and composition; navigation, multiplicities and domain constraints
remain explicit text. No ownership or arrowheads are inferred from object
references. The complete text explanation stays readable outside the scaled
canvas and retains every listed declaration when a pair is selected.

The capstone's model is attached to its published lesson, and a manifest guard
requires a model for every published lesson. Assessment review confirms that the
independent per-plan review exercise asks for invariants, owner checks, idempotent
updates, rejected-operation state, multiplicities and an alternative design.
Review marks still represent personal self-checks, not mastery. This closes the
Phase 2 content/assessment/local visual gate; it does not publish the five
dedicated UML lessons or any of the remaining 52 topics.

Validation: 2744 backend tests (303 suites), 883 frontend tests (61 files), Maven
package, lint (14 existing warnings), production build and both chunk budgets
(313607-byte entry; 54680-byte largest non-entry). The final routed production
build passes 424 browser views across light/dark and 320/390/768/1280px, including
all seventeen models and relationship pairs, complete text alternatives,
zoom/fullscreen, unique inline/modal marker IDs, Escape focus restoration, no
page overflow and missing-model-chunk reload without losing notes. Browser
assets are frozen under `/home/prem/validation/lld-class-model-release/dist-v2/`;
actual deployment/resource evidence is recorded separately on the release PR.
Application servers were not started. These checks cover the learning slice,
not all module workflows, all assistive technologies or hosted backend uptime.


## Dedicated Class Diagram lesson — 2026-10-28

The eighteenth lesson extends the OOP foundation into structural notation and
source reconciliation. Its small library example distinguishes shared shelf
membership, a required loan/book link and an optional owned receipt. The selected
views cover six relationship kinds with explicit both-end multiplicities,
navigation and ownership policies. Five Java-verified recorded steps remain
separate from the class view; the lesson explains omissions, inherited members,
visibility, abstract/static conventions and the limits of generic/Java annotations.

The independent workshop exercise/rubric requires a defended model and lifecycle
constraints, rather than copied boxes. Parking practice checks actual pricing
interface/method/Ticket declarations and distinguishes an identifier from a direct
object reference. The canonical six Java files are verified by
ClassDiagramLessonExampleTest, with20 compiler/behavior/output/snapshot cases.
The OMG UML2.5.1 normative reference and JLS17 references are linked; further-reading
copy now covers modeling specifications as well as Java documentation.

Publication/order/coverage/navigation expectations are reconciled to18 published
and51 planned topics. The capstone links onward to Class Diagram; its next planned
concept is Use Case Diagram. Notes remain isolated through that sequence. A shared
heading-context fix closes the h2-to-h4 skip in class models while retaining h4
under module h3 titles (RCA-127). Full parent checks, eight-context browser review
and deployment evidence belong to this release. This does not complete Phase 3,
the entire curriculum, or the separate60-module UX review.

Local integrated release checks pass2798 backend tests (308 suites),941 frontend
tests (66 files), Maven package with clean exit, lint (14 existing warnings),
production build and chunk budgets (313607-byte entry /54680-byte largest
non-entry). The final frozen routed build passes544 browser views across both
themes and320/390/768/1280px: all18 models, typed pairs, h3 viewer context, native
fullscreen/focus, all five new recorded states, six canonical Java files/output,
standards link and failed-model-chunk recovery retaining notes. Results and
limits are retained under `/home/prem/validation/lld-class-diagram-release/`;
actual deployment/resource review is recorded on the release PR.
