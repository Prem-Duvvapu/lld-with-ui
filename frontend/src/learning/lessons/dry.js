import classModel from '../class-models/dry';
import beforeSource from '../examples/dry/BeforeQuotes.java?raw';
import ruleSource from '../examples/dry/DeliveryFeeRule.java?raw';
import quotesSource from '../examples/dry/OrderQuotes.java?raw';
import rewardsSource from '../examples/dry/RewardRule.java?raw';
import demoSource from '../examples/dry/DryDemo.java?raw';
import output from '../examples/dry-output.txt?raw';
import snapshots from '../examples/dry-snapshots.json';

export default {
  id: 'dry',
  classModel,
  summary: 'DRY means Don’t Repeat Yourself: give each domain decision one authoritative implementation. Follow a delivery-fee requirement from duplicated calculations through drift to a shared rule, while keeping independent records and unrelated loyalty knowledge separate.',
  prerequisites: 'Encapsulation: private state, valid construction and behavior that protects an invariant. The example explains its retained collaborator and per-instance record map as they appear.',
  objectives: [
    'Identify duplicated knowledge by asking which callers must change for the same business reason.',
    'Expose partial-update drift with a boundary example, then centralize the rule and verify both callers.',
    'Distinguish sharing behavior from sharing mutable state, and defend leaving coincidental repetition separate.',
  ],
  problem: 'A shop advertises the same delivery fee in its preview and checkout quote. Originally a subtotal of at least 5000 cents qualified for free delivery; smaller subtotals cost 500 cents. The threshold rises to 6000 cents, but only the preview is updated. At 5500 cents the two screens disagree. Where should that knowledge live so one requirement change cannot leave two fee algorithms out of sync?',
  explanation: [
    { title: 'Find the fact that must change together', text: 'The two original methods in BeforeQuotes encode one shop requirement: the same eligibility boundary and fee. They agree today, but a requirement change obliges someone to update both decisions. That maintenance obligation identifies duplicated knowledge. Matching text is only a clue: a conditional in one place and a lookup table in another can encode the same rule. Hunt and Thomas describe DRY in terms of knowledge and intent; their linked chapter is the primary reference for this distinction.' },
    { title: 'Make the drift observable', text: 'BeforeQuotes preserves two historical stages for comparison. originalPreview and originalCheckout use 5000. updatedPreview uses 6000, while staleCheckout deliberately keeps 5000. At 5500 the original pair returns 0 and 0; the partially changed pair returns 500 and 0. Both drifted methods still compile. Testing only 4500 or 6500 would miss their disagreement, so test the interval affected by the change and the exact threshold. The old methods are a teaching artifact, not an alternative runtime policy selector.' },
    { title: 'Separate refactoring from a requirement change', text: 'For a safe migration, first characterize the original 5000-cent behavior. Extract the rule with that same configuration, route both callers through it, and verify the original outcomes still hold. That step changes code structure while preserving the agreed behavior. Then change the authoritative threshold to 6000 and update the boundary expectations from the new requirement. The Java test checks the extracted rule against both original callers before testing the new configuration. The demo retains the partial-update failure to explain the motivation; it does not recommend shipping that inconsistent intermediate version.' },
    { title: 'Name one rule and send both callers through it', text: 'DeliveryFeeRule owns the comparison, positive threshold validation, nonnegative standard fee and subtotal validation. Its values are integer cents, with free delivery at or above the threshold. OrderQuotes.preview and checkoutQuote both invoke feeCents. The demo configures 6000 and 500 once and supplies that rule to its clients. Passing two different configurations to clients that should agree would still be an integration mistake: extraction removes duplicated algorithms, but callers must also agree on the authoritative configuration. A shared class alone cannot enforce that organizational decision.' },
    { title: 'Share the decision, keep records independent', text: 'live and sandbox retain the same immutable rule object but each constructs its own private HashMap. preview changes no records. checkoutQuote calculates a fee before storing it under an order id; repeating an id replaces that quote in that book. The same id A can record 500 in live and 0 in sandbox without either overwriting the other. Neither method charges a payment or promises a future price. Reusing domain knowledge does not require reusing mutable repository state or merging environments.' },
    { title: 'Equal numbers can express unrelated knowledge', text: 'RewardRule permits redemption at 6000 loyalty points. Delivery currently becomes free at 6000 cents. Different units and independently owned requirements explain the repeated number. The demo raises delivery to 7000 for a newly constructed quote book while redemption at 6000 points stays true. Connecting loyalty to the delivery threshold would introduce a dependency the requirements never asked for. Similar validation syntax can also remain local to separate concepts; combine it only when there is a useful shared contract.' },
    { title: 'Extract enough to support demonstrated change', text: 'A small concrete rule is justified because preview and checkout must follow one requirement. No interface, inheritance hierarchy, universal threshold engine or flags for arbitrary caller types are needed for this example. A future country-specific fee may justify a richer policy boundary after its behavior is understood. Sandi Metz’s linked essay describes how a shared abstraction can become overloaded with unrelated conditional cases; this lesson applies that warning to the delivery/loyalty split. Use a shared rule where reasons to change align; keep or restore separate code when the supposed common concept breaks down.' },
    { title: 'Keep checks independent of the implementation', text: 'Tests should assert outcomes from requirements, such as 500 cents just below 6000 and zero at 6000. Generating every expectation by calling feeCents would reproduce its mistakes. Some repetition in example inputs and expected outputs is useful independent evidence. The Java test compiles the exact displayed sources, checks the output, replays the recorded scalar results, and probes invalid configuration, rejected writes and record isolation. The browser only selects recorded illustration steps; it does not execute Java.' },
  ],
  visual: {
    title: 'Follow the delivery rule through a change',
    summary: 'Recorded Java results · amounts in integer cents · loyalty measured separately in points',
    snapshots,
  },
  code: [
    { filename: 'dry/BeforeQuotes.java', source: beforeSource },
    { filename: 'dry/DeliveryFeeRule.java', source: ruleSource },
    { filename: 'dry/OrderQuotes.java', source: quotesSource },
    { filename: 'dry/RewardRule.java', source: rewardsSource },
    { filename: 'dry/DryDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out dry/BeforeQuotes.java dry/DeliveryFeeRule.java dry/OrderQuotes.java dry/RewardRule.java dry/DryDemo.java\njava -cp out com.lld.learning.examples.dry.DryDemo',
  quiz: {
    prompt: 'After sandbox.checkoutQuote("A", 6000), what are live.recordedFee("A") and sandbox.recordedFee("A") in DryDemo?',
    options: [
      { id: 'independent', text: '500 and 0: the rule is shared, but the record maps are separate', correct: true, feedback: 'Correct. live recorded the 5500 subtotal below the threshold. sandbox recorded 6000 at the inclusive free-delivery boundary. Each book owns its own map.' },
      { id: 'shared-map', text: '0 and 0: DRY makes the second record replace the first everywhere', feedback: 'DRY centralizes the fee decision. It does not require a shared map; each OrderQuotes constructs its own HashMap, so only the sandbox record changes.' },
      { id: 'exclusive', text: 'The second quote fails because a rule can belong to only one quote book', feedback: 'The constructor stores an ordinary non-null reference, with no exclusive-owner guard. Multiple books can use the immutable rule. The curated model therefore shows an association, not exclusive composition.' },
    ],
  },
  exercise: 'Independently model a library overdue rule used by both a fee preview and a recorded return quote. For nonnegative whole overdue days, days 0–2 are free; each later day costs 25 cents, capped at 200 cents. Keep two branches’ quote records separate. Change the free allowance to 3 days in one authoritative configuration, test both callers, and explain why a separate 3-book borrowing limit must not follow that change. You may bound supported days to 0–365 to keep arithmetic explicit. Write your own Java and tests before checking the rubric.',
  rubric: [
    'Name the duplicated knowledge: the grace allowance, daily fee and cap for the same overdue policy. Both callers must delegate to one decision rather than copy its formula.',
    'Before the change, assert fees for days 0, 2, 3, 10 and 11: 0, 0, 25, 200 and 200 cents. After grace becomes 3, assert days 3, 4, 11 and 12: 0, 25, 200 and 200 cents in both callers.',
    'Reject negative days, invalid configuration and days above any stated supported bound. Prove a rejected write leaves previously recorded quotes intact; assert preview does not add records.',
    'Use the same return id in two branch stores, record different valid fees, and prove the records remain independent. Explain that sharing the policy does not require a shared store.',
    'Keep the 3-book borrowing limit separate: it measures a different quantity and has a different reason to change. Justify any abstraction with a named requirement rather than a repeated literal.',
  ],
  pitfalls: [
    'A single shared constant would centralize the threshold but leave two copies of the fee algorithm able to drift. Centralize the decision and its configuration ownership.',
    'Shorter source is not the goal. Unrelated concepts forced into one helper can become harder to change independently; extra caller flags are evidence to reconsider the boundary.',
    'Sharing this immutable rule is safe for its own reads; the HashMaps and multi-step quote workflows are single-threaded. DRY provides no locking, rollback or payment guarantees.',
    'A newly constructed rule does not update existing quote books or previously recorded fees. A real price change needs an explicit version/effective-time and quote-validity contract.',
    'Integer cents avoid floating-point fractions here, but this lesson does not model taxes, currency conversion, promotions or an end-to-end checkout.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Inspect shared Parking Lot policies',
    text: 'ParkingLotService and ParkingLotSimService receive PricingStrategyFactory and SpotAssignmentStrategyFactory. Their pricing paths resolve real PricingStrategy implementations, and both entry paths use the assignment factory. HourlyPricingStrategy owns the hourly math, including the one-hour minimum; for a fixed two-hour CAR ticket it returns ₹40. The dedicated DRY test supplies one recording hourly strategy through the same factory to both services, verifies that each path calls it, and shows that resetting sandbox state leaves a live ticket and occupied spot intact. The live ParkingLotRepository and sandbox simSpots/simTickets retain separate state. This is evidence of reused policy with isolated state, not proof that every validation, workflow or rule in the module is deduplicated. The lesson’s integer-cent delivery rule does not reproduce parking’s rupee rates, server clocks, ticket lifecycle, copying or locks; no new production pattern is claimed.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java',
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotSimService.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/SpotAssignmentStrategyFactory.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/HourlyPricingStrategy.java',
      'backend/src/test/java/com/lld/learning/DryLessonExampleTest.java',
    ],
  },
  summaryPoints: [
    'Ask which requirement owns the decision and which callers must change together; visual similarity alone is insufficient.',
    'Centralize a justified domain rule, then test affected boundaries and verify every intended caller reaches it.',
    'Reuse policy without sharing independent mutable records. Keep unrelated requirements separate even when their literals match.',
  ],
  references: [
    { title: 'Hunt and Thomas: The Evils of Duplication (publisher excerpt)', url: 'https://media.pragprog.com/titles/tpp20/dry.pdf' },
    { title: 'Sandi Metz: The Wrong Abstraction', url: 'https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction' },
    { title: 'Java 17 Language Specification: final Fields (§8.3.1.2)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.3.1.2' },
  ],
};
