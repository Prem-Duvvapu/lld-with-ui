import classModel from '../class-models/kiss';
import rulesSource from '../examples/kiss/RuleBasedParcelFees.java?raw';
import directSource from '../examples/kiss/ParcelFees.java?raw';
import demoSource from '../examples/kiss/KissDemo.java?raw';
import output from '../examples/kiss-output.txt?raw';
import snapshots from '../examples/kiss-snapshots.json';

export default {
  id: 'kiss',
  classModel,
  summary: 'KISS asks for the simplest clear design adequate for the contract. Compare a generic rule pipeline with a direct parcel-fee method, keep every required rejection and boundary, and explain when real variation makes an abstraction useful.',
  prerequisites: 'Classes and Objects: creating an object and calling a method. The example explains the private rule objects, list, callbacks and exceptions locally; you do not need to design a rules engine to follow the comparison.',
  objectives: [
    'Write down accepted inputs, exact results and rejected inputs before comparing designs.',
    'Trace a needless layer of rule plumbing and replace it with direct behavior under the same contract.',
    'Defend clarity using independent boundary tests, and name evidence that would justify a more general design.',
  ],
  problem: 'A parcel counter offers exactly two fixed fees. Whole-gram weights from 1 through 1000 cost 300 cents; weights from 1001 through 2000 cost 500 cents. Every other int is rejected with IllegalArgumentException and the message "weightGrams must be 1..2000". A quote neither records a parcel nor charges money. One implementation builds an ordered collection of condition/calculation callbacks. Another checks the range and returns the appropriate fixed fee. Which makes this particular contract easier to inspect without losing behavior?',
  explanation: [
    { title: 'Adequate comes before simple', text: 'For this lesson, adequate means preserving the entire stated input/output contract: positive whole grams, an inclusive 1000-gram price boundary, an inclusive 2000-gram size limit, fixed integer-cent results, and the specified rejection type and message. Neither design has a mutable quote history. Keeping only the happy path would solve a different problem. KISS is a design judgement about how easily a reader can find and verify the required behavior; it is not a score based on line count. Google’s code-review guidance treats difficulty understanding or safely modifying code as signs of excess complexity, and explicitly calls out unnecessary generality. We apply that guidance to this small, fixed contract.' },
    { title: 'Read the rule machinery without adopting it', text: 'RuleBasedParcelFees stores a List of two private Rule objects. Each Rule retains a condition and a calculation. IntPredicate is a Java contract for an int-to-boolean function; its test method checks the weight. IntUnaryOperator is an int-to-int function; applyAsInt computes the fee. In the constructor expressions, grams -> grams <= 1000 means a function that accepts an integer named grams and returns whether it is at most 1000; grams -> 300 ignores that argument and returns 300. These are callbacks, supplied behavior invoked later. The arrow syntax is a lambda expression. The Oracle Java 17 API references document these two function contracts. They are useful tools, but this requirement does not need interchangeable functions.' },
    { title: 'Trace the hidden ordering decision', text: 'At 1000 grams both configured predicates are true: 1000 is at most 1000 and also at most 2000. The loop returns on the first matching rule, so list order makes the fee 300. Reversing the two rules would incorrectly return 500 at 1000. At 1001, the first rule fails and the second returns 500. Understanding one fee therefore requires reading the list, the callbacks, the Rule methods and the first-match loop. The final IllegalStateException would signal broken internal coverage if supported input reached the end; the current fixed configuration covers the whole valid domain. It is not a second rejection policy for callers, and no runtime registration API is offered.' },
    { title: 'Express the same decision directly', text: 'ParcelFees.feeCents first rejects a weight outside 1..2000. That guard is part of the solution. The next if returns 300 for weights at most 1000; the remaining valid weights must be 1001..2000, so the final return is 500. There is no rule-list assembly, callback dispatch or coverage fallback to inspect. The decision still has order, but the source shows the domain partition beside its results. ParcelFees is itself a named abstraction: callers ask for a fee without knowing the branch details. Simplicity does not mean eliminating every class, method or boundary.' },
    { title: 'Preserve behavior before celebrating the refactor', text: 'Treat the two classes as alternative implementations being compared, not as two copies to maintain in a production application. First characterize the existing contract using independent expected values. Check 1, 1000, 1001 and 2000 grams; also reject 0, negative weights and 2001. Compare the exception type and message as well as successful fees. Then run those same assertions against the replacement. The dedicated Java suite checks every supported integer weight against the two expected fee intervals, probes invalid int extremes, compiles the displayed sources with --release 17, verifies exact console output and replays every scalar field in the illustration. Agreement between two implementations alone is insufficient: both could share the same boundary bug.' },
    { title: 'Shortcuts that change the contract', text: 'Returning weightGrams <= 1000 ? 300 : 500 without a guard would accept zero and overweight parcels. Clamping 2001 down to 2000 would conceal an unsupported request. Returning zero on an exception would confuse rejection with free delivery. Even a correct compressed expression can make units, range checks and precedence harder to review. Named units, readable guards and explicit return values are justified detail. The two demo result-formatting helpers deliberately remain straightforward: reducing their small repetition with a callback helper would reintroduce machinery into the very trace being explained. This is a teaching tradeoff, not a ban on shared helpers.' },
    { title: 'When variation earns a boundary', text: 'If the actual requirement becomes several independently selected carrier algorithms, a common fee contract with tested implementations may reduce the work each caller must understand. A data table may be clearer for many regular weight bands; merely adding a third band does not automatically demand a rules engine. If non-programmers must edit ordered conditions, then rule validation, precedence, overlap, coverage and versioning become real requirements that a dedicated evaluator may need to own. Choose that design from those requirements. Removing a justified interface, validation, transaction or lock to make a method shorter can increase the complexity and risk of the whole system. This lesson compares clarity for one fixed policy; it does not benchmark performance or prove a universal optimum.' },
    { title: 'Separate KISS, YAGNI and DRY decisions', text: 'KISS asks which adequate design is easiest to understand and maintain. YAGNI asks whether a proposed capability is needed by demonstrated requirements: for example, whether this counter needs editable carrier plugins at all. DRY asks whether one piece of domain knowledge has more than one authoritative representation: for example, whether a preview and checkout have copied this same fee rule. The questions overlap but do not imply one another. A compact generic engine can still be difficult to understand; a direct implementation can still duplicate a fee rule across callers. Preserve one authority for shared knowledge while avoiding an abstraction that forces unrelated policies together.' },
  ],
  visual: {
    title: 'Compare the same parcel contract',
    summary: 'Recorded Java results · whole grams and integer cents · null fee means no result on rejection',
    snapshots,
  },
  code: [
    { filename: 'kiss/RuleBasedParcelFees.java', source: rulesSource },
    { filename: 'kiss/ParcelFees.java', source: directSource },
    { filename: 'kiss/KissDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out kiss/RuleBasedParcelFees.java kiss/ParcelFees.java kiss/KissDemo.java\njava -cp out com.lld.learning.examples.kiss.KissDemo',
  quiz: {
    prompt: 'Using the same ParcelFees object, call feeCents(2001), catch the rejection, then call feeCents(1000). What happens?',
    options: [
      { id: 'preserved', text: 'The first call throws IllegalArgumentException; the second returns 300 cents', correct: true, feedback: 'Correct. The upper bound is inclusive at 2000, so 2001 is rejected. The next call has no stored failure state to clear, and 1000 belongs to the inclusive 300-cent band.' },
      { id: 'clamped', text: 'The calls return 500 and 300 cents because the first weight is clamped', feedback: 'There is no clamping rule. The range guard throws before any fee is returned for 2001. Treating unsupported input as a supported parcel changes the contract.' },
      { id: 'exclusive', text: 'The first call throws; the second returns 500 because 1000 starts the expensive band', feedback: 'The source uses <= 1000, not < 1000. Exactly 1000 still costs 300; the 500-cent band starts at 1001. Boundary tests protect that distinction.' },
      { id: 'poisoned', text: 'Both calls throw because a rejected quote invalidates the policy object', feedback: 'ParcelFees declares no fields and the method stores no failure flag. A rejected calculation does not retire the object. Lifecycle and recovery state would need their own explicit requirements.' },
    ],
  },
  exercise: 'Independently design a community-room quote method taking guestCount and durationMinutes. Accept 1–6 guests and only 30, 60, 90 or 120 minutes; charge 400 cents per 30-minute block, independent of guest count. Reject invalid guest counts before validating duration; throw IllegalArgumentException with "guestCount must be 1..6" or "durationMinutes must be 30, 60, 90 or 120" respectively. It only quotes: no booking, payment or stored state. Compare a proposed string-keyed condition registry and action callbacks with your own direct Java method under this same contract. Write independent boundary and rejection tests, explain the steps a maintainer must trace, and say what real change could justify an abstraction. Do not reuse the parcel fee bands as your answer.',
  rubric: [
    'Write the two input invariants and the error-precedence contract. Keep units in parameter/result names and retain both validations; a shorter method that accepts seven guests is inadequate.',
    'For each of guest counts 1 and 6, independently assert fees at durations 30, 60, 90 and 120: 400, 800, 1200 and 1600 cents. Show the fee does not multiply by guest count.',
    'Reject guest counts 0, 7 and integer extremes. With valid guests, reject durations 0, 29, 31, 119, 121 and integer extremes. Check the specified messages; when both inputs are invalid, the guest-count rejection must win.',
    'Validate supported durations before arithmetic. After invalid calls, quote a valid input using the same object and confirm the expected fee; do not invent a booking or stored failure state.',
    'Compare concrete reading tasks: finding the input checks, valid intervals, result formula and rejection precedence. Explain which registry lookup, callback and configuration-coverage decisions the direct method removes. Do not claim a performance improvement without measuring.',
    'Name a justified change and re-evaluate its shape: several venues with independently different pricing algorithms may merit a policy interface; a single new valid duration may need only a reviewed bound/list change and new tests. KISS does not prohibit either choice.',
  ],
  pitfalls: [
    'Fewest lines, smallest character count and clever one-liners do not measure the effort needed to verify a contract. Keep necessary names, checks and domain boundaries.',
    'The generic example is fixed internally and deliberately indirect. It is not a production-ready editable rules engine; arbitrary callbacks would require separate contracts for side effects, invalid outputs and coverage.',
    'The scalar illustration records return values and rejections, not live Java execution or a heap layout. A null fee on rejection means no return value, never a zero-cent fee.',
    'The parcel methods only calculate: no delivery purchase, repository mutation, currency conversion, tax, fractional grams or carrier integration. Java int inputs also exclude null; an HTTP adapter would need its own missing-body/type validation.',
    'These objects have no mutable calculation state. That property does not establish correctness for a concurrent booking or payment workflow. Keep real module locks and lifecycle checks unless their guarantees are independently preserved.',
    'Keep the source of a shared rule authoritative in an application. The before/after pair is pedagogical; shipping both alternatives to different callers without a policy decision would invite drift.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Inspect one fixed Parking Lot pricing policy',
    text: 'FlatRatePricingStrategy.calculatePrice directly switches on VehicleType and returns ₹50 for CAR, ₹25 for BIKE or ₹100 for TRUCK. Within that policy, parking duration does not alter the fee. The dedicated KISS Java test verifies all three rates at fixed short and long ticket durations, asserts calculation leaves ticket fields unchanged, and confirms PricingStrategyFactory resolves FLAT to this object. The same factory also selects HOURLY and DYNAMIC: that existing variation explains why the simple flat method still implements PricingStrategy. Inspect the flat implementation and its factory, then in /parking-lot compare a FLAT scan with another pricing choice; the UI relies on Java’s calculation. This is a small source-backed example of a clear fixed policy inside a justified abstraction, not proof that the whole parking module is simple or an invitation to remove its validation and locks. Parking uses rupee doubles and ticket workflows; the lesson’s integer-cent parcel quote does not reproduce those contracts.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/model/Ticket.java',
      'backend/src/test/java/com/lld/learning/KissLessonExampleTest.java',
    ],
  },
  summaryPoints: [
    'Choose a clear implementation only after preserving accepted inputs, rejected inputs, results and any required state guarantees.',
    'Remove needless decisions and indirection; retain validation, meaningful names and abstractions that hide useful detail.',
    'Use independent boundary evidence and reassess the design when real variation changes the contract. KISS, YAGNI and DRY ask related but distinct questions.',
  ],
  references: [
    { title: 'Google Engineering Practices: What to look for in a code review — Complexity', url: 'https://google.github.io/eng-practices/review/reviewer/looking-for.html#complexity' },
    { title: 'Oracle Java 17 API: IntPredicate', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/function/IntPredicate.html' },
    { title: 'Oracle Java 17 API: IntUnaryOperator', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/function/IntUnaryOperator.html' },
  ],
};
