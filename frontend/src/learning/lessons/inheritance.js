import classModel from '../class-models/inheritance';
import resourceSource from '../examples/inheritance/InheritanceResource.java?raw';
import videoSource from '../examples/inheritance/InheritanceVideo.java?raw';
import playlistSource from '../examples/inheritance/InheritancePlaylist.java?raw';
import demoSource from '../examples/inheritance/InheritanceDemo.java?raw';
import output from '../examples/inheritance-output.txt?raw';
import snapshots from '../examples/inheritance-snapshots.json';

export default {
  classModel,
  id: 'inheritance',
  summary: 'Model a video as a learning resource, follow superclass initialization, and distinguish inherited methods from overrides. Compare that is-a relationship with a playlist that holds a resource.',
  prerequisites: 'Classes and Objects, Access Modifiers, and Constructors and Initialization. Know how new, private fields and a super(...) constructor call work.',
  objectives: [
    'Justify an is-a relationship using the behavior promised to callers, rather than shared fields alone.',
    'Trace superclass constructor delegation and identify inherited behavior and an overriding instance method.',
    'Separate the declared reference type from runtime dispatch, and choose composition when the relationship is has-a.',
  ],
  problem: 'A study app displays a summary for each resource. A video has a title like any resource, plus a positive duration. A playlist needs to display its next resource. Should both video and playlist extend the resource class simply because both need a summary?',
  explanation: [
    { title: 'Start with a narrow is-a promise', text: 'InheritanceResource promises a nonblank title and a description containing that title. InheritanceVideo extends InheritanceResource: a video can be passed wherever this resource API is required, keeping that promise while adding duration information. Java accepts the subtype relationship through extends; deciding whether it makes sense still depends on the model and its contract. A shared title field alone is insufficient justification.' },
    { title: 'Initialize the same object through the superclass', text: 'The video constructor starts with super(title, trace). The base constructor trims and validates title, stores it privately and records its event. The video then checks minutes and records its own event. There is one new video object, not a separate base object. Constructors are not inherited. Omitting this explicit call would request super(), but InheritanceResource has no no-argument constructor. In Java 17 an explicit constructor delegation must come first.' },
    { title: 'Inherit a method without exposing its field', text: 'InheritanceVideo does not declare getTitle: it inherits the public method, whose base-class implementation reads the private title state. The subclass cannot access title directly; that private member is not inherited. getTitle is final, so subclasses cannot override it. Keeping state private avoids coupling every subtype to its representation. Every class except Object has one direct superclass; InheritanceResource implicitly extends Object. A class can implement multiple interfaces.' },
    { title: 'Override deliberately and reuse super behavior', text: 'The video declares public String describe() with @Override. It keeps the base signature and extends the summary using super.describe(), which selects the superclass implementation rather than recursively calling the video override. The annotation asks the compiler to check that a matching inherited method exists. An accidental describe(int) would be a different overload; it would not replace describe(). Overrides cannot reduce access, return an incompatible type or broaden checked exceptions.' },
    { title: 'Ask two questions at a call site', text: 'In InheritanceResource resource = video, the declared type controls which operations compile: getTitle and describe are available, but getMinutes is not. The referenced object remains an InheritanceVideo. Calling present(resource) reaches its overriding describe at runtime; present(plain) reaches the base implementation. The assignment copies a reference and creates no object. This is an introduction to instance-method dispatch; fields and static methods do not follow this overriding rule.' },
    { title: 'Use composition for the playlist', text: 'The playlist has a next resource and delegates to next.describe(). It has no resource title of its own and does not promise to be a learning resource, so it does not extend InheritanceResource. This is composition in the everyday object-design sense: combine objects through a field. It does not assert UML exclusive ownership or tied lifetimes. Likewise, extending ArrayList just to reuse storage would expose list operations whether or not they belong in a playlist API. A private collection would let the playlist choose its own operations.' },
    { title: 'Keep the behavioral obligation visible', text: 'A legal override could still return an empty description or throw for a title that the base contract accepts. The compiler would accept that code but callers would lose the promised behavior. The tests check this lesson’s title/description contract across both resource classes; extends does not automatically establish the Liskov Substitution Principle. Prefer a small stable base API, and consider composition or an interface when capabilities vary independently.' },
  ],
  visual: { title: 'From construction to an inherited call', summary: 'One video object · a base API · a separate playlist', snapshots },
  code: [
    { filename: 'inheritance/InheritanceResource.java', source: resourceSource },
    { filename: 'inheritance/InheritanceVideo.java', source: videoSource },
    { filename: 'inheritance/InheritancePlaylist.java', source: playlistSource },
    { filename: 'inheritance/InheritanceDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out inheritance/InheritanceResource.java inheritance/InheritanceVideo.java inheritance/InheritancePlaylist.java inheritance/InheritanceDemo.java\njava -cp out com.lld.learning.examples.inheritance.InheritanceDemo',
  quiz: {
    prompt: 'After InheritanceResource resource = video, what does present(resource) return, and can resource.getMinutes() compile?',
    options: [
      { id: 'base', text: 'Resource: Inheritance; getMinutes does not compile', feedback: 'The declared type limits the available API, but does not select the base describe implementation. The runtime video supplies its override.' },
      { id: 'dispatch', text: 'Resource: Inheritance (video, 12 min); getMinutes does not compile', feedback: 'Correct. The override follows the runtime object; available methods follow the declared type. The video and resource references still identify the same object.', correct: true },
      { id: 'extra-api', text: 'Resource: Inheritance (video, 12 min); getMinutes compiles', feedback: 'The output is right, but InheritanceResource does not declare getMinutes. Use the video reference when you actually need the video-specific API.' },
    ],
  },
  exercise: 'Add an ArticleResource subclass with a positive wordCount. Delegate title initialization to super, inherit getTitle and override describe to include both the title and word count. Pass it through the unchanged present method and into InheritancePlaylist. Predict the constructor trace and outputs before running them. Test null/blank titles, zero/negative word counts, and valid titles with spaces. Explain why an ArticleResource is a resource in this model while a playlist only has one, and give a compiling override that would violate the base description promise.',
  rubric: [
    'Use one superclass and super(...) to initialize title, without redeclaring or directly accessing the private title field.',
    'Use @Override with the exact describe() signature, preserve its title promise, and leave present unchanged.',
    'Verify initialization order, trimmed inherited title and the article summary through a base-typed reference and playlist delegation.',
    'Reject invalid construction and distinguish the base event already recorded before a derived validation failure from a successfully returned object.',
    'Explain the compiler limit on subtype-only methods, justify is-a versus has-a, and identify a semantic contract violation that Java would still compile.',
  ],
  pitfalls: [
    'Inheritance exposes the accessible base API and couples subclasses to it. More shared code does not by itself justify a deeper hierarchy.',
    'Java permits only one direct class superclass. Multiple implemented interfaces do not provide multiple sets of superclass instance state. InheritanceVideo is final and cannot be extended.',
    'Calling an overridable method from a constructor can dispatch into a subclass before its initialization finishes. The example records values directly instead. A failed video construction does not undo the base trace event.',
    'A final method prevents overriding that method; it does not prove every subclass or object is immutable. Private methods are not overridden, static methods are hidden, and field access is not runtime method dispatch.',
    'The mutable trace list is a teaching aid: pass a nonnull, writable list. The examples are single-threaded and do not model loading media, persistence, synchronization or a complete learning platform.',
    'These are ordinary unsealed classes except the final video and playlist. Sealed hierarchies can restrict permitted subclasses; this lesson does not teach those declarations or claim every Java class can be extended.',
  ],
  module: {
    path: '/coffee-machine',
    title: 'Inspect inheritance and wrapping in Coffee Machine',
    text: 'ExtraShotDecorator extends CoffeeDecorator and calls super(decoratedCoffee). It inherits getRequiredIngredients, whose base implementation calls the overridden getAddedIngredients hook. Separately, CoffeeDecorator holds a CoffeeComponent reference: getDescription and getPrice in ExtraShotDecorator delegate to that wrapped object. Trace the class inheritance and the has-a reference independently. CoffeeDecorator is abstract, and both types participate in the CoffeeComponent interface; the resource example does not reproduce the full Decorator pattern or prove every coffee implementation’s behavioral contract.',
    sources: [
      'backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeComponent.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeDecorator.java',
      'backend/src/main/java/com/lld/coffeemachine/decorator/ExtraShotDecorator.java',
      'backend/src/test/java/com/lld/coffeemachine/CoffeeDecoratorCompositionTest.java',
    ],
  },
  summaryPoints: [
    'Use class inheritance for an is-a relationship with an explicit behavioral contract; use object composition when one object has or uses another.',
    'Superclass constructors initialize the same derived object. Accessible methods can be inherited while private superclass state stays behind its own API.',
    'The declared type determines available operations; the runtime class supplies overrides for instance calls. Java’s type checks do not prove behavioral substitutability.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Superclasses and Subclasses', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.1.4' },
    { title: 'Java 17 Language Specification: Creation of New Class Instances', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.5' },
    { title: 'Oracle Java Tutorial: Overriding and Hiding Methods', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/override.html' },
  ],
};
