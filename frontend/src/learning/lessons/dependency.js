import classModel from '../class-models/dependency';
import policySource from '../examples/dependency/FeePolicy.java?raw';
import flatSource from '../examples/dependency/FlatFeePolicy.java?raw';
import thresholdSource from '../examples/dependency/FreeAbovePolicy.java?raw';
import serviceSource from '../examples/dependency/QuoteService.java?raw';
import sessionSource from '../examples/dependency/QuoteSession.java?raw';
import demoSource from '../examples/dependency/DependencyDemo.java?raw';
import output from '../examples/dependency-output.txt?raw';
import snapshots from '../examples/dependency-snapshots.json';

export default {
  classModel,
  id: 'dependency',
  summary: 'Trace how a quote uses a fee policy, how changing that policy affects the result, and how temporary use differs from retaining a collaborator. Separate dependency, injection and dependency inversion.',
  prerequisites: 'Interfaces: implementing and calling a contract. Association: stored references, navigation and reference identity. The example uses integer cents and a small lambda, explained below.',
  objectives: [
    'Identify dependencies introduced by parameter types, calls and local construction, even without a collaborator field.',
    'Distinguish source/API requirements from behavioral assumptions, and test both at the interface boundary.',
    'Explain temporary use, stored association, constructor injection and the additional architectural decisions required for DIP.',
  ],
  problem: 'A checkout quote adds a delivery fee to a subtotal. One policy always charges 50 cents; another waives the fee at 1000 cents. Must checkout store a policy just to call it? Will using an interface remove every dependency? If the caller switches its policy variable, should an already-created session silently switch too?',
  explanation: [
    { title: 'Read the dependency from client to supplier', text: 'A dependency says a client needs a supplier for its specification or implementation, so supplier changes may affect the client. Here QuoteService is the client of FeePolicy. In UML, a dashed line with an open arrowhead points from client to supplier; QuoteService ..> FeePolicy is our textual shorthand. Usage is a kind of dependency, shown with the «use» keyword, for a supplier required for implementation or operation. This is a model of reliance, not a timeline of individual calls. It does not establish whole/part ownership or a lifecycle policy.' },
    { title: 'Find temporary use in parameters, locals and calls', text: 'quote(int, FeePolicy) needs the FeePolicy type and calls its feeCents(int) method. Its local fee variable holds the returned integer. quoteWithDefault creates a FlatFeePolicy in local, then passes it to quote: that method also needs the concrete class and constructor. Math.addExact is a static API dependency with no stored Math object. An unused import alone is poor evidence of meaningful reliance; inspect declarations and expressions. Receiving a parameter is not proof of temporary use in every program: a method could store it, return it or pass it to code that retains it. Inspect what this implementation actually does.' },
    { title: 'Compare use with a retained association', text: 'QuoteService declares no fields and these quote methods retain no collaborator. QuoteSession instead stores its constructor argument in a private final FeePolicy field and reuses it across calls. We model that retained link as an association; the session also depends on FeePolicy. Association and dependency are not mutually exclusive labels. A field is evidence for this implementation, not a universal definition of all associations. The absence of a collaborator field does not tell you when the supplier dies: other references, callbacks or registries may keep it reachable, and domain deletion is a separate rule.' },
    { title: 'Separate compile-time API requirements from behavior', text: 'Java checks the declared parameter type and accessible method signature at compilation. Passing a String as the policy or renaming feeCents without updating callers fails to compile. At runtime an interface call selects the implementation on the actual policy object. Two implementations can satisfy the same signature and return different valid fees. FeePolicy additionally documents nonnegative input and output: the compiler does not prove that numeric postcondition. FeePolicy has one abstract method, so the lambda subtotal -> -1 supplies its implementation: subtotal is the int parameter and -1 is the returned int. It compiles but violates the contract, and quote rejects it. Our compiler tests concern source compatibility, not every binary compatibility scenario.' },
    { title: 'Use an interface without promising zero coupling', text: 'quote accepts FeePolicy instead of a specific implementation and needs no instanceof branches or downcasts to choose behavior. Tests can supply a recording implementation to check the subtotal and call count. This reduces reliance on concrete APIs in that method; it still depends on FeePolicy and its meaning. A changed signature can break compilation and changed fee rules can change totals. QuoteService as a whole still mentions FlatFeePolicy in quoteWithDefault. An interface on one parameter does not erase concrete dependencies elsewhere in the class.' },
    { title: 'Distinguish dependency, injection and DIP', text: 'Dependency is the reliance itself. Dependency injection supplies a collaborator from outside instead of having the recipient create or locate it; QuoteSession demonstrates manual constructor injection without Spring. Ordinary method parameters can also supply per-call collaborators, but not every parameter is a DI architecture. Injection can use a concrete type and can store the supplied reference. The Dependency Inversion Principle (DIP) concerns source dependency direction across policy/detail boundaries: high-level policy and low-level details depend on abstractions, and abstractions avoid dependence on details. An interface plus constructor injection is a useful mechanism, not proof of full DIP. This single-package example keeps a concrete default in QuoteService and directly constructs QuoteService in QuoteSession; it does not demonstrate a fully separated architecture. A fuller design would place the needed contract at a deliberate policy boundary and move implementation selection to external wiring.' },
    { title: 'Follow the reference value, not the caller variable', text: 'Calling new QuoteSession(flat) initializes a new constructor parameter with the reference value, which is then stored in policy. saved refers to that same object. Later flat = threshold reassigns the demo variable only; the session field still identifies FlatFeePolicy. final prevents rebinding that field after construction, not mutation of every possible policy object. This example uses immutable policy state. A shared mutable collaborator would need its own contract and synchronization decisions.' },
    { title: 'Read the arithmetic and failure boundary precisely', text: 'All values are cents in Java int, with no floating-point money calculation. Zero subtotal and zero fee are allowed. FreeAbovePolicy waives the fee at the threshold inclusively. Negative subtotals fail before calling the collaborator; null policies fail with a named NullPointerException; negative results fail after the call. Math.addExact rejects overflow with ArithmeticException. Exceptions from a policy propagate. No retry, payment, persistence, thread scheduling or rollback is implemented. In particular, validating a result cannot undo side effects that an arbitrary policy already performed.' },
  ],
  visual: {
    title: 'Inspect policy use and retained references',
    summary: 'Recorded Java calls and references · client ..> supplier · amounts in cents',
    snapshots,
  },
  code: [
    { filename: 'dependency/FeePolicy.java', source: policySource },
    { filename: 'dependency/FlatFeePolicy.java', source: flatSource },
    { filename: 'dependency/FreeAbovePolicy.java', source: thresholdSource },
    { filename: 'dependency/QuoteService.java', source: serviceSource },
    { filename: 'dependency/QuoteSession.java', source: sessionSource },
    { filename: 'dependency/DependencyDemo.java', source: demoSource },
  ],
  output,
  run: 'javac --release 17 -d out dependency/FeePolicy.java dependency/FlatFeePolicy.java dependency/FreeAbovePolicy.java dependency/QuoteService.java dependency/QuoteSession.java dependency/DependencyDemo.java\njava -cp out com.lld.learning.examples.dependency.DependencyDemo',
  quiz: {
    prompt: 'The session was constructed with FlatFeePolicy(50). After flat = threshold, what do service.quote(1200, flat) and session.quote(1200) return, in that order?',
    options: [
      { id: 'both-switch', text: '1200 and 1200: rebinding flat updates the session too', feedback: 'The constructor received a reference value, not an alias to the caller variable. The session still holds the original FlatFeePolicy, so only the per-call quote switches.' },
      { id: 'separate', text: '1200 and 1250: the parameter changes, the stored reference stays', correct: true, feedback: 'Correct. The parameter now identifies FreeAbovePolicy and waives the fee. The session retains FlatFeePolicy(50), so its total remains 1250 cents.' },
      { id: 'no-dependency', text: 'Neither compiles: temporary use requires a policy field', feedback: 'A parameter and method call are sufficient to use a policy. A field is needed here only to retain a policy between session calls; it is not required for the per-call dependency.' },
    ],
  },
  exercise: 'In your copy, add CappedFeePolicy implementing FeePolicy. Supply a delegate FeePolicy and a nonnegative cap through its constructor; store both. For nonnegative input call the delegate exactly once and return the smaller of its fee and the cap. Reject negative subtotals before delegation and reject negative delegate results before capping. Reject null delegates and negative caps at construction. Use it with the unchanged quote method. Test caps of zero, below and above the delegate fee, the exact cap boundary, invalid input, a negative-result delegate and a throwing delegate. Then identify the parameter dependency in quote, the retained delegate association in the wrapper and where you choose concrete implementations. Explain why constructor injection alone does not prove an entire application follows DIP.',
  rubric: [
    'The new implementation satisfies FeePolicy for zero and positive subtotals; fee and cap are integer cents, and capping includes equality.',
    'A recording delegate proves exactly one call for valid input, the original subtotal is passed, and invalid input makes no delegate call.',
    'Construction rejects null and a negative cap; a negative delegate result is rejected rather than hidden by a zero cap, and delegate exceptions propagate.',
    'Existing QuoteService.quote code accepts the new implementation unchanged; test cap zero, below, equal to and above a real delegate fee.',
    'Trace the stored delegate reference separately from temporary use, and explain the remaining API/behavior dependencies, wiring choice and limits of the DIP claim.',
  ],
  pitfalls: [
    'No collaborator field does not mean no dependency. Local construction, static calls and method signatures can still require other types and APIs.',
    'Temporary use in this implementation does not imply supplier destruction after the call, ownership by the caller or the absence of retention anywhere else.',
    'Implementing an interface proves the required Java methods exist; it does not prove every documented precondition, postcondition or side-effect guarantee.',
    'Different valid fee policies can change totals without an API change. Review behavior as well as compilation when replacing a collaborator.',
    'Dependency injection answers how a collaborator is supplied; DIP asks where source dependencies point across architectural boundaries. Neither is equivalent to simply adding an interface.',
    'QuoteSession retains an association despite receiving the policy through injection. Reassigning a caller variable does not replace that field.',
    'The lambda in the demo is a compact FeePolicy implementation, not a simulated Java method in JavaScript. The browser displays recorded Java results only.',
    'A successful result check is not a transaction. A policy that mutates state and then throws would need an explicit recovery design.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Trace pricing dependencies in Parking Lot',
    text: 'ParkingLotService.scanTicket resolves a PricingStrategy into a local variable and calls calculatePrice on a preview Ticket. payAndExit passes a strategy to ParkingLotRepository.completeExit, which calls it with the stored ticket under ticketLock. The repository does not retain a PricingStrategy field; our test supplies a recording strategy and verifies the exact Ticket and exit time received. With two-hour CAR tickets the real HourlyPricingStrategy yields ₹40 while FlatRatePricingStrategy yields ₹50; those module amounts are rupees, while our lesson uses integer cents. The service retains a constructor-injected PricingStrategyFactory, and that factory retains actual policy objects in its map: temporary use by the repository does not imply the policies vanish. The factory constructor explicitly names concrete implementations, so these interfaces and injection alone do not establish full DIP. The lesson quote does not reproduce the module’s locking, double-exit checks, preview copying or business pricing; a lock also does not itself guarantee rollback if a strategy throws.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/FlatRatePricingStrategy.java',
      'backend/src/test/java/com/lld/learning/DependencyExampleTest.java',
    ],
  },
  summaryPoints: [
    'A dependency records client reliance on a supplier; parameter use, local construction and calls can create it without a stored collaborator.',
    'An interface narrows the API a caller needs. Behavioral assumptions still matter, and compilation alone cannot prove those contracts.',
    'A retained association can also be an injected dependency. Trace references and explicit domain rules before making ownership or lifetime claims.',
    'Injection supplies objects. DIP organizes source dependencies across policy/detail boundaries; verify the surrounding design before claiming it.',
  ],
  references: [
    { title: 'OMG UML 2.5.1: Dependencies and Usage (§7.7)', url: 'https://www.omg.org/spec/UML/2.5.1' },
    { title: 'Java 17 Language Specification: Formal Parameters (§8.4.1)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.1' },
    { title: 'Java 17 Language Specification: Lambda Expressions (§15.27)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.27' },
    { title: 'Java 17 Language Specification: Method Invocation (§15.12)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.12' },
    { title: 'Spring Framework: Dependency Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' },
    { title: 'Robert C. Martin: A Little Architecture (source dependency direction)', url: 'https://blog.cleancoder.com/uncle-bob/2016/01/04/ALittleArchitecture.html' },
  ],
};
