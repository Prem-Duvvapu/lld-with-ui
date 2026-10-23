import leakySource from '../examples/LeakyShelf.java?raw';
import shelfSource from '../examples/ReadingShelf.java?raw';
import demoSource from '../examples/EncapsulationDemo.java?raw';
import output from '../examples/encapsulation-output.txt?raw';
import snapshots from '../examples/encapsulation-snapshots.json';

export default {
  id: 'encapsulation',
  summary: 'Protect an invariant through operations and detached read results. Compare that boundary with a public final list that still permits invalid mutations.',
  prerequisites: 'Classes and Objects, plus Access Modifiers. Read a list operation and an exception path in Java; the example explains the snapshot behavior.',
  objectives: [
    'State an invariant and identify every route that can change the underlying state.',
    'Show why public final List does not prevent callers from mutating its contents.',
    'Compare a private mutable collection, an unmodifiable snapshot and full object immutability.',
  ],
  problem: 'A reading shelf accepts nonblank topics and holds at most its configured capacity. A caller needs to inspect its topics without bypassing those rules. Is a public final list enough?',
  explanation: [
    { title: 'Start with the rule being protected', text: 'ReadingShelf requires a positive capacity. Every accepted topic is nonblank, and the list’s size cannot exceed capacity. The class owns the list, validates addTopic before mutation and offers a read operation. The invariant explains the API; simply adding getters and setters would not establish it.' },
    { title: 'Find the bypass in the counterexample', text: 'LeakyShelf.addTopic validates input, but callers can reach its public list directly and insert an empty string. final fixes the field’s reference after initialization; it does not freeze the ArrayList. A field setter would not be needed to break this design.' },
    { title: 'Return a detached read result', text: 'getTopics uses List.copyOf to return an unmodifiable snapshot. Calling add on that result throws UnsupportedOperationException. Later valid changes to the shelf do not change the earlier snapshot. Strings are immutable elements here; a list of mutable objects would need a separate decision about copying or exposing those elements.' },
    { title: 'Keep change inside the boundary', text: 'The shelf can still change through addTopic, so ReadingShelf is not an immutable object. Invalid input and a full shelf are rejected before modifying the stored list. This small example is single-threaded: private fields and a copied read result do not make concurrent check-then-add operations atomic.' },
  ],
  visual: { title: 'Follow the mutation boundary', summary: 'A deliberate public-field counterexample · a private shelf with a tested invariant', snapshots },
  code: [
    { filename: 'LeakyShelf.java', source: leakySource },
    { filename: 'ReadingShelf.java', source: shelfSource },
    { filename: 'EncapsulationDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out LeakyShelf.java ReadingShelf.java EncapsulationDemo.java\njava -cp out com.lld.learning.examples.EncapsulationDemo',
  quiz: {
    prompt: 'After saving snapshot = shelf.getTopics(), what happens when the shelf accepts a second topic and the caller tries snapshot.add("")?',
    options: [
      { id: 'live', text: 'The snapshot follows the shelf, and add inserts the blank topic', feedback: 'That describes a leaked mutable alias. List.copyOf returns an unmodifiable snapshot instead.' },
      { id: 'snapshot', text: 'The snapshot keeps its original topic, and add throws UnsupportedOperationException', feedback: 'Correct. The shelf can change through its API, while the earlier snapshot remains separate and cannot be structurally modified.', correct: true },
      { id: 'immutable', text: 'The whole ReadingShelf becomes immutable after calling getTopics', feedback: 'The shelf still accepts valid additions through addTopic. An unmodifiable read result does not freeze its owner.',
      },
    ],
  },
  exercise: 'Add removeTopic to your own copy of ReadingShelf. Decide how a missing topic is reported, keep nonblank-input validation and preserve the size invariant. Save a snapshot before removal and prove it stays unchanged afterward. Then explain what extra risk appears if topics become mutable Topic objects instead of Strings.',
  rubric: [
    'State the invariant and validate before changing the private collection.',
    'Keep writes inside operations instead of returning the backing list or adding a raw list setter.',
    'Test successful removal, missing/blank input and the old snapshot after removal.',
    'Explain shallow versus deeper defensive copying without claiming that final or List.copyOf freezes arbitrary element objects.',
  ],
  pitfalls: [
    'A private field is useful only if the public API preserves the intended rules; an unrestricted setter or leaked collection can still break them.',
    'Unmodifiable does not always mean detached. An unmodifiable view over a mutable list may reflect later writes; this example deliberately uses List.copyOf.',
    'The shelf permits repeated nonblank topic strings. Uniqueness is not an invariant in this example, so do not infer it from the UI illustration.',
    'Neither example has persistence or thread synchronization. The production modules need their own lifecycle and concurrency controls.',
  ],
  module: {
    path: '/coffee-machine',
    title: 'Inspect Coffee Machine ingredient copies',
    text: 'BaseCoffee copies the input ingredient map into its own EnumMap and returns a fresh EnumMap from getRequiredIngredients. A caller can modify that returned map without changing the base recipe. Unlike the shelf’s unmodifiable list, this map copy is mutable; detachment and mutability are different properties. Inspect the decorator composition tests and keep this local boundary separate from CoffeeMachine’s larger workflow.',
    sources: [
      'backend/src/main/java/com/lld/coffeemachine/decorator/BaseCoffee.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeComponent.java',
      'backend/src/test/java/com/lld/coffeemachine/CoffeeDecoratorCompositionTest.java',
    ],
  },
  summaryPoints: [
    'Encapsulation puts state changes behind an API that protects explicit invariants.',
    'A final reference may point to mutable data. Check both write paths and returned aliases.',
    'Distinguish a mutable owner, a detached unmodifiable snapshot and the mutability of its elements.',
  ],
  references: [
    { title: 'Java 17 List API: copyOf', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html#copyOf(java.util.Collection)' },
    { title: 'Oracle Java Tutorial: Immutable Objects', url: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/immutable.html' },
  ],
};
