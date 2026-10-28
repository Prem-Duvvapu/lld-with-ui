import classModel from '../class-models/overloading-and-overriding';
import baseSource from '../examples/methodselection/PromptPrinter.java?raw';
import childSource from '../examples/methodselection/HintPrinter.java?raw';
import demoSource from '../examples/methodselection/MethodSelectionDemo.java?raw';
import output from '../examples/overloading-and-overriding-output.txt?raw';
import snapshots from '../examples/overloading-and-overriding-snapshots.json';

export default {
  classModel,
  id: 'overloading-and-overriding',
  summary: 'Resolve a method call in two stages: select an applicable signature at compile time, then dispatch an overridden instance method on its runtime receiver.',
  prerequisites: 'Polymorphism and Inheritance for declared and runtime types; Constructors for creation paths; Access Modifiers for visibility. This supplemental lesson extends those examples with overload applicability and override restrictions.',
  objectives: [
    'Explain how the receiver’s declared API and argument expressions constrain overload selection.',
    'Predict widening, boxing and variable-arity choices without using the runtime argument class.',
    'Distinguish a covariant override from an overload and preserve the caller’s behavioral contract.',
  ],
  problem: 'A study tool adds hints to a prompt printer. Some callers pass String, others pass the same value through Object, and a new child overload accepts StringBuilder. Why does the same receiver produce different results, and why does adding an overload fail to replace an inherited operation?',
  explanation: [
    { title: 'First find the available signatures', text: 'For these ordinary, nongeneric calls, the receiver’s declared type determines the API searched. The compiler checks the argument expressions against candidate parameter lists. Overloading means methods share a name with different signatures; it does not require inheritance. Return type alone cannot distinguish overloads. The compiler may select a different overload when the declared argument type changes, even if the runtime value stays the same.' },
    { title: 'Apply conversions in phases', text: 'The fixed-arity strict phase permits identity and widening conversions without boxing or unboxing. If it finds no applicable method, the loose phase permits boxing and unboxing. Only if those phases fail does variable-arity invocation apply. Choose the most specific applicable method within the first successful phase. Thus phase(3) uses long, not Integer; phase(Integer.valueOf(3)) uses Integer; phase() uses int.... An explicit int[] can use the varargs declaration as a fixed-arity method. This example excludes generic inference, lambdas and method references, which have additional rules.' },
    { title: 'Then dispatch that instance signature', text: 'base.print(text) selects print(String), then invokes HintPrinter’s override. base.print(object) selects print(Object), which HintPrinter inherits unchanged. Runtime dispatch does not restart overload resolution using the argument’s runtime class. The child’s print(StringBuilder) is invisible through PromptPrinter; through HintPrinter it is a more specific overload than print(Object). An overload can therefore change source behavior when a caller is recompiled against a richer API.' },
    { title: 'Override the inherited contract deliberately', text: 'For these nongeneric methods, overriding keeps the inherited name and parameter types. Use @Override to have javac detect signature mistakes. An override cannot reduce access, broaden the checked exceptions callers must handle, or change an instance method into a static method. A final method cannot be overridden; a private superclass method is not an inherited override target. These compiler restrictions do not prove semantic compatibility: HintPrinter still rejects null or blank String topics and strips whitespace, just as the base contract promises.' },
    { title: 'Refine a reference result without inventing another signature', text: 'HintPrinter.copy returns HintPrinter where PromptPrinter.copy returns PromptPrinter: a covariant reference return. It also omits the base declaration’s IOException. A call through base still has the base result type and checked-exception obligation; a child-typed call sees the refined declaration. The demo declares IOException for that reason, although neither implementation performs I/O. Primitive override returns must match exactly; int cannot become long. Constructors can overload but are not inherited methods and cannot override.' },
  ],
  visual: {
    title: 'Trace method selection before execution',
    summary: 'Recorded Java calls · one runtime receiver · compile-time signature decisions',
    snapshots,
  },
  code: [
    { filename: 'methodselection/PromptPrinter.java', source: baseSource },
    { filename: 'methodselection/HintPrinter.java', source: childSource },
    { filename: 'methodselection/MethodSelectionDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out methodselection/PromptPrinter.java methodselection/HintPrinter.java methodselection/MethodSelectionDemo.java\njava -cp out com.lld.learning.examples.methodselection.MethodSelectionDemo',
  quiz: {
    prompt: 'With PromptPrinter base = new HintPrinter() and Object topic = "Objects", what does base.print(topic) return?',
    options: [
      { id: 'runtime-argument', text: 'hint String: Objects (name an object)', feedback: 'The argument variable is Object. Runtime dispatch does not reconsider its String value to select another overload.' },
      { id: 'selected-object', text: 'base Object: [Objects]', feedback: 'Correct. print(Object) is selected at compile time. HintPrinter does not override that signature, so the inherited body runs.', correct: true },
      { id: 'base-string', text: 'base String: Objects', feedback: 'The receiver’s declared type exposes both overloads, but this Object argument cannot be passed to print(String) without a cast.' },
    ],
  },
  exercise: 'Add ChecklistPrinter extending PromptPrinter. First try @Override print(Object) when your intention is to specialize String prompts: explain why this is a valid override of the wrong operation. Implement public @Override print(String) returning "check String: " plus the cleaned topic, and a covariant ChecklistPrinter copy() with no checked throws clause. Test calls through base and child references with String and Object variables, padded topics, null and blank String inputs, and fresh copies. Finally predict child.print(null) for HintPrinter, then use an explicit (String) null to choose one overload and observe validation.',
  rubric: [
    'Keep print(String) and print(Object) as separate contracts; predict the inherited Object result for an Object variable.',
    'Return check String: Objects through either receiver reference when the argument is String; preserve stripping and input rejection.',
    'Return a fresh ChecklistPrinter from copy; a base-typed copy call still requires handling or declaring IOException.',
    'Explain that HintPrinter.print(null) is ambiguous between unrelated String and StringBuilder parameters; the cast resolves selection but does not make null valid.',
    'Verify javac rejects reduced visibility, broadened checked exceptions, a wrong return type and an attempted final-method override.',
  ],
  pitfalls: [
    'Do not memorize a universal closest-type score. Applicability phases run in order; widening can win before boxing is even considered.',
    'Null has no runtime class for dispatching an overload. It can match multiple reference parameters; unrelated most-specific candidates make the call ambiguous at compile time.',
    'A different parameter type may be a valid override of a different inherited overload. @Override detects missing override targets, not your intended behavior.',
    'A compiling override can still violate preconditions, results or failure promises. Contract tests matter independently of language legality.',
    'Static methods hide rather than override instance behavior. Changing static versus instance with the same inherited signature is rejected; the companion Static vs Instance Members lesson explores hiding.',
    'The Object overload deliberately preserves the supplied text, including surrounding whitespace. The String overload deliberately strips it. The recorded fields preserve those spaces.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Compare overloads and overrides in Parking Lot’s supporting code',
    text: 'The shared ErrorResponse record overloads of(Throwable), of(Throwable, int) and of(String, String, int); of(Throwable) delegates to the two-argument overload. Separately, HourlyPricingStrategy overrides PricingStrategy.calculatePrice(Ticket), and ParkingLotRepository.completeExit invokes that interface operation on a supplied strategy. The overloads construct error records; they do not choose a pricing policy. The repository’s lock is separate from method dispatch. These sources demonstrate real signatures and a production call site; they do not demonstrate covariant returns, numeric overload phases or a guarantee that every pricing policy honors the same behavioral contract.',
    sources: [
      'backend/src/main/java/com/lld/config/ErrorResponse.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
    ],
  },
  summaryPoints: [
    'Select an overload from the declared API and argument expressions at compile time; follow the chosen instance signature to its runtime override.',
    'Try strict fixed arity, loose fixed arity, then variable arity; ambiguity is a compiler error, not a runtime choice.',
    'Covariant reference returns and narrower checked throws clauses refine an override. Visibility, final/static restrictions and semantic contracts still apply.',
  ],
  references: [
    { title: 'JLS 17 §15.12.2: Compile-time method signature and applicability phases', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.2' },
    { title: 'JLS 17 §15.12.4.4: Runtime instance-method lookup', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12.4.4' },
    { title: 'JLS 17 §8.4.8.3: Override and hiding requirements', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.8.3' },
    { title: 'JLS 17 §8.4.5: Covariant reference and exact primitive results', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.5' },
  ],
};
