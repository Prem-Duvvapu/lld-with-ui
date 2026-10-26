# LLD curriculum coverage audit

Audited: 2026-10-23, with source corrections from #167, KV runtime ordering from
#168, and the OOP lesson deliveries below. This is the Phase 0 source and
delivery-gap audit, **not a completed curriculum**. There are ten published lessons
and 59 undelivered topics. The canonical IDs, publication status, grouping and
prerequisite graph live in `frontend/src/learning/curriculum.js`.

## Reading the matrix

- Each row records a learning outcome, recommended prerequisite IDs, inspected
  source or an explicit no-mapping decision, a concrete exercise, and missing delivery.
- **G:** means the dedicated lesson, explained practice, assessment and applicable
  accessible visual/Java example still need delivery. Existing module code or prose
  does not satisfy that lesson's publication gate.
- Evidence groups below identify actual implementation, call sites and relevant
  tests. They do not certify every behavior or every UX flow of that module.
- **No verified mapping** means this audit did not establish a suitable production
  example. It is not a claim of repository-wide absence. Write a small tested teaching
  example rather than attaching a misleading module-pattern label.
- Prerequisites are conceptual guidance, not enrollment locks or proof of mastery.
  Basic Java variables, control flow and method calls are external readiness skills.
  Catalog grouping is not a strict topological order: follow the prerequisite links
  when authoring lessons and offer review links rather than blocking learners.
- Four supplemental OOP concepts and Interpreter are explicitly proposed additions.
  Concurrency 101 is a section overview; Introduction to Concurrency is its lesson.

## Start here

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `how-to-learn-lld` — How to Learn LLD | Distinguish LLD from DSA/HLD and turn a bounded requirement into responsibilities and invariants. | None | [E24](#e24): existing module path and library are practice assets, not this guide; use Parking as the recurring system. | Scope an entry/exit workflow, list exclusions, and explain the next design step without naming a pattern. | G: readiness checks, beginner/revision/interview paths, worked reasoning and self-assessment. |
| `oop-overview` — 15 Must-Know OOP Concepts | Locate all fifteen canonical concepts and explain how fundamentals connect to relationships. | None | [E01](#e01), [E02](#e02), [E03](#e03), [E05](#e05), [E06](#e06): verified examples to curate, not fifteen published lessons. | Classify a small model's fields, behavior, identity, ownership and collaborations; defend each classification. | G: overview lesson linking the fifteen concepts without duplicating their content. |

## OOP fundamentals

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `classes-and-objects` — Classes and Objects | Distinguish a class, two independent instances and two references to one instance. | None | [E01](#e01): published `/learn/classes-and-objects`; [E02](#e02): ParkingSpot practice connection. | Predict the two cards' counts and identity; model two independent reading sessions and explain an alias. | Delivered: source, output and three snapshots are Java-tested; prediction feedback, exercise, rubric, notes and review are published. |
| `enums` — Enums | Model a closed set of valid values and separate enum values from arbitrary request strings. | `classes-and-objects` | [E25](#e25): compiled ReviewPriority, normalization/rejection snapshots and compiler checks; [E02](#e02): real enum/factory boundaries. Practice `/parking-lot`. | Add a declared priority with explicit data; test normalized, unknown, blank and null input; explain why user-created labels need a different model. | Delivered: `/learn/enums`, Java-verified illustration/output, prediction, exercise/rubric and verified module/source links. |
| `interfaces` — Interfaces | Explain a behavioral contract and substitute implementations through its declared type. | `classes-and-objects` | [E25](#e25): compiled MessageFormatter implementations, dispatch/contract fixtures and compiler checks; [E02](#e02): production pricing-policy call. Practice `/parking-lot`. | Add BracketFormatter without changing the caller, reuse invalid-input tests and explain the cost of unrelated interface methods. | Delivered: `/learn/interfaces`, Java-verified dispatch/contract illustration and output, prediction, exercise/rubric and verified module/source links. |
| `encapsulation` — Encapsulation | Protect valid state through operations rather than exposing every field for mutation. | `classes-and-objects`, `access-modifiers` | [E26](#e26): LeakyShelf/ReadingShelf mutation boundary, rejected operations and detached snapshots; [E04](#e04): actual mutable ingredient-map copies. Practice `/coffee-machine`. | Add guarded removal, preserve the invariant and an earlier snapshot, then distinguish structural from element immutability. | Delivered: `/learn/encapsulation`, canonical Java counterexample and guarded design, verified snapshots/output, prediction, exercise/rubric and source links. |
| `abstraction` — Abstraction | Choose a caller contract and distinguish interface promises from shared abstract-class implementation. | `encapsulation`, `interfaces` | [E27](#e27): TopicLabel, its bounded abstract base and two concrete shortening styles; [E04](#e04): actual CoffeeComponent/CoffeeDecorator contract and hook. Practice `/coffee-machine`. | Implement a tail label, preserve input/output promises and show why final does not prove every hook result correct. | Delivered: `/learn/abstraction`, canonical Java, verified snapshots/output, compiler and semantic counterexamples, prediction, exercise/rubric and source links. |
| `inheritance` — Inheritance | Explain subtype initialization, inherited state access and instance overriding while distinguishing an is-a promise from object collaboration. | `classes-and-objects`, `access-modifiers`, `constructors` | [E27](#e27): resource/video construction, inherited API, dispatch and a separate playlist; [E04](#e04): actual CoffeeDecorator/ExtraShotDecorator superclass and wrapped reference. Practice `/coffee-machine`. | Add an article subtype without changing the caller, trace base initialization and explain a compiling override that violates the model contract. | Delivered: `/learn/inheritance`, canonical Java, constructor/dispatch fixtures, negative compiler cases, composition comparison, prediction and exercise/rubric. |
| `polymorphism` — Polymorphism | Separate declared API, compile-time overload choice and runtime instance-method dispatch. | `interfaces`, `inheritance` | [E28](#e28): aliases, overload/override selection and hidden members; [E02](#e02): actual repository pricing call through PricingStrategy. Practice `/parking-lot`. | Replace an accidental ask(Object) overload with a contract-preserving ask(String) override and predict calls without downcasts. | Delivered: `/learn/polymorphism`, canonical Java, identity/dispatch/output fixtures, negative compiler/runtime cases, prediction and exercise/rubric. |
| `constructors` — Constructors and Initialization (proposed) | Distinguish allocation, valid initialization, constructor chaining and later mutation. | `classes-and-objects` | [E26](#e26): LearningSession/FocusedSession this/super trace and invalid-construction checks; [E03](#e03): real transaction constructor chain. Practice `/atm`. | Add a convenience default without duplicating validation; explain the base side effect retained after derived-constructor failure and test later updates. | Delivered: `/learn/constructors`, Java-verified trace/output, compiler-negative cases, prediction, exercise/rubric and actual ATM record links; proposed-addition label retained. |
| `access-modifiers` — Access Modifiers (proposed) | Choose public/private/protected/package visibility by the intended collaboration boundary. | `classes-and-objects` | [E26](#e26): compiler-checked caller matrix across two packages, protected receiver restriction and package-private top-level type; [E10](#e10): actual protected read hooks. Practice `/kvstore`. | Compile same-package and external callers; distinguish child-typed from base-typed protected receivers inside the subclass. | Delivered: `/learn/access-modifiers`, compiled matrix and successful demo, prediction, exercise/rubric and verified source links; proposed-addition label retained. |
| `overloading-and-overriding` — Method Overloading vs Overriding (proposed) | Distinguish signature-based overload selection from runtime overriding. | `polymorphism`, `constructors` | [E03](#e03): two withdraw signatures; [E04](#e04): getPrice overrides on CoffeeComponent implementations. | Predict the selected overload and then the invoked override for two differently typed references. | G: paired compile-tested examples, diagram and misconception checks. |
| `static-and-instance` — Static vs Instance Members (proposed) | Separate per-object state from class-associated members and shared constants. | `classes-and-objects` | [E01](#e01): independent instance counters; [E03](#e03): static final state instance and registry. | Explain why a static review counter changes the meaning of the two-card example; contrast it with a shared immutable constant. | G: class/instance visual, tested contrast and explicit thread-safety caveats. |

## Class relationships

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `association` — Association | Explain concrete object links, direction and multiplicity without inferring ownership from a reference or ID. | `classes-and-objects` | [E29](#e29): learner/tutor references and actual Ride-to-Driver link plus independent IDs; [E02](#e02): Ticket.spotId is an ID-based reference to a repository spot. Practice `/uber`. | Add an identity-checked tutor switch, preserve links after invalid requests and distinguish navigation from reverse-directory/ownership rules. | Delivered: `/learn/association`, canonical Java, verified reference/state/output fixtures, multiplicity explanation, prediction and exercise/rubric. |
| `aggregation` — Aggregation | Describe a non-owning whole/part relationship whose members are independently managed. | `association` | [E05](#e05): groups reference existing User objects resolved from the user repository. Practice `/splitwise`. | Put one existing user in two groups and explain why creating a group does not create a new user. | G: shared-membership example, ownership discussion and contrast with composition. |
| `composition` — Composition | Explain part construction/ownership while distinguishing it from Java aliasing and garbage collection. | `association` | [E06](#e06): Game constructs its Board and keeps a final reference; a getter still exposes an alias. Practice `/tictactoe`. | Model a game-owned board, then explain what final does not guarantee about mutation or part lifetime. | G: ownership visual and explicit counterexample; Java has no automatic UML-style deletion enforcement. |
| `dependency` — Dependency | Distinguish temporary parameter use from a stored association and depend on the smallest useful contract. | `interfaces`, `association` | [E02](#e02): a pricing operation receives a Ticket; [E13](#e13): completion receives PricingStrategy. | Identify which collaborators are retained fields and which are used only during an operation. | G: dependency versus association comparison and minimal-interface exercise. |

## Design principles

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `dry` — DRY Principle | Remove duplicated knowledge without merging unrelated concepts merely because their text looks alike. | `encapsulation` | [E02](#e02), [E13](#e13): live and sandbox paths reuse pricing/assignment policies while keeping state separate. | Centralize a duplicated price rule without coupling the two repositories' mutable state. | G: before/after refactoring and a counterexample where similar code should stay separate. |
| `yagni` — YAGNI Principle | Keep an implementation within demonstrated requirements and name what evidence would justify expansion. | `classes-and-objects` | [E24](#e24): current in-memory system and scoped curriculum plan; these are case-study inputs, not an implementation of a principle. | Choose the smallest solution for a single-user exercise and defend exclusions such as auth and a database. | G: scenario lesson, tradeoff discussion and change-trigger assessment. |
| `kiss` — KISS Principle | Prefer the simplest adequate model while preserving explicit validation and invariants. | `classes-and-objects` | [E02](#e02): small pricing policies; [E01](#e01): focused teaching model with stated limits. | Compare a direct policy implementation with an unnecessarily generic rules framework for the same requirement. | G: contrasted solutions, complexity reasoning and a tested minimal design. |
| `solid-pictures` — SOLID Principles with Pictures | Explain SRP, OCP, LSP, ISP and DIP through responsibility/contract diagrams, including misuse. | `abstraction`, `polymorphism`, `dependency`, `composition` | [E02](#e02), [E04](#e04), [E09](#e09): policy seams, wrappers and observers are source material, not proof of all five principles. | Draw before/after diagrams for all five principles and identify a behavioral contract that a subtype must preserve. | G: five connected visual examples, tradeoffs and accessible text alternatives. |
| `solid-code` — SOLID Principles with Code | Validate each visual refactoring with Java behavior rather than claiming a pattern automatically proves SOLID. | `solid-pictures` | [E02](#e02), [E04](#e04), [E09](#e09): production calls/tests to link after each individual principle example is verified. | Refactor a deliberately broken contract; test substitutability and explain the remaining factory-registration edit. | G: five compiled before/after examples, tests and shared links to the picture views. |

## Creational patterns

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `singleton` — Singleton | Explain one class-associated instance, initialization and scope without conflating it with a Spring bean definition. | `static-and-instance`, `encapsulation` | [E03](#e03): IdleSessionState.INSTANCE, private constructor and SessionStates.of; this is narrower than saying every service is a GoF Singleton. | Prove repeated registry lookups return the same state object; explain per-class-loader versus per-container scope. | G: tested identity/initialization lesson, alternatives and global-state cautions. |
| `factory-method` — Factory Method | Identify creator-subclass-controlled product creation and distinguish it from a named factory function or registry. | `inheritance`, `polymorphism`, `interfaces` | [E02](#e02), [E04](#e04) are useful counterexamples: policy/recipe factories are not a verified creator-subclass teaching example. [E23](#e23). | Introduce two creator subclasses with an overridden product-creation operation and justify why a simple factory would not suffice. | G: isolated compiled example, creator/product diagram and explicit factory comparison. |
| `abstract-factory` — Abstract Factory | Create compatible families of related products through an abstract factory contract. | `factory-method`, `composition` | No verified related-product-family module mapping was established in [E23](#e23); enum strategy registries do not establish this pattern. | Build two product families and test that clients cannot accidentally mix incompatible products. | G: new tested family example, diagram, use/avoid guidance and comparison with Factory Method. |
| `builder` — Builder | Separate incremental configuration from construction of a valid composed object. | `constructors`, `encapsulation` | [E07](#e07): CacheBuilder builds a sharded cache with optional statistics and is called by CacheLibraryService. Practice `/cachelibrary`. | Configure a cache with and without statistics, reject invalid size/shards, and explain what build owns. | G: focused lesson using real builder behavior, contrasted constructor alternative and exercise. |
| `prototype` — Prototype | Explain copying through a prototype contract and distinguish shallow copies from independent nested state. | `composition`, `constructors` | [E13](#e13) has detached snapshot copies, but no verified polymorphic Prototype module contract was mapped in [E23](#e23). | Copy a nested model through a prototype API and demonstrate which nested mutations are shared or isolated. | G: new compiled prototype example, copy semantics and explicit distinction from arbitrary snapshot copying. |

## Structural patterns

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `adapter` — Adapter | Translate an incompatible collaborator interface into a client's required contract. | `interfaces`, `dependency` | No verified application Adapter teaching mapping in [E23](#e23); do not rename any wrapper an adapter. | Adapt a legacy notification API and test argument/result translation without changing the client. | G: compiled incompatible-interface example, diagram and Adapter/Decorator/Proxy contrast. |
| `bridge` — Bridge | Vary an abstraction and its implementation dimension independently rather than multiplying subclasses. | `abstraction`, `composition` | No verified two-dimension Bridge module mapping in [E23](#e23); composing two strategies alone is insufficient evidence. | Add one abstraction variant and one implementation variant and count which classes actually change. | G: new compiled two-dimension example and Bridge-versus-Adapter comparison. |
| `composite` — Composite | Treat leaves and groups through one component contract and recursively evaluate a tree. | `interfaces`, `composition` | [E08](#e08): Condition, immutable AND/OR/NOT nodes, validated tree builder and live evaluation. Practice `/featureflag`. | Compose nested targeting conditions and predict short-circuit results for two user contexts. | G: tree visual, production-linked Java walkthrough and explained modeling exercise. |
| `decorator` — Decorator | Add behavior through same-contract wrappers while retaining the wrapped component. | `interfaces`, `composition`, `polymorphism` | [E04](#e04): CoffeeDecorator and add-ons are used by CoffeeMachine; [E07](#e07): optional StatsDecorator. | Compose two add-ons and show price/ingredient changes without mutating the base component. | G: wrapper-stack visual, tested trace and distinction from inheritance and Proxy. |
| `facade` — Facade | Offer a cohesive entry point over several collaborators without pretending that it removes their responsibilities. | `dependency` | [E02](#e02), [E13](#e13): ParkingLotService coordinates repositories and policy factories. Practice `/parking-lot`. | Walk entry-to-exit through the facade and decide which invariant belongs in the repository lock. | G: client/subsystem visual, tested workflow explanation and facade-versus-god-object tradeoff. |
| `flyweight` — Flyweight | Share immutable intrinsic state while keeping per-use extrinsic context separate. | `static-and-instance`, `composition`, `encapsulation` | No verified intrinsic/extrinsic-state pool teaching mapping in [E23](#e23); shared enums alone are not sufficient evidence. | Pool immutable glyph styles while keeping positions external, then test safe sharing and an incorrect mutable design. | G: new compiled pool example, ownership/memory explanation and use/avoid guidance. |
| `proxy` — Proxy | Control access to another object through the same contract and distinguish that intent from added behavior. | `interfaces`, `composition` | No verified application Proxy teaching mapping in [E23](#e23); framework proxies are not a substitute for inspecting client behavior. | Add a lazy access proxy and verify when its expensive delegate is created and when calls are refused. | G: new tested example, delegation diagram and comparison with Decorator/Adapter. |

## Behavioral patterns

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `iterator` — Iterator | Traverse a collection without exposing its internal representation and specify mutation/snapshot semantics. | `interfaces`, `encapsulation` | [E07](#e07): FIFO/LRU policies consume JDK iterators; this is usage evidence, not a custom application Iterator implementation. | Write a snapshot iterator over a small collection and test ordering, exhaustion and independence from later mutations. | G: compiled iterator example and precise distinction between usage and implementation. |
| `observer` — Observer | Publish one event to independently registered observers without duplicating the direct side effect. | `interfaces`, `association` | [E09](#e09): notifier registration, two real observer implementations and InventoryService.publish call. Practice `/inventory-management`. | Add an observer, verify one alert reaches each subscriber once, and explain failure isolation. | G: subject/subscriber visual, tested dispatch walkthrough and Observer-versus-Mediator comparison. |
| `strategy` — Strategy | Select interchangeable behavior through a contract without branching on the algorithm in its caller. | `interfaces`, `composition`, `polymorphism` | [E02](#e02): enum-backed pricing resolution and real calculatePrice calls. Practice `/parking-lot`. | Add a pricing policy, test selection/behavior and identify the registration edits that still remain. | G: focused lesson, use/avoid cases and Strategy-versus-State/Template Method comparison. |
| `command` — Command | Encapsulate an operation and its undo contract while preserving validation and history ordering. | `interfaces`, `composition` | [E06](#e06): GameCommand implementations, service invoker and command-backed LIFO undo. Practice `/tictactoe`. | Place two moves, undo only the newest, and test board/turn/history consistency after a rejected command. | G: invoker/receiver/history visual, tested walkthrough and exercise. |
| `state` — State | Delegate lifecycle rules to state objects and reject illegal transitions at one enforcement point. | `polymorphism`, `state-machine-diagram` | [E03](#e03), [E12](#e12): actual class-per-state protocols and guarded transitions. Practice `/atm` or `/elevator`. | Add a legal lifecycle branch and demonstrate that an illegal jump leaves the current state unchanged. | G: state-object lesson linked to a statechart and a Strategy comparison. |
| `template-method` — Template Method | Keep one invariant algorithm in a base class while subclasses supply explicit variation hooks. | `inheritance`, `overloading-and-overriding` | [E10](#e10): final KvReadTemplate.read with GetOperation/PeekOperation hooks, called by the repository. ATM Transaction is a counterexample, not this pattern. | Keep read/expiry logic fixed while testing throw-on-miss and empty-on-miss behaviors. | G: compiled hook/algorithm walkthrough and Template Method-versus-Strategy comparison. |
| `visitor` — Visitor | Add operations over a stable element family using an explicit visitor protocol and explain double dispatch. | `polymorphism`, `overloading-and-overriding` | No verified accept/visit double-dispatch module mapping in [E23](#e23); ordinary Consumer.accept callbacks do not establish Visitor. | Add two visitors over two element types, predict dispatch, and explain the cost of adding another element type. | G: new compiled element/visitor example and tradeoff assessment. |
| `mediator` — Mediator | Move peer coordination into an explicit mediator protocol without merely relabelling a service facade. | `association`, `interfaces` | No verified peer/mediator protocol teaching mapping in [E23](#e23); service orchestration is only a comparison candidate. | Replace direct peer-to-peer references with a mediator and test one complete interaction and a rejected event. | G: new tested peer-coordination example and Observer/Facade comparison. |
| `memento` — Memento | Restore an originator through an encapsulated snapshot without exposing its internals to the caretaker. | `encapsulation`, `composition` | No verified originator/memento/caretaker mapping in [E23](#e23); [E06](#e06) command undo is not automatically Memento. | Save and restore two editor states, then test that later edits cannot mutate the earlier saved state. | G: new compiled snapshot protocol, aliasing tests and undo comparison. |
| `chain-of-responsibility` — Chain of Responsibility | Route a request through ordered handlers with explicit stop/continue behavior. | `interfaces`, `association` | [E11](#e11): coupon eligibility handlers, chain factory and service call before discount application. Practice `/coupon`. | Add an eligibility rule, verify short-circuit order and explain why not every handler must process every request. | G: request-chain visual, rejection trace and tested extension exercise. |
| `interpreter` — Interpreter (proposed) | Represent a small grammar as objects and evaluate its sentences against a context. | `composite` | [E08](#e08): validated rule DTO grammar and recursively evaluated Condition tree are a narrow Boolean-tree interpreter reuse candidate, not a Java/text parser lesson. | Evaluate nested AND/OR/NOT rules, reject an invalid production, and separate tree structure from interpretation. | G: explicit grammar/role mapping, tested explanation and Composite-versus-Interpreter comparison. |

## UML

Use Parking's existing ticket-entry/scan/payment story across all five views. A
diagram's hypothetical extension must be labelled; do not invent a live external
payment provider or asynchronous processing that the Java module does not implement.

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `class-diagram` — Class Diagram | Read responsibilities, visibility, relationships and multiplicity while checking members against Java. | `association`, `inheritance` | [E22](#e22): existing Parking class data/renderer; [E02](#e02), [E13](#e13): real classes and operations. | Reconcile one diagram edge and each displayed method with its source; explain what the diagram leaves out. | G: notation lesson, multiplicity/ownership examples and explained diagram exercise. |
| `use-case-diagram` — Use Case Diagram | Identify actors, goals and the system boundary without confusing them with internal classes. | `how-to-learn-lld` | [E22](#e22): Parking requirements are source material; no dedicated use-case learning view was mapped. | Draw attendant/driver goals around the ticket workflow and justify included/excluded external actors. | G: actual use-case visual, textual alternative and boundary critique. |
| `sequence-diagram` — Sequence Diagram | Trace ordered calls, returns, alternate failures and concurrency without inventing timing guarantees. | `dependency`, `class-diagram` | [E22](#e22): Parking's concurrent exit flow; [E13](#e13): completeExit lock and already-exited guard. | Annotate two competing exits and explain why the loser observes committed ticket state. | G: general sequence-notation lesson, alternate paths and an authoring exercise. |
| `activity-diagram` — Activity Diagram | Model decisions and completion, using parallel branches only when the modeled workflow justifies them. | `how-to-learn-lld` | [E22](#e22), [E13](#e13): existing workflow/code can ground the diagram; no dedicated activity learning view was mapped. | Draw entry/scan/pay decisions and rejection paths without treating a lock-protected payment as parallel work. | G: activity visual, fork/join explanation with a labelled contrasting example and self-check. |
| `state-machine-diagram` — State Machine Diagram | Model events, guards and legal transitions separately from the classes that implement them. | `enums` | [E13](#e13): Ticket exitTime/payment state and completeExit guard; [E22](#e22): existing sequence is not a statechart. | Draw active-to-exited behavior, a read-only scan self-transition and the guard against a second payment. | G: actual statechart and text equivalent; distinguish a conceptual projection from a new Java status enum. |

## Concurrency 101

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `introduction-to-concurrency` — Introduction to Concurrency | Explain interleaved work and a shared invariant before choosing a synchronization mechanism. | `classes-and-objects` | [E13](#e13): last-spot/double-exit races; [E24](#e24): existing concurrency practice routes. | Identify a shared invariant and sketch one legal and one broken interleaving. | G: introductory lesson and explicitly illustrated versus actually recorded execution examples. |
| `concurrency-vs-parallelism` — Concurrency vs Parallelism | Separate overlapping tasks from simultaneous execution and avoid assuming more threads imply speedup. | `introduction-to-concurrency` | [E18](#e18): an actual ForkJoinPool merge-sort implementation; its trace alone does not prove simultaneous execution on multiple cores. | Compare one-worker and multi-worker task traces and state which performance claims the evidence cannot establish. | G: concept visual and measured/qualified experiment with no universal speedup promise. |
| `processes-vs-threads` — Processes vs Threads | Distinguish a process boundary from threads sharing a JVM's address space and objects. | `introduction-to-concurrency` | [E17](#e17): real pool threads; [E01](#e01): bounded child-JVM test harness is test infrastructure, not a process teaching module. | Compare shared object updates by threads with two isolated Java processes and explain communication needs. | G: bounded process example, resource/lifecycle comparison and explicit isolation explanation. |
| `thread-lifecycle` — Thread Lifecycle and States | Describe Java's six Thread.State values and distinguish observation from stable application state. | `processes-vs-threads` | [E17](#e17): worker lifecycle context; task/pool statuses are not JVM thread states. See the Java 17 reference below. | Explain NEW/RUNNABLE/BLOCKED/WAITING/TIMED_WAITING/TERMINATED using controlled synchronization rather than arbitrary sleeps. | G: actual state observations or clearly labelled illustrations, interruption/termination tests and text alternatives. |
| `race-conditions` — Race Conditions and Critical Sections | Identify a check-then-act race and the complete invariant that must be protected. | `thread-lifecycle` | [E13](#e13): latch-synchronized last-spot and double-exit tests; [E19](#e19): atomic stock decrement. | Reproduce a broken invariant, choose its critical section and assert one winner rather than a particular thread name. | G: before/after safe experiment, trace explanation and invariant-focused exercise. |

## Synchronization primitives

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `mutex` — Mutex (Mutual Exclusion) | Explain exclusive access, lock scope and release on every exit path. | `race-conditions` | [E13](#e13): spot/ticket locks; [E15](#e15): a lock protects the queue predicate and mutation. | Move a read outside its required lock, demonstrate the invariant failure, then restore the whole critical section. | G: lock ownership/critical-section lesson, exception-path exercise and tested explanation. |
| `semaphores` — Semaphores | Explain permit counting and distinguish a resource bound from object ownership or a completed operation. | `mutex` | [E16](#e16): two hydrogen permits, one oxygen permit and a separate barrier. Practice `/h2o`. | Account for acquired versus departed atoms and explain why a bond event is not a permit-release event. | G: permit lesson, interruption/release analysis and a bounded Java exercise. |
| `condition-variables` — Condition Variables | Wait for a predicate under its associated lock and recheck it after every wakeup. | `mutex`, `thread-lifecycle` | [E15](#e15): notFull/notEmpty, while loops, await and signal under one lock. Practice `/blocking-queue`. | Explain why replacing while with if is unsafe and why signaling does not transfer the lock immediately. | G: predicate/wait-set visual, spurious-wakeup explanation and a controlled Java exercise. |
| `locking-granularity` — Coarse-grained vs Fine-grained Locking | Balance invariant scope, contention and lock-order complexity without assuming finer is always faster. | `mutex` | [E13](#e13): whole-spot-selection lock; [E14](#e14): independent map segment locks; [E06](#e06): per-game locks. | Decide which operations can proceed independently and which need a shared search-and-claim lock. | G: comparative lesson and correctness/measurement exercise, not fabricated performance numbers. |
| `reentrant-locks` — Reentrant Locks | Explain same-thread reacquisition, balanced releases and the difference from fairness. | `mutex` | [E13](#e13): sandbox mutations call getState while already holding stateLock. Practice `/parking-lot`. | Trace the nested acquisitions and releases and contrast them with another thread's blocked acquisition. | G: hold-count illustration, actual Java check and exception/interruption discussion. |
| `timed-locking` — Try-Lock and Timed Locking | Distinguish immediate tryLock from bounded waiting and define what happens when acquisition fails. | `reentrant-locks`, `deadlock` | [E21](#e21): cleanup uses immediate tryLock; a hold's TTL is not a timed lock acquisition. No bounded-acquisition teaching example was mapped. | Implement tryLock(timeout, unit), test both outcomes without sleep-based scheduling assumptions and release only after acquisition. | G: new bounded-acquisition experiment, interruption and fairness caveats. |
| `compare-and-swap` — Compare-and-Swap (CAS) | Explain conditional atomic update and retry without treating an entire workflow as atomic. | `race-conditions` | [E19](#e19): AtomicInteger.compareAndSet in stock decrement. Practice `/shopping-cart`; this is the counter primitive, not proof checkout is globally lock-free. | Race decrements, assert nonnegative stock, and explain retry, contention and the limits of a single-field CAS. | G: CAS visual, bounded experiment and ABA/compound-invariant discussion. |

## Concurrency challenges

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `deadlock` — Deadlock | Recognize a circular wait and justify a prevention rule rather than relying on lucky scheduling. | `mutex`, `locking-granularity` | [E20](#e20): multi-seat locks are acquired in sorted ID order; this is prevention evidence, not an intentionally hanging demo. | Derive an opposing lock-order cycle, then fix the ordering and prove overlapping bookings terminate. | G: wait-for visual, bounded/non-hanging challenge and prevention tradeoffs. |
| `livelock` — Livelock | Distinguish active retries without progress from blocked deadlock and ordinary contention. | `deadlock` | No verified livelock teaching experiment was identified in [E23](#e23); CAS retries alone do not prove livelock. | Analyze two polite retrying actors, state a progress measure and compare asymmetric ownership with bounded/backoff retries. | G: controlled finite illustration/experiment and starvation/fairness contrast. |

## Concurrency patterns

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `signaling` — Signaling Pattern | Coordinate progress using a shared predicate and notification, not a guessed animation delay. | `condition-variables` | [E15](#e15): queue notEmpty/notFull signaling; [E17](#e17): workers signaled after queued submissions. | Explain what a signal means, which predicate becomes true and why the awakened thread still rechecks it. | G: signaling lesson and a small deterministic producer/waiter exercise. |
| `thread-pool-pattern` — Thread Pool Pattern | Reuse workers while defining queue capacity, saturation and shutdown behavior. | `producer-consumer`, `thread-lifecycle` | [E17](#e17): CustomThreadPool, Worker and real submission/rejection policies. Practice `/thread-pool`. | Submit a bounded batch, predict saturation outcomes and prove shutdown drains or rejects according to the chosen contract. | G: pattern lesson, lifecycle/queue visual and tested configuration exercise. |
| `producer-consumer` — Producer-Consumer Pattern | Decouple work creation from consumption through a bounded queue with backpressure. | `condition-variables` | [E15](#e15): circular-buffer implementation and real service threads. Practice `/blocking-queue`. | Fill the queue, prove a producer waits, drain one item and explain the resulting progress without inventing thread ownership telemetry. | G: conceptual lesson linked to recorded events, cancellation limits and invariant assessment. |
| `reader-writer` — Reader-Writer Pattern | Specify concurrent reads, exclusive writes and the fairness/starvation tradeoff. | `mutex`, `locking-granularity` | [E14](#e14) is an exclusive segment-lock comparison. [E10](#e10) now uses a lifecycle read/write gate: both normal reads and per-key writes share admission, while replay/reset/snapshots are exclusive. It is a coordination comparison, not the textbook all-writes-exclusive example. | Build a read/write-locked snapshot store; prove writer exclusion and discuss why a fairness setting is not a scheduling guarantee. | G: dedicated teaching example, access visual and starvation analysis. |

## Interview preparation

| Topic ID and title | Learning outcome | Prerequisites | Inspected evidence and intended practice | Exercise / assessment | Missing delivery |
|---|---|---|---|---|---|
| `answering-lld-interviews` — How to Answer a LLD Interview Problem | Work from scope/use cases through invariants, objects, contracts, interactions, failures, concurrency, tests and tradeoffs. | `how-to-learn-lld`, `solid-code`, `class-diagram`, `sequence-diagram`, `race-conditions` | [E22](#e22), [E24](#e24): system designs, diagrams and learning path are practice assets; no dedicated interview-prep experience is published. | Explain a complete Parking design without being prompted for a pattern, then assess it against a weak/strong-answer rubric. | G: ten-step framework, worked reasoning, guided and independent mocks, configurable timing and self-assessment. |

## Evidence register

These entries describe the inspected behavior and the limits on reuse. Test-file
links show which existing suites exercise that code; run the suites before shipping
content. A file-existence or string-matching test alone cannot verify these claims.

<a id="e01"></a>
### E01 — Published reference lesson

[Lesson content](frontend/src/learning/lessons/classes-and-objects.js), canonical
[StudyCard](frontend/src/learning/examples/StudyCard.java) and
[demo](frontend/src/learning/examples/StudyCardDemo.java) are checked by
[ClassesAndObjectsExampleTest](backend/src/test/java/com/lld/learning/ClassesAndObjectsExampleTest.java).
That test compiles the displayed files and checks independent state, alias identity,
all three illustration snapshots, validation and actual command-line output, including
LF/CRLF portability. UI flow coverage is in
[learningLessons](frontend/src/__tests__/learningLessons.test.jsx).

<a id="e02"></a>
### E02 — Parking model and pricing collaboration

[ParkingSpot](backend/src/main/java/com/lld/parkinglot/model/ParkingSpot.java),
[VehicleType](backend/src/main/java/com/lld/parkinglot/model/VehicleType.java),
[PricingStrategy](backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java),
[factory](backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java) and
[service](backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java)
provide concrete fields, a small interface, actual policy selection and use. The
factory is an enum-backed registry of injected strategies, not a creator-subclass
Factory Method or related-product Abstract Factory. The
[pricing tests](backend/src/test/java/com/lld/parkinglot/ParkingLotPricingStrategyTest.java)
check policy results and selection. Registration still requires edits; do not promise
that every extension is modification-free or that this alone proves all SOLID rules.

<a id="e03"></a>
### E03 — ATM inheritance, overloads and singleton state objects

[Transaction](backend/src/main/java/com/lld/atm/model/Transaction.java) shares record
fields and constructor initialization with
[WithdrawalTransaction](backend/src/main/java/com/lld/atm/model/WithdrawalTransaction.java)
and [DepositTransaction](backend/src/main/java/com/lld/atm/model/DepositTransaction.java).
[AtmService](backend/src/main/java/com/lld/atm/service/AtmService.java) owns execution
and exposes the two withdraw overloads. There is no Transaction.execute algorithm.
[IdleSessionState](backend/src/main/java/com/lld/atm/state/IdleSessionState.java) has
a private constructor and public static final INSTANCE;
[SessionStates](backend/src/main/java/com/lld/atm/state/SessionStates.java) returns
those actual instances. This establishes a class-initialized state singleton example,
not JVM-wide uniqueness across arbitrary class loaders. Spring-managed services are
a separate per-container/per-bean-definition scope. The
[service tests](backend/src/test/java/com/lld/atm/service/AtmServiceTest.java) exercise
session behavior and rejection paths; a standalone singleton identity lesson still
needs its own targeted tests.

<a id="e04"></a>
### E04 — Coffee decorator and visibility contracts

[CoffeeComponent](backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeComponent.java),
[CoffeeDecorator](backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeDecorator.java),
[ExtraShotDecorator](backend/src/main/java/com/lld/coffeemachine/decorator/ExtraShotDecorator.java)
and [BaseCoffee](backend/src/main/java/com/lld/coffeemachine/decorator/BaseCoffee.java)
show same-contract delegation, protected hooks, overridden behavior and defensive
map copying. [CoffeeMachine](backend/src/main/java/com/lld/coffeemachine/model/CoffeeMachine.java)
actually constructs the wrappers during customization. The
[composition tests](backend/src/test/java/com/lld/coffeemachine/CoffeeDecoratorCompositionTest.java)
check the real composition. [CoffeeFactory](backend/src/main/java/com/lld/coffeemachine/factory/CoffeeFactory.java)
is a recipe registry creating a base component, not proof of Factory Method.

<a id="e05"></a>
### E05 — Non-owning group membership

[Group](backend/src/main/java/com/lld/splitwise/model/Group.java) stores User
references. [SplitwiseService](backend/src/main/java/com/lld/splitwise/service/SplitwiseService.java)
creates users independently and resolves existing users when creating a group;
it does not construct replacement users for membership. The
[service tests](backend/src/test/java/com/lld/splitwise/SplitwiseServiceTest.java)
exercise group/expense workflows. This is domain ownership evidence, not a claim
that Java has a special aggregation keyword or automatically enforced UML lifetimes.

<a id="e06"></a>
### E06 — Game-owned board and command execution

[Game](backend/src/main/java/com/lld/tictactoe/model/Game.java) constructs its Board
and retains a final reference; getBoardObj still exposes an alias. The
[GameCommand](backend/src/main/java/com/lld/tictactoe/command/GameCommand.java)
contract and [PlaceMoveCommand](backend/src/main/java/com/lld/tictactoe/command/PlaceMoveCommand.java)
are used by [TicTacToeService](backend/src/main/java/com/lld/tictactoe/service/TicTacToeService.java)
with per-game locking and a command history. The
[command tests](backend/src/test/java/com/lld/tictactoe/TicTacToeCommandTest.java)
and [concurrency tests](backend/src/test/java/com/lld/tictactoe/TicTacToeConcurrencyTest.java)
cover behavior and contention. A command undo/history is not by itself a Memento
originator/caretaker protocol, and a final reference does not make its object immutable.

<a id="e07"></a>
### E07 — Cache builder, decorator and iterator consumption

[CacheBuilder](backend/src/main/java/com/lld/cachelibrary/builder/CacheBuilder.java)
constructs ShardedCache and optionally wraps it in
[StatsDecorator](backend/src/main/java/com/lld/cachelibrary/cache/StatsDecorator.java).
[CacheLibraryService](backend/src/main/java/com/lld/cachelibrary/service/CacheLibraryService.java)
calls that builder. [CacheBuilderTest](backend/src/test/java/com/lld/cachelibrary/builder/CacheBuilderTest.java)
checks construction and choices. [FifoEvictionPolicy](backend/src/main/java/com/lld/cachelibrary/strategy/FifoEvictionPolicy.java)
and [LruEvictionPolicy](backend/src/main/java/com/lld/cachelibrary/strategy/LruEvictionPolicy.java)
consume collection iterators to find a victim; they do not implement a custom
Iterator class. This distinction matters when choosing a teaching example.

<a id="e08"></a>
### E08 — Composite rule structure and narrow grammar interpretation

[RuleNodeDto](backend/src/main/java/com/lld/featureflag/condition/RuleNodeDto.java)
and [ConditionTreeBuilder](backend/src/main/java/com/lld/featureflag/condition/ConditionTreeBuilder.java)
define/validate a finite node vocabulary. [Condition](backend/src/main/java/com/lld/featureflag/condition/Condition.java),
[AndCondition](backend/src/main/java/com/lld/featureflag/condition/AndCondition.java),
[OrCondition](backend/src/main/java/com/lld/featureflag/condition/OrCondition.java)
and [NotCondition](backend/src/main/java/com/lld/featureflag/condition/NotCondition.java)
form the immutable component tree and evaluate it recursively against UserContext.
The [controller](backend/src/main/java/com/lld/featureflag/controller/FeatureFlagController.java)
builds the tree and the [service](backend/src/main/java/com/lld/featureflag/service/FeatureFlagService.java)
evaluates it in production. [ConditionTest](backend/src/test/java/com/lld/featureflag/ConditionTest.java)
and [ConditionTreeBuilderTest](backend/src/test/java/com/lld/featureflag/ConditionTreeBuilderTest.java)
cover composition and malformed grammar nodes. Interpreting this as a narrow
Boolean-tree language is an architectural role mapping for the proposed Interpreter
lesson; it does not mean a general text parser or a completed Interpreter lesson exists.

<a id="e09"></a>
### E09 — Actual observer registration and publication

[StockAlertNotifier](backend/src/main/java/com/lld/inventory/observer/StockAlertNotifier.java)
receives real [StockAlertObserver](backend/src/main/java/com/lld/inventory/observer/StockAlertObserver.java)
implementations and independently publishes to each.
[InventoryService](backend/src/main/java/com/lld/inventory/service/InventoryService.java)
calls targetNotifier.publish after creating an alert. The
[service tests](backend/src/test/java/com/lld/inventory/InventoryServiceTest.java)
exercise both observers receiving alerts. Do not reuse a dead observer interface,
an empty subscriber list, or a frontend polling loop as equivalent evidence.

<a id="e10"></a>
### E10 — Real Template Method on KV reads

[KvReadTemplate](backend/src/main/java/com/lld/kvstore/template/KvReadTemplate.java)
has a final read algorithm and protected onMissing/onFound hooks.
[GetOperation](backend/src/main/java/com/lld/kvstore/template/GetOperation.java)
and [PeekOperation](backend/src/main/java/com/lld/kvstore/template/PeekOperation.java)
vary those hooks. [KvStoreRepository](backend/src/main/java/com/lld/kvstore/repository/KvStoreRepository.java)
calls both implementations. [KvReadTemplateTest](backend/src/test/java/com/lld/kvstore/template/KvReadTemplateTest.java)
checks different miss behavior, shared live-entry handling and read purity. CAS
correctness does not come from this template; its write-path atomicity is separate.
The repository's conditional update uses ConcurrentHashMap.compute, which may block
contending updates; it is not a lock-free progress proof. KvEntry has generated
setters, and WAL replay retains an in-memory log, so neither type-enforced value
immutability nor persistence across restart should be inferred from these examples.
SET/CAS/DELETE append inside each key's compute before publishing the mapping.
The lifecycle gate admits key operations together and excludes them during replay,
reset and snapshots. [KvStoreReplayConcurrencyTest](backend/src/test/java/com/lld/kvstore/repository/KvStoreReplayConcurrencyTest.java)
pauses real appends to verify ordering and lifecycle exclusion, and checks that
independent keys can still proceed. Snapshots contain detached entries and matching
commands; this does not prove complete simulation-event serialization or close the
module's UI review. See [RCA-106](RCA.md#rca-106-kv-map-updates-and-log-appends-could-replay-in-different-orders).

<a id="e11"></a>
### E11 — Coupon eligibility chain

[EligibilityHandler](backend/src/main/java/com/lld/coupon/chain/EligibilityHandler.java),
[EligibilityChainFactory](backend/src/main/java/com/lld/coupon/chain/EligibilityChainFactory.java)
and [CouponService](backend/src/main/java/com/lld/coupon/service/CouponService.java)
provide handler linkage and a real service call. The
[chain tests](backend/src/test/java/com/lld/coupon/chain/EligibilityChainTest.java)
cover rejection and continuation. Explain the actual stopping policy rather than
claiming that every chain broadcasts the request to all handlers.

<a id="e12"></a>
### E12 — Elevator lifecycle objects

[ElevatorLifecycleState](backend/src/main/java/com/lld/elevator/state/ElevatorLifecycleState.java),
[ElevatorLifecycleStates](backend/src/main/java/com/lld/elevator/state/ElevatorLifecycleStates.java)
and [Elevator](backend/src/main/java/com/lld/elevator/model/Elevator.java) define the
state-object protocol, registry and transition enforcement. The
[controller service](backend/src/main/java/com/lld/elevator/service/ElevatorControllerService.java)
uses those transitions. [ElevatorLifecycleStateTest](backend/src/test/java/com/lld/elevator/ElevatorLifecycleStateTest.java)
tests allowed/rejected transitions. These source assets support State; a formal
statechart and a dedicated concept lesson remain separate deliverables.

<a id="e13"></a>
### E13 — Parking invariants, facade and reentrant sandbox

[Ticket](backend/src/main/java/com/lld/parkinglot/model/Ticket.java),
[ParkingLotRepository](backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java)
and [ParkingLotSimService](backend/src/main/java/com/lld/parkinglot/service/ParkingLotSimService.java)
show independent spot/ticket invariants, atomic completeExit and a sandbox-wide
ReentrantLock. Sandbox mutations call getState while still holding that same lock.
[ParkingLotConcurrencyTest](backend/src/test/java/com/lld/parkinglot/ParkingLotConcurrencyTest.java)
and [ParkingLotSnapshotTest](backend/src/test/java/com/lld/parkinglot/ParkingLotSnapshotTest.java)
exercise races and reset/snapshot behavior; service/MockMvc tests cover real API
contracts. Detached copies are snapshot isolation evidence, not automatically
a polymorphic Prototype contract or an opaque Memento protocol.

<a id="e14"></a>
### E14 — Exclusive striped locking

[StripedHashMap](backend/src/main/java/com/lld/concurrency/concurrenthashmap/model/StripedHashMap.java)
uses one ReentrantLock per segment and locks one segment per operation. The
[service](backend/src/main/java/com/lld/concurrency/concurrenthashmap/service/ConcurrentHashMapService.java)
drives actual worker threads. [StripedHashMapConcurrencyTest](backend/src/test/java/com/lld/concurrency/concurrenthashmap/StripedHashMapConcurrencyTest.java)
tests contention/isolation. This is not a Reader-Writer implementation: readers
and writers take the same exclusive segment lock. It is not the current JDK
ConcurrentHashMap implementation either.

<a id="e15"></a>
### E15 — Bounded queue predicates and conditions

[BoundedBlockingQueue](backend/src/main/java/com/lld/concurrency/blockingqueue/model/BoundedBlockingQueue.java)
guards its circular buffer with one lock, two conditions and while-based predicate
checks. [BlockingQueueService](backend/src/main/java/com/lld/concurrency/blockingqueue/service/BlockingQueueService.java)
creates real producer/consumer threads. The
[queue tests](backend/src/test/java/com/lld/concurrency/blockingqueue/BoundedBlockingQueueTest.java)
exercise blocking/FIFO behavior. A notification is not a promise of lock ownership,
and the browser's recorded playback does not control server thread scheduling.

<a id="e16"></a>
### E16 — H2O permits and a separate barrier

[H2OBonder](backend/src/main/java/com/lld/concurrency/h2o/model/H2OBonder.java)
uses two/one semaphore permits and a three-party barrier.
[H2OService](backend/src/main/java/com/lld/concurrency/h2o/service/H2OService.java)
launches actual atom threads. [H2OBonderTest](backend/src/test/java/com/lld/concurrency/h2o/H2OBonderTest.java)
checks grouping/output. Permit acquisition, barrier bonding and departure/release
are different events. A lesson must analyze interruption paths rather than infer
safe cleanup or permit ownership merely from an animation.

<a id="e17"></a>
### E17 — Real worker pool and bounded submissions

[CustomThreadPool](backend/src/main/java/com/lld/threadpool/model/CustomThreadPool.java),
[Worker](backend/src/main/java/com/lld/threadpool/model/Worker.java) and
[ThreadPoolService](backend/src/main/java/com/lld/threadpool/service/ThreadPoolService.java)
provide real workers, a bounded queue, signaling and rejection/shutdown behavior.
[CustomThreadPoolTest](backend/src/test/java/com/lld/threadpool/CustomThreadPoolTest.java)
and [ThreadPoolConcurrencyTest](backend/src/test/java/com/lld/threadpool/ThreadPoolConcurrencyTest.java)
cover those contracts. PoolTask status labels are application observations, not
Java Thread.State values. Do not turn them into fabricated live JVM state telemetry.

<a id="e18"></a>
### E18 — Fork/join sorting and qualified parallelism

[ParallelMergeSorter](backend/src/main/java/com/lld/concurrency/mergesort/model/ParallelMergeSorter.java)
uses a dedicated ForkJoinPool, RecursiveAction and a sequential threshold.
[MergeSortService](backend/src/main/java/com/lld/concurrency/mergesort/service/MergeSortService.java)
drives the run. [ParallelMergeSorterConcurrencyTest](backend/src/test/java/com/lld/concurrency/mergesort/ParallelMergeSorterConcurrencyTest.java)
checks concurrent behavior. Worker/task traces show scheduled work, not a hardware
speedup guarantee or proof of simultaneous CPU execution at each recorded event.

<a id="e19"></a>
### E19 — Conditional atomic stock update

[Product](backend/src/main/java/com/lld/shoppingcart/model/Product.java) uses
AtomicInteger.compareAndSet in decrementStock.
[ShoppingCartService](backend/src/main/java/com/lld/shoppingcart/service/ShoppingCartService.java)
uses stock operations in larger guarded workflows. The
[concurrency tests](backend/src/test/java/com/lld/shoppingcart/ShoppingCartConcurrencyTest.java)
exercise stock contention. The atomic field update does not make every multi-item
checkout, payment and compensation step one lock-free transaction.

<a id="e20"></a>
### E20 — Lock ordering prevents a booking deadlock

[SeatLockManager](backend/src/main/java/com/lld/movieticket/service/SeatLockManager.java)
sorts/distincts seat IDs before acquiring their locks.
[MovieTicketService](backend/src/main/java/com/lld/movieticket/service/MovieTicketService.java)
uses that manager. [MovieTicketConcurrencyTest](backend/src/test/java/com/lld/movieticket/MovieTicketConcurrencyTest.java)
checks contested/disjoint bookings and cancellation. This supports a prevention
argument, not an intentionally leaked deadlock or a claimed JVM deadlock detector.

<a id="e21"></a>
### E21 — Immediate try-lock is not timed waiting

[Concert SeatLockManager](backend/src/main/java/com/lld/concertticket/service/SeatLockManager.java)
uses tryLock() in expireStaleHolds so cleanup can skip a seat currently being mutated.
[ConcertTicketService](backend/src/main/java/com/lld/concertticket/service/ConcertTicketService.java)
uses the manager, and [ConcertTicketConcurrencyTest](backend/src/test/java/com/lld/concertticket/ConcertTicketConcurrencyTest.java)
tests booking contention. The acquisition has no timeout argument. Hold expiry is
domain TTL, not a timed lock acquisition. The dedicated lesson must add a separately
tested bounded acquisition rather than relabel this behavior.

<a id="e22"></a>
### E22 — Existing class/sequence assets, not five UML lessons

[Parking design](frontend/src/data/design/parking.js),
[class data](frontend/src/data/diagrams/parking.js) and
[sequence data](frontend/src/data/sequences/parking.js) are rendered by
[ClassDiagram](frontend/src/components/ClassDiagram.jsx) and
[SequenceDiagram](frontend/src/components/SequenceDiagram.jsx).
[Diagram viewer tests](frontend/src/__tests__/diagramViewer.test.jsx) cover shared
interaction. The component/page/data inventory did not establish dedicated use-case,
activity or state-machine curriculum views. Existing requirements and state enums
can ground those future views but do not satisfy their delivery gate.

<a id="e23"></a>
### E23 — Scope and limits of no-mapping decisions

The audit inspected `backend/src/main/java/com/lld`, the module design/diagram data,
related tests, and the route/component inventory. Discovery included:

```bash
rg --files backend/src/main/java/com/lld
rg -n 'getInstance\(|static final .*INSTANCE|private .*State\(' backend/src/main/java/com/lld
rg -n 'abstract class .*Factory|interface .*Factory|extends .*Factory' backend/src/main/java/com/lld
rg -n 'accept\(|visit\(|Iterator|clone\(|copy\(' backend/src/main/java/com/lld
rg -n 'tryLock\(|compareAndSet|ReentrantReadWriteLock|StampedLock' backend/src/main/java/com/lld
rg --files frontend/src/components frontend/src/data
```

Matches were followed into callers and tests. In particular, static INSTANCE
objects establish a useful Singleton even without a getInstance method; JDK
iterator consumption is different from implementing an iterator; and the validated
condition grammar is a useful narrow interpretation example even without an
Interpreter-named class. Conversely, no suitable creator-subclass Factory Method,
related-family Abstract Factory, polymorphic Prototype, Adapter, Bridge, explicit
Flyweight pool, application Proxy, double-dispatch Visitor, peer Mediator or opaque
Memento teaching mapping was established. These are authoring gaps, not assurances
that no differently named implementation could ever be found. Framework facilities
and generic prose labels are not interchangeable with verified application examples.

<a id="e24"></a>
### E24 — Existing learning/practice infrastructure

[App](frontend/src/App.jsx), [LearningPath](frontend/src/pages/LearningPath.jsx),
[catalog](frontend/src/data/moduleCatalog.js), [Learn](frontend/src/pages/Learn.jsx)
and the [curriculum manifest](frontend/src/learning/curriculum.js) establish the
existing routes, ordering and publication distinction. The
[curriculum tests](frontend/src/__tests__/curriculum.test.js) check the canonical
inventory/publication contract. This does not provide an interview timer, mock
rubric, full beginner guide or all concept lessons merely because system modules exist.

<a id="e25"></a>
### E25 — Published Enums and Interfaces examples

[Enums](frontend/src/learning/lessons/enums.js) displays canonical
[ReviewPriority](frontend/src/learning/examples/ReviewPriority.java) and
[EnumDemo](frontend/src/learning/examples/EnumDemo.java). It distinguishes exact
lookup from explicit normalization, rejects unsupported/blank/null input, and
explains declared constant data, identity and ordinal limits.
[Interfaces](frontend/src/learning/lessons/interfaces.js) displays
[MessageFormatter](frontend/src/learning/examples/MessageFormatter.java),
[PlainFormatter](frontend/src/learning/examples/PlainFormatter.java),
[TaggedFormatter](frontend/src/learning/examples/TaggedFormatter.java) and
[InterfaceDemo](frontend/src/learning/examples/InterfaceDemo.java).
[OopExamplesTest](backend/src/test/java/com/lld/learning/OopExamplesTest.java)
compiles these exact files with JDK 17, checks actual outputs and illustration
fixtures, exercises both implementations' input contracts, and verifies compiler
rejection of string-to-enum assignment, enum/interface construction, an incomplete
implementation and an implementation-only call through the interface type.

The illustrations display recorded facts, not a JavaScript parser, formatter or
live JVM. Each lesson includes prediction feedback, a separate exercise/rubric,
references to official Java documentation and links to verified Parking source.
The generic field renderer also preserves the original object/reference lesson.
These two lessons do not complete Phase 2 or the 69-topic curriculum.

<a id="e26"></a>
### E26 — Construction, access and mutation boundaries

[Constructors](frontend/src/learning/lessons/constructors.js) uses canonical
[LearningSession](frontend/src/learning/examples/LearningSession.java),
[FocusedSession](frontend/src/learning/examples/FocusedSession.java) and its
[demo](frontend/src/learning/examples/ConstructorDemo.java). The trace demonstrates
this/super delegation without exposing an unfinished object. Rejection and overflow
checks cover initial and later state; the base trace event remains after a derived
constructor fails, so the lesson does not imply transactional construction.

[Access Modifiers](frontend/src/learning/lessons/access-modifiers.js) compiles
[VisibilityRecord](frontend/src/learning/examples/visibility/VisibilityRecord.java),
[VisibilityPeer](frontend/src/learning/examples/visibility/VisibilityPeer.java),
[VisibilityChild](frontend/src/learning/examples/outside/VisibilityChild.java) and
[VisibilityDemo](frontend/src/learning/examples/outside/VisibilityDemo.java) across
two packages. Its matrix is checked against javac decisions, including the
cross-package protected receiver restriction. It explicitly qualifies separate
top-level classes, nested private access and unnamed-module scope.

[Encapsulation](frontend/src/learning/lessons/encapsulation.js) compares a deliberate
[LeakyShelf](frontend/src/learning/examples/LeakyShelf.java) counterexample with
[ReadingShelf](frontend/src/learning/examples/ReadingShelf.java) and its
[demo](frontend/src/learning/examples/EncapsulationDemo.java). Private mutation,
positive capacity, rejected requests and detached unmodifiable snapshots are
verified; neither owner is described as thread-safe or deeply immutable.
[StateBoundariesExampleTest](backend/src/test/java/com/lld/learning/StateBoundariesExampleTest.java)
compiles all ten displayed files, checks outputs/fixtures and exercises compiler
rejections and state invariants. The frontend only selects recorded facts.

The canonical manifest owns reading durations and an explicit publication sequence
that places published prerequisites before their dependents. Catalog grouping
remains a topic taxonomy; it does not force that sequence or lock learners out.

<a id="e27"></a>
### E27 — Abstraction and inheritance through verified contracts

[Abstraction](frontend/src/learning/lessons/abstraction.js) displays canonical
[TopicLabel](frontend/src/learning/examples/TopicLabel.java),
[BoundedTopicLabel](frontend/src/learning/examples/BoundedTopicLabel.java),
[EllipsisTopicLabel](frontend/src/learning/examples/EllipsisTopicLabel.java),
[ClippedTopicLabel](frontend/src/learning/examples/ClippedTopicLabel.java) and the
[demo](frontend/src/learning/examples/AbstractionDemo.java).
[AbstractionExampleTest](backend/src/test/java/com/lld/learning/AbstractionExampleTest.java)
checks the caller contract, boundaries, abstract hooks, compiler rejections,
semantic violations that still compile, output and every recorded state. UTF-16
character limits are explicitly distinguished from grapheme/pixel layout.

[Inheritance](frontend/src/learning/lessons/inheritance.js) displays the canonical
[resource](frontend/src/learning/examples/inheritance/InheritanceResource.java),
[video](frontend/src/learning/examples/inheritance/InheritanceVideo.java),
[playlist](frontend/src/learning/examples/inheritance/InheritancePlaylist.java) and
[demo](frontend/src/learning/examples/inheritance/InheritanceDemo.java).
[InheritanceLessonExampleTest](backend/src/test/java/com/lld/learning/InheritanceLessonExampleTest.java)
checks superclass initialization, inherited accessors, overriding/dispatch,
rejected construction, legal and illegal compiler examples, output and snapshots.
The playlist's ordinary has-a reference is not presented as UML exclusive ownership;
inheritance is not presented as automatic behavioral substitutability.

Both lesson links trace actual CoffeeComponent/CoffeeDecorator implementations.
The examples do not reproduce recipe calculations or certify the module's runtime
concurrency. The frontend selects recorded Java facts; it does not execute Java.

<a id="e28"></a>
### E28 — Polymorphic calls and separate selection rules

[Polymorphism](frontend/src/learning/lessons/polymorphism.js) uses canonical
[PracticeQuestion](frontend/src/learning/examples/PracticeQuestion.java),
[OpenPracticeQuestion](frontend/src/learning/examples/OpenPracticeQuestion.java),
[HintedPracticeQuestion](frontend/src/learning/examples/HintedPracticeQuestion.java)
and its [demo](frontend/src/learning/examples/PolymorphismDemo.java).
[PolymorphismExampleTest](backend/src/test/java/com/lld/learning/PolymorphismExampleTest.java)
checks shared behavior through aliases, overload choice followed by instance
dispatch, hidden fields/static methods, invalid casts and compiler rejections.
Actual output and every recorded snapshot are tied to those displayed files.
The Parking link traces the factory's policy object into the repository's
`PricingStrategy.calculatePrice` call; selection and ticket locking remain
separate mechanisms rather than properties supplied by polymorphism itself.

<a id="e29"></a>
### E29 — Association without invented ownership

[Association](frontend/src/learning/lessons/association.js) uses canonical
[learner](frontend/src/learning/examples/association/AssociationLearner.java),
[tutor](frontend/src/learning/examples/association/AssociationTutor.java) and
[demo](frontend/src/learning/examples/association/AssociationDemo.java).
[AssociationExampleTest](backend/src/test/java/com/lld/learning/AssociationExampleTest.java)
checks actual reference identity, independent reassignment, rejection preserving
the old link, optional assignment, subject validation, absent reverse navigation,
output and recorded states. Tutor immutability is specific to this example, not a
claim that returning an associated mutable object is always safe.
[Ride](backend/src/main/java/com/lld/uber/model/Ride.java) holds both a driver ID and
a Driver reference; [DriverAssignmentService](backend/src/main/java/com/lld/uber/service/DriverAssignmentService.java)
sets that link and releases the existing driver for reuse.
[UberConcurrencyTest](backend/src/test/java/com/lld/uber/UberConcurrencyTest.java)
separately covers active assignment rules. The tutor model allows sharing; Uber
restricts active assignment. Neither Java references nor clearing a field imply
UML whole/part ownership or garbage-collection timing.

## Supporting material that must not disappear between lessons

- Atomicity/visibility/happens-before: cover in race conditions and primitives;
  a lock or volatile example is not complete without an ordering explanation.
- Interruption/cancellation: cover in thread lifecycle, conditions, semaphores,
  timed acquisition, queues and pools. A browser abort is not JVM cancellation.
- Starvation/fairness: cover in granularity, reentrant/timed locks, livelock and
  reader/writer comparisons. Lock fairness is not scheduler fairness.
- Pattern comparisons: Factory Method/Abstract Factory/Builder; Strategy/State;
  Template Method/Strategy; Adapter/Decorator/Proxy; Bridge/Adapter;
  Observer/Mediator; Singleton/dependency-managed lifecycle. These are required
  explanations, not additional empty routes or a reason to duplicate lessons.
- Domain assessments: require one OOP relationship model, mutually consistent
  UML views, a justified refactoring, a pattern-free design choice, a concurrency
  invariant proof and an independent interview answer with a self-check rubric.

## Authoritative semantic references

These references constrain future teaching; they are not evidence that its lesson
already exists. The audit's code-role interpretations and no-mapping decisions are
explicitly distinguished from their API/specification contracts.

- [Java 17 Thread.State](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Thread.State.html): six JVM states, not operating-system states or application task labels.
- [Java 17 ReentrantLock](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html): reentrancy, fairness and untimed/timed acquisition contracts.
- [Java 17 ConcurrentHashMap.compute](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html#compute(K,java.util.function.BiFunction)): atomic mapping updates can block contending updates; atomicity does not establish lock-free progress.
- [Java 17 class initialization](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4): initialization semantics for class-associated instances.
- [Spring bean scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html): per-container/per-bean-definition scope is not identical to a class-enforced Singleton. The current documentation may target a later framework; use only this scope distinction, not unsupported new APIs in the Spring Boot 3.2 project.
- [OMG UML 2.5.1 specification entry point](https://www.omg.org/spec/UML/2.5.1/About-UML): normative notation reference for the five connected views.

## Exit gate and update rules

Phase 0 is satisfied by this complete topic-to-outcome/prerequisite/evidence/gap/
exercise mapping and its reviewed source register, not by pretending the gaps are
delivered. `curriculumCoverage.test.js` guards coverage, references, prerequisite
consistency/cycles and the corrected ATM claim; it does not automatically certify
every architectural interpretation above. The actual implementation/call paths
were manually inspected and the relevant Java suites remain required validation.

When publishing a lesson, update its matrix row and manifest status together, add
compile-tested examples and explained assessments, and verify actual practice links.
Preserve the five proposed-addition labels. The remaining 63 topic deliveries,
curriculum integration/release gates, and separate 60-module UX review remain open.
