import logSource from '../examples/memberstate/InitializationLog.java?raw';
import counterSource from '../examples/memberstate/StudyCounter.java?raw';
import focusSource from '../examples/memberstate/FocusCounter.java?raw';
import demoSource from '../examples/memberstate/MembersDemo.java?raw';
import output from '../examples/static-and-instance-output.txt?raw';
import snapshots from '../examples/static-and-instance-snapshots.json';

export default {
  id: 'static-and-instance',
  summary: 'Choose where state belongs, follow class and object initialization, and distinguish a hidden static method from an overridden instance method.',
  prerequisites: 'Classes and Objects plus Constructors for field initialization; Inheritance and Polymorphism for the final hiding/dispatch comparison. The counter itself needs no framework or server.',
  objectives: [
    'Separate one class variable from each object’s own instance fields and explain an explicit receiver.',
    'Trace class initialization, repeated instance initialization and later operations.',
    'Predict static hiding beside runtime instance dispatch without assuming singleton, immutability or thread safety.',
  ],
  problem: 'A study tool needs a separate completion count for every topic and a shared count of completed StudyCounter constructor bodies. Making both fields static makes one topic’s work appear on every topic. Making both instance fields loses the shared construction count. Which member belongs to the class, and which needs a particular object?',
  explanation: [
    { title: 'Choose the state boundary', text: 'StudyCounter.created is a class variable. Its two objects contribute to that one count; the FocusCounter constructor invokes the same base constructor and does not declare another created field. Each object has its own id, topic and completed fields. Static state belongs to a particular runtime class, not to one universal application-wide namespace: classes defined by different defining class loaders can have separate state. A static field does not prevent creating multiple objects, so it does not establish a singleton.' },
    { title: 'A static method has no implicit this', text: 'createdCount can read class state without any StudyCounter instance. complete and description use an instance receiver. A static method cannot directly use this or an unqualified instance field, but MembersDemo.completeOne can call counter.complete using an explicit parameter. Both first.complete() and completeOne(first) update the same first object. Choose an instance operation when the behavior belongs to an object; a stateless helper can be static. Moving a stateful operation to static does not remove its need for a receiver.' },
    { title: 'Separate class initialization from object construction', text: 'The first createdCount call initializes StudyCounter before its body runs. initializeClass records its event in a separate InitializationLog, which can be inspected without actively using StudyCounter. The log’s list is initialized before record adds an event. Each new then executes the base instance field initializer before that base constructor body. In a hierarchy, superclass construction precedes subclass instance initialization. The trace records this example’s base initializer and constructor events; FocusCounter adds no initializer event. Later completion calls do not run constructors again. This is a teaching trace, not a JVM memory layout or an exhaustive log of every initialization phase.' },
    { title: 'Recognize the constant exception', text: 'DEFAULT_MINUTES is a static final primitive initialized with a constant expression, so it is a constant variable. Reading that constant does not itself require StudyCounter initialization. The main prints it before actively using createdCount. New instances, invoking a class’s declared static method, and reading or assigning its nonconstant static fields can trigger initialization. Loading a class and initializing it are separate events. A static final reference initialized with new ArrayList is not a constant variable and does not make the list immutable; InitializationLog’s EVENTS list changes as construction proceeds.' },
    { title: 'Hide static methods, override instance methods', text: 'FocusCounter.category hides StudyCounter.category. The intentionally instance-qualified calls in throughBase and throughChild select category from their parameter’s declared type. Both description calls dispatch to the runtime FocusCounter override. Normal code should name the class for a static call so that choice is visible. Fields also follow declaration-based lookup rather than instance-method dispatch; this example avoids hiding fields because it obscures which state is being changed.' },
    { title: 'Keep lifetime and synchronization decisions explicit', text: 'Static data can survive between requests or tests while its class remains initialized. It is not persistence across JVM restarts. The demo uses a fresh JVM for its recorded main and fresh class loaders in its state tests. Java coordinates class initialization, but later created++ and completed updates are not thereby synchronized. The counter and trace are intentionally single-threaded. Private and final have separate roles: privacy controls access, and final prevents reassignment; neither makes a mutable object’s operations automatically safe for concurrent callers.' },
  ],
  visual: {
    title: 'Compare class state with two object histories',
    summary: 'Recorded Java state · one base class counter · two independent completion counts',
    snapshots,
  },
  code: [
    { filename: 'memberstate/InitializationLog.java', source: logSource },
    { filename: 'memberstate/StudyCounter.java', source: counterSource },
    { filename: 'memberstate/FocusCounter.java', source: focusSource },
    { filename: 'memberstate/MembersDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out memberstate/InitializationLog.java memberstate/StudyCounter.java memberstate/FocusCounter.java memberstate/MembersDemo.java\njava -cp out com.lld.learning.examples.memberstate.MembersDemo',
  quiz: {
    prompt: 'After constructing first and second, calling first.complete() and then MembersDemo.completeOne(first), what are created, first.completed and second.completed?',
    options: [
      { id: 'all-shared', text: '2, 2, 2', feedback: 'Only created is a class variable. Each object has its own completed field, and both calls receive first.' },
      { id: 'separate-state', text: '2, 2, 0', feedback: 'Correct. Both base constructor bodies complete, sharing created = 2. Both completion calls update first, leaving second at zero.', correct: true },
      { id: 'helper-no-object', text: '2, 1, 0', feedback: 'A static helper has no implicit this, but it can invoke an instance method through its explicit counter parameter.' },
    ],
  },
  exercise: 'Add resetCompleted() as an instance operation. Construct two counters, complete each a different number of times, reset only the first, and verify that second and createdCount are unchanged by the reset. Add a static resetOne(StudyCounter counter) helper that delegates through its explicit receiver; explain why a direct completed = 0 in that helper is invalid. Predict both category and description through a StudyCounter reference to FocusCounter. Finally explain how moving completed to a static field would break isolation and why marking it final would not be a usable fix for a changing count.',
  rubric: [
    'After a reset, only the chosen receiver has completed = 0; the construction count and the other object’s completed value remain unchanged.',
    'The static helper delegates to counter.resetCompleted(); it does not attempt to use this or an unqualified instance field.',
    'Predict study from the base-declared category lookup and focus: Methods from the overridden description.',
    'Explain that mutable per-topic progress needs instance state here; static shares the field, while final forbids later reassignment of an int.',
    'Keep reset a later operation, with no new constructor trace event; discuss synchronization separately if concurrent callers are introduced.',
  ],
  pitfalls: [
    'Static does not mean constant, singleton, immutable, persistent or thread-safe. The example has mutable class state and two real objects.',
    'final List<String> fixes the reference, not the list contents. initializationTrace returns the log’s detached, unmodifiable List.copyOf snapshot rather than exposing EVENTS.',
    'Class initialization is coordinated by the JVM; it does not put a lock around subsequent increments. No concurrency guarantee follows from the recorded single-threaded outcomes.',
    'Calling a static method through an object variable is legal but misleading. Even a null variable can qualify a static call without supplying an instance receiver; an instance call through null fails.',
    'A rejected constructor still runs the preceding instance field initializer, so a trace event may remain even though no object reference returns. Construction failure is not rollback.',
    'created counts completed base constructor bodies in this small demo, not live objects. A later subclass constructor failure does not undo that increment, and garbage collection does not decrement it.',
    'The recorded trace observes only explicit teaching events. Reading the compile-time constant needs a separate fresh-class initialization check to establish that it does not initialize the class.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Inspect Parking Lot’s class constants and repository instances',
    text: 'HourlyPricingStrategy declares private static final primitive rate constants and exposes the instance operation calculatePrice(Ticket). ParkingLotRepository declares its maps, ticketCounter, spotLock and ticketLock as instance fields; generateTicketNumber increments that repository’s counter under its ticketLock. PricingStrategyFactory keeps an instance strategies map and receives strategy objects through its constructor. These are verified member declarations and operations. A shared Spring bean is an application scope choice, not evidence that its fields are static; final map references are not immutable maps. These files do not demonstrate static hiding, the lesson’s initialization trace or persistence beyond a running process. The repository’s explicit locking supplies synchronization, not the static or instance keyword.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
    ],
  },
  summaryPoints: [
    'Use class members for class-level state or operations and instance members for a particular object’s state; static helpers may receive explicit objects.',
    'Follow class initialization separately from each construction. Constant-variable reads are an exception to active-use initialization.',
    'Static methods hide; instance methods override. State sharing, object count, mutability, persistence and synchronization are separate decisions.',
  ],
  references: [
    { title: 'JLS 17 §8.3.1.1: Class variables and instance variables', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.3.1.1' },
    { title: 'JLS 17 §8.4.3.2: Static methods and static contexts', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.3.2' },
    { title: 'JLS 17 §8.4.8.2: Hiding by class methods', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.8.2' },
    { title: 'JLS 17 §15.11.1: Field lookup and the expression’s type', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.11.1' },
    { title: 'JLS 17 §12.4.1: Initialization triggers and constant variables', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4.1' },
    { title: 'JLS 17 §12.5: Instance initialization order', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.5' },
    { title: 'JLS 17 §4.12.4: Final variables and constant variables', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.4' },
    { title: 'JVMS 17 §5.3: Runtime class identity and defining loaders', url: 'https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html#jvms-5.3' },
  ],
};
