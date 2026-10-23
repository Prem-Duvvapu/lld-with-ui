import baseSource from '../examples/LearningSession.java?raw';
import sessionSource from '../examples/FocusedSession.java?raw';
import demoSource from '../examples/ConstructorDemo.java?raw';
import output from '../examples/constructors-output.txt?raw';
import snapshots from '../examples/constructors-snapshots.json';

export default {
  id: 'constructors',
  summary: 'Create a valid initial state, follow this/super constructor delegation, and distinguish initialization from a later operation on the same object.',
  prerequisites: 'Classes and Objects: fields, references and method calls. The example introduces a subclass only to show constructor order; the full inheritance lesson comes later.',
  objectives: [
    'Recognize a constructor by its class name and absence of a return type.',
    'Follow a convenience constructor through this(...) and then super(...).',
    'Reject invalid construction and explain why throwing does not roll back earlier side effects.',
  ],
  problem: 'A focused study session needs a topic and a positive duration. Most sessions use 25 minutes, but some need a custom duration. How can both creation paths initialize the same fields consistently?',
  explanation: [
    { title: 'Separate allocation and initialization', text: 'A new expression creates an object and invokes its selected constructor. Fields receive their default values before explicit initialization. The demo receives a session reference only after construction completes normally. A declaration such as void FocusedSession(...) would be a method, not a constructor.' },
    { title: 'Put shared initialization on one path', text: 'The two-argument FocusedSession constructor delegates to the full constructor with a 25-minute default. That full constructor calls LearningSession’s constructor, validates minutes and sets the duration. The convenience constructor then records its completion. In Java 17, an explicit this(...) or super(...) constructor invocation must be the first statement. Constructor delegation must not form a cycle.' },
    { title: 'Read an actual trace', text: 'The List<String> parameter collects teaching events. The demo’s trace records base topic initialization, focused duration initialization, then convenience-constructor completion. The illustration inspects prefixes of that recorded trace; it does not expose a partly initialized object to another caller. Access modifiers and subclass behavior are explored in their own lessons.' },
    { title: 'Validate creation and later changes separately', text: 'The base constructor rejects a missing topic; the full constructor rejects a nonpositive duration. extend(5) is a later operation on the existing session. It validates its input too, and addExact prevents integer overflow from assigning a wrapped duration. Declaring a constructor does not automatically validate future mutations.' },
  ],
  visual: { title: 'Follow construction, then a later update', summary: 'One returned session · an ordered Java constructor trace', snapshots },
  code: [
    { filename: 'LearningSession.java', source: baseSource },
    { filename: 'FocusedSession.java', source: sessionSource },
    { filename: 'ConstructorDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out LearningSession.java FocusedSession.java ConstructorDemo.java\njava -cp out com.lld.learning.examples.ConstructorDemo',
  quiz: {
    prompt: 'Which events are recorded by new FocusedSession("Objects", trace) before the demo receives its reference?',
    options: [
      { id: 'outer-first', text: 'Convenience constructor, then full constructor, then base constructor', feedback: 'The convenience constructor delegates before executing its remaining statement. The full constructor first delegates to the base.' },
      { id: 'base-first', text: 'Base topic, focused duration, then convenience completion', feedback: 'Correct. super(...) completes before the full constructor continues; this(...) completes before the convenience constructor continues.', correct: true },
      { id: 'two-objects', text: 'Two separate session objects, one for each FocusedSession constructor', feedback: 'Constructor delegation initializes the same new object. It does not allocate an extra session for each constructor body.' },
    ],
  },
  exercise: 'Add a convenience creation path that uses a 45-minute default, while retaining one duration-validation path. Test both creation paths, a blank topic and a nonpositive duration. Explain why the base event remains in the trace when the derived constructor rejects minutes. Then show that extending a session does not run its constructors again.',
  rubric: [
    'Delegate to the existing full constructor instead of copying its validation and assignments.',
    'Predict and verify the base/full/convenience event order.',
    'Distinguish failure to return a constructed object from rollback of an already-written trace event.',
    'Test a valid later extension, invalid extension and overflow without changing the prior duration.',
  ],
  pitfalls: [
    'A compiler-supplied no-argument constructor exists only when the class declares no constructors. FocusedSession has declared constructors, so new FocusedSession() is not available.',
    'A constructor exception does not undo logging or other side effects already performed by a base constructor. The trace list is a teaching aid, not a transaction mechanism.',
    'Avoid publishing this or calling overridable behavior during construction. This example records values directly and returns the reference after initialization.',
    'This example is single-threaded. A validated initial state and private fields do not make subsequent updates thread-safe.',
  ],
  module: {
    path: '/atm',
    title: 'Follow ATM transaction construction',
    text: 'DepositTransaction calls Transaction’s constructor before assigning depositedNotes. Transaction initializes shared record fields, a timestamp and its initial status. Follow the super(...) call and compare the responsibilities of the two constructors. These classes are transaction records; they do not contain a Transaction.execute template algorithm, and this connection does not prove every input is validated by their constructors.',
    sources: [
      'backend/src/main/java/com/lld/atm/model/Transaction.java',
      'backend/src/main/java/com/lld/atm/model/DepositTransaction.java',
    ],
  },
  summaryPoints: [
    'Use constructors to establish an initial state and delegation to share that work.',
    'In the displayed Java 17 example, base initialization completes before derived initialization and then convenience-constructor completion.',
    'Later operations need their own validation. Construction failure does not roll back external side effects.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Constructor Declarations', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.8' },
    { title: 'Oracle Java Tutorial: Providing Constructors', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/constructors.html' },
  ],
};
