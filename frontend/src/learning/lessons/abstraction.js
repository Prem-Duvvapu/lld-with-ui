import classModel from '../class-models/abstraction';
import contractSource from '../examples/TopicLabel.java?raw';
import baseSource from '../examples/BoundedTopicLabel.java?raw';
import ellipsisSource from '../examples/EllipsisTopicLabel.java?raw';
import clippedSource from '../examples/ClippedTopicLabel.java?raw';
import demoSource from '../examples/AbstractionDemo.java?raw';
import output from '../examples/abstraction-output.txt?raw';
import snapshots from '../examples/abstraction-snapshots.json';

export default {
  classModel,
  id: 'abstraction',
  summary: 'Choose an operation a caller can rely on, hide irrelevant implementation decisions, and compare an interface contract with a shared abstract-class implementation.',
  prerequisites: 'Encapsulation and Interfaces. Read fields, constructors and interface calls; this example explains extends, super and the abstract method it introduces.',
  objectives: [
    'Describe abstraction as selecting useful behavior and its promises from a caller’s point of view.',
    'Explain why an interface and an abstract class can work together without being interchangeable.',
    'Trace a concrete method, private state, a base constructor and an abstract method through one object.',
    'Find a semantic contract violation that compiles successfully.',
  ],
  problem: 'A study sidebar needs compact topic labels. One style signals omitted text with dots; another keeps as many starting characters as possible. The sidebar should ask for a label without knowing substring offsets, validation order or how a style stores its limit. What should its contract promise?',
  explanation: [
    { title: 'Decide what matters to this caller', text: 'TopicLabel exposes render(topic). Its comment promises to reject null or blank input, strip surrounding whitespace, preserve text that fits, and otherwise return a nonblank label within the configured limit. The demo configures two styles with a limit of 8. show needs only the rendered label, so it accepts TopicLabel and never inspects concrete classes. The limit applies to render’s result; show adds its own Study: prefix outside that budget.' },
    { title: 'Distinguish abstraction from encapsulation', text: 'Abstraction chooses the useful operation and its meaning: give this sidebar a compact label. Encapsulation controls access to the implementation: the limit is a private final field, and callers cannot invoke the protected shortening hook through TopicLabel. Related techniques serve different questions. A concrete class with a well-chosen API can provide abstraction too; the abstract keyword alone does not create a useful contract.' },
    { title: 'Use an interface for the caller’s role', text: 'TopicLabel describes a capability without prescribing a superclass or storing per-object state. Another class could implement it directly using a different internal design. Java 17 interfaces can have default, static and private methods, and their fields are constants; they have no instance constructors or per-instance fields. They are not limited to method signatures, but they cannot hold this object’s maxChars field.' },
    { title: 'Use an abstract class for genuinely shared implementation', text: 'BoundedTopicLabel implements TopicLabel and stores maxChars. Its protected constructor validates that limit when a concrete subclass calls super(maxChars); no separate base object is created. Its public final render method is concrete: it validates, strips and checks length. Only shorten has no body and is abstract. EllipsisTopicLabel and ClippedTopicLabel extend the base and implement that step. You cannot directly instantiate the abstract base, although its constructor and concrete method execute as part of a concrete object’s behavior.' },
    { title: 'Keep behavioral promises testable', text: 'For a long topic, inherited render calls the concrete object’s shorten implementation. For a short topic, the common method returns the stripped text directly. final prevents subclasses from overriding render, but it does not prove that shorten returns a valid result. A subclass returning the entire long text would compile and violate the contract. Tests must cover each implementation’s behavior as well as compiler rules.' },
    { title: 'Choose the smallest useful boundary', text: 'The interface lets the caller stay independent of the base class; the base avoids repeating a real validation and length-checking sequence. Java allows a class to extend only one class, so requiring that base everywhere would consume that inheritance choice. A helper object or function can also share code without inheritance. Use a base when these related implementations benefit from its shared rules, rather than adding a hierarchy just to wrap one method.' },
  ],
  visual: {
    title: 'Follow a contract through shared and varying behavior',
    summary: 'One caller contract · shared validation and state · two shortening choices',
    snapshots,
  },
  code: [
    { filename: 'TopicLabel.java', source: contractSource },
    { filename: 'BoundedTopicLabel.java', source: baseSource },
    { filename: 'EllipsisTopicLabel.java', source: ellipsisSource },
    { filename: 'ClippedTopicLabel.java', source: clippedSource },
    { filename: 'AbstractionDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out TopicLabel.java BoundedTopicLabel.java EllipsisTopicLabel.java ClippedTopicLabel.java AbstractionDemo.java\njava -cp out com.lld.learning.examples.AbstractionDemo',
  quiz: {
    prompt: 'For show(new EllipsisTopicLabel(8), " Encapsulation "), which result and call path are correct?',
    options: [
      { id: 'shared-only', text: 'Study: Encapsul; the base class always clips at 8', feedback: 'The base checks length but delegates long text to shorten. Clipping is the other concrete class’s implementation.' },
      { id: 'hook', text: 'Study: Encap...; the base strips and checks, then the subclass shortens', feedback: 'Correct. The constructor stores 8, inherited render strips the input, and EllipsisTopicLabel.shorten reserves three characters for dots. show uses only TopicLabel.', correct: true },
      { id: 'cannot-run', text: 'It cannot run because the abstract base has no constructor', feedback: 'An abstract class can declare a constructor. The concrete subclass calls it with super(8); only direct construction of the abstract class is forbidden.' },
    ],
  },
  exercise: 'A proposed TailTopicLabel extends BoundedTopicLabel, but its shorten method returns the full text because “render is final, so the contract is already safe.” Diagnose the error. Implement a tail style that returns "..." followed by the last maxChars - 3 characters. At limit 8, Encapsulation should become ...ation. Pass it to the unchanged show caller. Test fitting text, exactly-at-limit text, long text, null/blank input and the minimum supported limit. Then decide whether a new style that already extends an unrelated class should implement TopicLabel directly or force a change to this base.',
  rubric: [
    'Explain why final locks the render implementation but cannot validate an arbitrary result returned by shorten.',
    'Override the protected hook, call super(maxChars) in the constructor, and preserve all input and output promises without changing show.',
    'Check ...ation at limit 8 and ...n at limit 4 for Encapsulation; verify that fitting text is preserved after stripping.',
    'Test both output lengths and invalid-input behavior, including limit 3 rejection, rather than only checking that the subclass compiles.',
    'Keep the caller typed as TopicLabel; justify direct implementation or delegated shared validation when another superclass is already needed.',
  ],
  pitfalls: [
    'Hiding all detail is not the aim: callers still need the input rules, output meaning and failure behavior. A vague render method with no promises is a weak abstraction.',
    'An abstract class can mix state, constructors, concrete methods and abstract methods; it may even have no abstract methods. A concrete subclass must supply any remaining abstract methods.',
    'An interface is not required for every class, and an abstract base is not required for every interface. Extra types impose navigation and maintenance costs.',
    'Returning the right type is insufficient. A shorten implementation returning null, blank text or too many characters breaks the contract despite compiling.',
    'The small example measures UTF-16 code units with String.length and substring. It is not pixel-width layout or Unicode grapheme-aware shortening and can split a surrogate pair. A production label system needs a deliberate text-measurement policy.',
    'Abstraction does not make this a secure data-hiding boundary, a persistent store or a concurrency mechanism. The example only formats strings.',
  ],
  module: {
    path: '/coffee-machine',
    title: 'Inspect Coffee Machine’s contract and abstract base',
    text: 'CoffeeComponent exposes description, price and required ingredients. BaseCoffee implements it directly. CoffeeDecorator also implements it, keeps a wrapped CoffeeComponent in a constructor-validated field, and supplies the concrete getRequiredIngredients method by copying the wrapped recipe and merging the abstract getAddedIngredients result. ExtraMilkDecorator supplies that hook and its description/price behavior. This is an actual interface plus shared abstract implementation; the label example shares that language mechanism without reproducing coffee recipes or proving the machine’s concurrency behavior.',
    sources: [
      'backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeComponent.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/BaseCoffee.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeDecorator.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/ExtraMilkDecorator.java',
    ],
  },
  summaryPoints: [
    'Begin with the caller’s useful operation and behavioral promises, then choose what implementation details it can ignore.',
    'An interface defines the caller’s role; an abstract class can optionally share instance state, construction and implemented behavior among related classes.',
    'Trace both common and varying behavior, and test semantic promises that the compiler cannot enforce.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Abstract Classes', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.1.1.1' },
    { title: 'Java 17 Language Specification: Interfaces', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html' },
    { title: 'Oracle Java Tutorial: Abstract Methods and Classes', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html' },
  ],
};
