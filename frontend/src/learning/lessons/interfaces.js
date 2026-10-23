import contractSource from '../examples/MessageFormatter.java?raw';
import plainSource from '../examples/PlainFormatter.java?raw';
import taggedSource from '../examples/TaggedFormatter.java?raw';
import demoSource from '../examples/InterfaceDemo.java?raw';
import output from '../examples/interfaces-output.txt?raw';
import snapshots from '../examples/interfaces-snapshots.json';

export default {
  id: 'interfaces',
  duration: '15–20 minutes',
  summary: 'Describe an operation a caller needs, supply two implementations, and follow a call through an interface-typed reference.',
  prerequisites: 'Classes and Objects: constructing an object, reference variables and instance methods. Prior design-pattern knowledge is unnecessary.',
  objectives: [
    'Declare a small interface and implement its required method in two classes.',
    'Distinguish the reference’s declared type from the object’s runtime class.',
    'Test the shared behavioral contract as well as the different outputs.',
  ],
  problem: 'A study app presents messages in two styles. Some screens need plain text; others need an LLD tag. How can the caller request formatting without branching on every formatter class?',
  explanation: [
    { title: 'Name the operation the caller needs', text: 'MessageFormatter declares format(String): String. Its comment adds a behavioral promise: reject null or blank text and return formatted text. The method’s signature is checked by Java; the promised input behavior still needs implementation and tests. The interface does not choose the screen, construct an object or run a formatter by itself.' },
    { title: 'Implement the contract', text: 'PlainFormatter implements MessageFormatter and returns trimmed text. TaggedFormatter implements the same interface and adds its constructor-supplied tag. Both provide a public format method with @Override. Their internals differ, but either can be passed to present(MessageFormatter, String).' },
    { title: 'Follow the reference to the runtime object', text: 'The demo first assigns a PlainFormatter to a MessageFormatter variable, then assigns a TaggedFormatter. Calling formatter.format invokes the corresponding object’s implementation. present stays unchanged and contains no instanceof or concrete-class switch. Reassigning the reference does not modify the first formatter into the second one.' },
    { title: 'Keep the declared API small', text: 'TaggedFormatter has getTag(), but a variable declared as MessageFormatter exposes only that interface’s members and applicable Object methods. present needs format, so it should not depend on getTag. Choose a concrete type when a caller truly needs its extra API rather than adding unrelated operations to every implementation.' },
  ],
  visual: { title: 'One call site, different implementations', summary: 'One formatting contract · two tested implementations', snapshots },
  code: [
    { filename: 'MessageFormatter.java', source: contractSource },
    { filename: 'PlainFormatter.java', source: plainSource },
    { filename: 'TaggedFormatter.java', source: taggedSource },
    { filename: 'InterfaceDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out MessageFormatter.java PlainFormatter.java TaggedFormatter.java InterfaceDemo.java\njava -cp out com.lld.learning.examples.InterfaceDemo',
  quiz: {
    prompt: 'When formatter refers to new TaggedFormatter("LLD"), what does present(formatter, "  Hello  ") return?',
    options: [
      { id: 'plain', text: 'Hello, because the variable is declared as MessageFormatter', feedback: 'The declared type determines which operations you may call. The runtime object supplies the overriding format implementation.' },
      { id: 'tagged', text: '[LLD] Hello, through TaggedFormatter.format', feedback: 'Correct. The same interface call reaches the tagged implementation; present needs no concrete-class branch.', correct: true },
      { id: 'abstract', text: 'It cannot run because an interface method has no implementation', feedback: 'You cannot construct this interface directly, but the variable refers to a concrete TaggedFormatter that implements format.' },
    ],
  },
  exercise: 'Add a third implementation, BracketFormatter, that trims valid text and surrounds it with square brackets. Use it through MessageFormatter and the unchanged present method. Run the same null/blank tests against all three implementations. Explain why adding getTag to MessageFormatter would make the contract worse for PlainFormatter.',
  rubric: [
    'Implement MessageFormatter and mark the public format method with @Override.',
    'Call it through the interface type without changing present or branching on the concrete class.',
    'Verify both the new output and the common null/blank rejection behavior.',
    'Explain why matching a signature does not prove substitutability if one implementation silently accepts forbidden input.',
  ],
  pitfalls: [
    'This interface cannot be instantiated directly. Construct an implementing class and store its reference in an interface-typed variable.',
    'A Java interface can also declare default, static and private methods and constants; it has no per-instance fields. This example deliberately needs only one abstract operation.',
    'An interface does not automatically provide thread safety, dependency injection, validation or a design pattern. Those require actual code and usage.',
    'A shared type does not require identical outputs, but implementations must honor the agreed meaning and input contract.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Trace a policy call in Parking Lot',
    text: 'PricingStrategy declares calculatePrice(Ticket). HourlyPricingStrategy and FlatRatePricingStrategy implement it, and PricingStrategyFactory supplies the selected policy. Inspect how the repository calls that contract to calculate an exit charge. The formatter demo teaches the same substitution mechanism; it does not reproduce the module’s pricing rules or prove its concurrency safety.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
    ],
  },
  summaryPoints: [
    'An interface gives callers a declared operation; implementing classes supply its behavior.',
    'The reference type and runtime class have different roles. Follow the object to predict an overriding method call.',
    'Test the semantic contract across implementations rather than assuming a shared signature is enough.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Interfaces', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html' },
    { title: 'Oracle Java Tutorial: Interfaces', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html' },
    { title: 'Oracle Java Tutorial: Implementing an Interface', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/usinginterface.html' },
  ],
};
