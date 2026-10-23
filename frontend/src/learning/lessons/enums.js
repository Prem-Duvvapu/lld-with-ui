import enumSource from '../examples/ReviewPriority.java?raw';
import demoSource from '../examples/EnumDemo.java?raw';
import output from '../examples/enums-output.txt?raw';
import snapshots from '../examples/enums-snapshots.json';

export default {
  id: 'enums',
  summary: 'Model a closed set of choices, attach data to each choice, and validate an external string before using it as a Java enum.',
  prerequisites: 'Classes and Objects: fields, constructors, method calls and references. The example explains its parsing steps.',
  objectives: [
    'Choose an enum for a fixed vocabulary instead of passing unrelated strings throughout a model.',
    'Read constructor arguments and instance data on named enum constants.',
    'Distinguish exact valueOf lookup from an application parser that normalizes and rejects input.',
  ],
  problem: 'A study-card request contains a priority string. One caller sends HIGH, another sends " high ", and another sends urgent. Which inputs should your boundary accept, and what values should the rest of the program receive?',
  explanation: [
    { title: 'Declare the vocabulary once', text: 'ReviewPriority declares LOW, MEDIUM and HIGH. An enum variable refers to one of these named instances, or can be null; it is not an arbitrary string. The compiler rejects assigning "HIGH" directly to a ReviewPriority variable. Adding a constant is a source change, not something a request can do.' },
    { title: 'Keep choice-specific data beside the choice', text: 'LOW(1), MEDIUM(2) and HIGH(3) pass weights to the enum constructor. Each constant has its own final weight and a getWeight method. Those weights are this teaching app’s chosen values. They are not ordinal positions or a scheduling algorithm. Java supplies values() to inspect the declared constants in declaration order.' },
    { title: 'Parse at the boundary', text: 'Java’s valueOf requires the exact constant name: spaces and different case are not normalized. Our parse method deliberately trims spaces and uppercases using Locale.ROOT, then calls valueOf. Missing input and unknown names throw IllegalArgumentException. This is an explicit input policy, not automatic enum validation of every request.' },
    { title: 'Separate identity from a stored code', text: 'parse("high") returns the existing HIGH constant, so comparing it with ReviewPriority.HIGH using == is appropriate. Do not store ordinal() as a durable domain code: inserting or reordering constants changes positions. Use an explicit stable code if an external format needs one, and design how unknown future codes are handled.' },
  ],
  visual: { title: 'From request text to a declared choice', summary: 'Three declared priorities · one explicit parsing policy', snapshots },
  code: [
    { filename: 'ReviewPriority.java', source: enumSource },
    { filename: 'EnumDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out ReviewPriority.java EnumDemo.java\njava -cp out com.lld.learning.examples.EnumDemo',
  quiz: {
    prompt: 'What happens with ReviewPriority.valueOf(" high ") and ReviewPriority.parse(" high ") in the displayed code?',
    options: [
      { id: 'both', text: 'Both return HIGH automatically', feedback: 'Only our parse method normalizes input. The generated valueOf method requires an exact declared name.' },
      { id: 'boundary', text: 'valueOf rejects it; parse returns the existing HIGH constant', feedback: 'Correct. Our boundary policy trims and normalizes before exact lookup. It creates no new priority object.', correct: true },
      { id: 'new', text: 'parse creates a new HIGH constant', feedback: 'Parsing selects an already declared constant. It does not extend the enum’s vocabulary.' },
    ],
  },
  exercise: 'Add CRITICAL with an explicit weight of 5 in your own copy. Check that parse(" critical ") selects it, an unknown name still fails, and blank/null input stays rejected. Then explain whether a list of user-created project labels should be an enum or a separate data model.',
  rubric: [
    'Declare CRITICAL in the enum and keep its weight explicit; do not calculate it from ordinal().',
    'Test a valid name, normalized input, an unknown name, blank input and null.',
    'Explain that the custom parser chooses the normalization policy and does not eliminate null handling everywhere else.',
    'Use a data model for an open-ended vocabulary controlled by users rather than adding constants from a request.',
  ],
  pitfalls: [
    'An enum type still permits a null reference. Validate required inputs at the boundary.',
    'Constants are shared named instances. Mutable fields on an enum would be shared state; this example uses a final weight.',
    'valueOf is case-sensitive and does not trim. Do not silently turn an unknown value into a valid default unless the product explicitly requires that policy.',
    'A fixed vocabulary does not by itself enforce legal lifecycle transitions. An order-status enum needs separate transition rules.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Inspect enum boundaries in Parking Lot',
    text: 'VehicleType declares CAR, BIKE and TRUCK. PricingStrategyType names the supported pricing choices, and PricingStrategyFactory parses requests before selecting a policy from an EnumMap. Compare its typed invalid-request handling with this small standalone parser. A valid vehicle type still needs availability and gate validation; an enum cannot enforce the whole workflow.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/model/VehicleType.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyType.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
    ],
  },
  summaryPoints: [
    'Use an enum for a vocabulary known in source, and give each constant explicit data when needed.',
    'Parse external strings deliberately; exact lookup and normalization are different operations.',
    'Explain unknown input, null, identity and stable external codes before relying on the type alone.',
  ],
  references: [
    { title: 'Java 17 Language Specification: Enum Classes', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.9' },
    { title: 'Java 17 Enum API: valueOf, name and ordinal', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Enum.html' },
    { title: 'Oracle Java Tutorial: Enum Types', url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html' },
  ],
};
