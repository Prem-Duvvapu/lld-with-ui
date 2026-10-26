import contractSource from '../examples/PracticeQuestion.java?raw';
import baseSource from '../examples/OpenPracticeQuestion.java?raw';
import hintedSource from '../examples/HintedPracticeQuestion.java?raw';
import demoSource from '../examples/PolymorphismDemo.java?raw';
import output from '../examples/polymorphism-output.txt?raw';
import snapshots from '../examples/polymorphism-snapshots.json';

export default {
  id: 'polymorphism',
  summary: 'Use one question contract with different objects, then separate runtime dispatch of an override from compile-time selection of an overload.',
  prerequisites: 'Interfaces and Inheritance: implementing a contract, extending a class and using super. The example restates the relevant rules and needs no Java files from another lesson.',
  objectives: [
    'Substitute a concrete object through interface and superclass references without changing its runtime class.',
    'Predict an overridden instance-method call from both its declared API and the runtime object.',
    'Resolve an overload from declared argument types before tracing any overridden call inside its body.',
    'Distinguish method contracts from compiler-enforced signatures, and identify unsafe casts and hidden members.',
  ],
  problem: 'A revision screen asks a question about a topic. Some questions are open; others add a hint. The screen should request either through one operation. A teammate adds overloaded helper methods and expects Java to choose the hinted overload whenever the object happens to be hinted. Does Java actually work that way?',
  explanation: [
    { title: 'Begin with a caller that needs one behavior', text: 'PracticeQuestion promises ask(String): reject null or blank topics and return a nonblank question containing the stripped topic without changing state. OpenPracticeQuestion implements it; HintedPracticeQuestion extends that class and overrides ask with the same signature. present accepts PracticeQuestion and calls ask once. Supplying a plain object or a hinted object changes the result without changing present or adding a concrete-class branch.' },
    { title: 'Track declared type and runtime class separately', text: 'The demo constructs one HintedPracticeQuestion and assigns that reference to hinted, base and role. Their declared types are HintedPracticeQuestion, OpenPracticeQuestion and PracticeQuestion. These assignments create aliases to the same object, not three differently shaped objects. The declared type limits which members a caller may name. role.ask is valid, while role.hint is unavailable through that declared API even though the runtime object has a hint method.' },
    { title: 'Follow an overridden instance call', text: 'For role.ask or base.ask, the runtime HintedPracticeQuestion supplies the overriding instance method. Within that override, super.ask explicitly invokes the base implementation on the same object to reuse validation and the Explain prefix; it does not recursively dispatch back to the override. The hint is then appended. A base reference does not force ordinary instance calls to run the base body.' },
    { title: 'Choose an overload before following an override', text: 'The two select helpers have different parameter types, so they are overloads. At select(base), Java uses the declared OpenPracticeQuestion argument type and selects select(OpenPracticeQuestion). At select(hinted), it selects the more specific HintedPracticeQuestion parameter. Java does not revisit that choice using the runtime argument class. Both selected bodies then call question.ask, which does dispatch to the hinted instance override. Separate these two decisions when predicting the output.' },
    { title: 'Contrast members that do not use this dispatch rule', text: 'badge fields and static category methods deliberately have the same names in the two classes. baseMembers takes OpenPracticeQuestion, so it returns open/open even when its argument is hinted. childMembers returns hinted/hinted for that same object. This is member hiding, not instance-method overriding. The example uses instance-qualified static calls only to expose the trap; prefer OpenPracticeQuestion.category() or HintedPracticeQuestion.category() in application code.' },
    { title: 'Require behavioral substitution, not just assignability', text: 'The compiler checks the interface, inheritance and overriding signatures. It does not prove that a replacement preserves the input and output promises. The hinted override delegates validation to super.ask, so it accepts the same topics and rejects the same invalid ones. An override returning a blank result or rejecting a previously valid topic could compile and still break present’s expectations. Run common contract tests for every implementation.' },
    { title: 'Compare a shared operation with explicit alternatives', text: 'If new question types should supply behavior through the same contract, present keeps that caller stable. If the variation is a small closed set of data labels, an enum and one explicit decision may be easier to inspect than a new hierarchy. An overload is useful when an API intentionally offers different signatures known at the call site; it is a poor substitute for runtime behavior selection. This example’s select methods are a teaching contrast, not a requirement for presenting questions.' },
  ],
  visual: {
    title: 'Trace reference types, overloads and overrides',
    summary: 'One hinted object · three declared reference types · distinct Java selection rules',
    snapshots,
  },
  code: [
    { filename: 'PracticeQuestion.java', source: contractSource },
    { filename: 'OpenPracticeQuestion.java', source: baseSource },
    { filename: 'HintedPracticeQuestion.java', source: hintedSource },
    { filename: 'PolymorphismDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out PracticeQuestion.java OpenPracticeQuestion.java HintedPracticeQuestion.java PolymorphismDemo.java\njava -cp out com.lld.learning.examples.PolymorphismDemo',
  quiz: {
    prompt: 'With OpenPracticeQuestion base = new HintedPracticeQuestion(), what does PolymorphismDemo.select(base) return?',
    options: [
      { id: 'runtime-overload', text: 'hinted overload: Explain Objects (hint: name one object)', feedback: 'The object is hinted, but overload selection uses the declared argument type OpenPracticeQuestion. Runtime dispatch does not choose a new select signature.' },
      { id: 'two-decisions', text: 'open overload: Explain Objects (hint: name one object)', feedback: 'Correct. The declared argument type selects the open overload; the ask call inside it reaches HintedPracticeQuestion’s runtime override.', correct: true },
      { id: 'all-static', text: 'open overload: Explain Objects', feedback: 'The open overload is selected, but question.ask is an overridden instance method. Its receiver is still the hinted object, so the hint remains.' },
    ],
  },
  exercise: 'A proposed ChecklistPracticeQuestion extends OpenPracticeQuestion and declares ask(Object topic), hoping to replace ask(String). Explain why that overload leaves the inherited String method in use. Fix it with a public @Override ask(String) that reuses super.ask and appends "; give two examples". Pass the new object through both PracticeQuestion and OpenPracticeQuestion references to the unchanged present caller. Predict select(checklist) with no new select overload. Verify normal, padded, null and blank topics, then explain why casting its OpenPracticeQuestion reference to HintedPracticeQuestion would compile but fail at runtime.',
  rubric: [
    'Identify ask(Object) as an overload; use @Override on ask(String) so a signature mistake becomes a compiler error.',
    'Expect Explain Objects; give two examples through both reference types, and preserve the shared input rejection behavior.',
    'Predict the OpenPracticeQuestion select overload for ChecklistPracticeQuestion, followed by its overridden ask result.',
    'Keep present unchanged and avoid type switches or downcasts when the contract already exposes ask.',
    'Explain that a cast changes the compile-time view and performs a runtime compatibility check; it does not convert a checklist or plain object into a hinted one.',
  ],
  pitfalls: [
    'An overload with a different parameter type does not override an inherited method. @Override catches this mistake; different return types alone cannot define overloads.',
    'Fields and static methods do not participate in overridden instance-method dispatch. Hiding badge or category is deliberately confusing here; prefer an instance method when behavior should vary by runtime object.',
    'A PracticeQuestion reference cannot call hint without narrowing its type. Casting new OpenPracticeQuestion() to HintedPracticeQuestion compiles but throws ClassCastException at runtime. Prefer the shared operation; use instanceof only when a real subtype-specific requirement exists.',
    'The two select overloads accept classes, not every PracticeQuestion implementation. present is the broader caller API; an unrelated implementation can satisfy it without extending OpenPracticeQuestion.',
    'A null receiver still throws NullPointerException before an instance method can validate its topic. Rejecting a null topic is a separate contract from accepting a null question object.',
    'No browser control schedules or executes Java. The illustration and output are recorded fixtures checked against the canonical Java 17 files by backend tests.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Inspect a polymorphic pricing call in Parking Lot',
    text: 'PricingStrategy declares calculatePrice(Ticket). HourlyPricingStrategy and FlatRatePricingStrategy implement different policies. PricingStrategyFactory selects a policy object; ParkingLotRepository.completeExit accepts it as PricingStrategy and calls pricingStrategy.calculatePrice(ticket), reaching that object’s implementation. Policy selection and the repository’s ticket lock are separate code. This is a real interface-based call, not overloaded pricing methods or automatic thread safety from polymorphism.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
    ],
  },
  summaryPoints: [
    'Declared types expose a caller’s API; assigning a reference to an interface or superclass preserves the object and its runtime class.',
    'Choose an overload from compile-time types, then follow any overridden instance call using its runtime receiver.',
    'Behavioral promises still need tests. Static methods, fields and casts follow separate rules and cannot replace a sound shared contract.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Compile-Time Method Signature Selection', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.2' },
    { title: 'Java 17 Language Specification: Locate the Runtime Method to Invoke', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.4.4' },
    { title: 'Oracle Java Tutorial: Polymorphism', url: 'https://docs.oracle.com/javase/tutorial/java/IandI/polymorphism.html' },
  ],
};
