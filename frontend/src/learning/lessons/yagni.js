import classModel from '../class-models/yagni';
import currentSource from '../examples/yagni/CurrentParcelQuote.java?raw';
import speculativeSource from '../examples/yagni/SpeculativeQuoteEngine.java?raw';
import pickupSource from '../examples/yagni/PickupParcelQuote.java?raw';
import demoSource from '../examples/yagni/YagniDemo.java?raw';
import output from '../examples/yagni-output.txt?raw';
import snapshots from '../examples/yagni-snapshots.json';

export default {
  id: 'yagni',
  classModel,
  summary: 'YAGNI means You Aren’t Gonna Need It. Start with demonstrated requirements, defer speculative capabilities, and name the evidence that would justify adding them. Compare two working parcel quotes today, then test what happens when an actual pickup requirement arrives.',
  prerequisites: 'Classes and Objects: creating objects and calling their methods. Here private hides fields, final prevents reassignment, and static marks a class constant. The optional Map-based alternative is explained locally; knowing interfaces or design patterns is not required.',
  objectives: [
    'Separate an accepted requirement from a plausible guess, and explain the build, delay, carrying and repair costs of that guess.',
    'Keep the simplest adequate current behavior, including validation and meaningful tests.',
    'Specify an evidence-based expansion trigger and implement the actual changed behavior without forcing it into yesterday’s abstraction.',
  ],
  problem: 'A parcel desk currently quotes 200 cents per parcel for orders of 1–20 parcels. No customer can select a service. A developer proposes named service rates because pickup or express might arrive later. Should the desk carry that configuration now? Later, the desk approves pickup at 100 cents off the entire quote, while ordinary delivery must keep its old price. Does the guessed rate model actually help?',
  explanation: [
    { title: 'Write today’s acceptance examples first', text: 'One parcel costs 200 cents, three cost 600, and twenty cost 4000. Zero, negative quantities and quantities above twenty are rejected. CurrentParcelQuote implements that contract directly, with a named rate and a bounded multiplication. The scope excludes payments, addresses, tax and persistence. These exclusions are stated requirements for this teaching case; they do not imply that a real parcel business can ignore them. A question such as “might we offer express?” stays a question until its users, price rule and acceptance cases are understood.' },
    { title: 'Run the speculative alternative honestly', text: 'SpeculativeQuoteEngine is an executed teaching alternative, not an unused production class or a feature of this application. Its Map associates service names with per-parcel rates. Constructing it with STANDARD → 200 makes it agree with CurrentParcelQuote for every supported quantity. But callers must now choose a service string; configuration needs nonempty-map, name and rate validation; unknown names can fail. Map.copyOf detaches the configuration from later caller edits; this engine exposes no update method. Those responsibilities are useful only if configurable service rates are actually part of the accepted contract. A one-entry map alone does not prove bad design in other contexts.' },
    { title: 'Account for presumption, carrying and repair', text: 'Fowler’s Yagni article distinguishes speculative capability from useful preparation for change. Applied to this case, build cost covers the rate registry and its tests; delayed value is time taken from delivering the current quote; carrying cost is explaining and maintaining service selection; repair cost appears if the real discount does not fit that registry. These are qualitative costs, not measured timings or a claim that every abstraction fails. Fowler also treats refactoring and automated checks as enablers: deferring a feature does not justify neglecting code health.' },
    { title: 'Record a trigger, not a dormant feature', text: 'Today’s decision is: keep CurrentParcelQuote; defer service selection. Revisit when the desk approves a second customer-visible option with named users, an effective release and testable prices. For pickup, ask whether the discount applies once per quote or per parcel, its amount, eligible quantities, and what standard delivery must preserve. Research or a short throwaway experiment can resolve an expensive unknown without committing a speculative API. If a real delivery deadline requires preparation, schedule it from evidence and lead time. The decision record is useful even though the executable code has no future-feature switch.' },
    { title: 'When the requirement changes, implement that requirement', text: 'The later accepted rule is explicit: pickup subtracts 100 cents once per valid quote; standard delivery is unchanged. PickupParcelQuote retains a required CurrentParcelQuote and delegates quantity validation and the base price to it. A boolean now has exactly two understood meanings: pickup and standard. The discount applies after successful validation, giving 100 cents for one pickup parcel and 500 for three. The minimum base is 200, so these bounded quotes cannot become negative. This additional class is a side-by-side teaching stage; an application could instead evolve its existing API after considering client compatibility. YAGNI does not require keeping both versions forever.' },
    { title: 'One passing example can hide a wrong abstraction', text: 'A guessed PICKUP rate of 100 cents matches the one-parcel discount: 100. For three parcels it yields 300, but the accepted requirement says 500. More generally, one parcel requires rate 100 while two require rate 150; no single per-parcel rate satisfies both. The configured engine needs a different model or rule to express a fixed discount. Keeping it only because it was already built would compound the original guess. The demo deliberately runs this incorrect candidate for comparison, then the actual requirement. It does not recommend shipping that candidate or silently choosing a different formula.' },
    { title: 'YAGNI, KISS and DRY ask different questions', text: 'YAGNI asks whether named services are needed now. KISS asks how clearly the accepted parcel and pickup rules can be expressed: the named base calculation plus one conditional is easier to inspect here than a universal expression interpreter, even though both could support pickup. DRY asks where one authoritative base-price decision lives: the later quote delegates to CurrentParcelQuote instead of copying 200 and its quantity rule. A compact speculative rate map can look simple yet still be unnecessary. Conversely, a required feature may need more code. Do not delete independent test expectations to remove repetition, or merge unrelated prices just because their numbers happen to match.' },
    { title: 'Adequate includes rejection and independent evidence', text: 'The Java tests characterize every supported current quantity before checking the changed pickup prices, preserve ordinary delivery, reject invalid quantities on both branches, and prove caller map edits cannot change a configured engine. Compiler probes confirm that callers cannot rebind the private base or change the private rate. Tests use expected cents derived from the stated requirements, including 100, 300, 500 and 3900 for pickup quantities 1, 2, 3 and 20. The illustration selects scalar results recorded from those exact Java files; browser clicks do not execute Java. Removing validation, design reasoning or tests would weaken today’s contract rather than remove a speculative feature.' },
  ],
  visual: {
    title: 'From a current quote to an evidenced change',
    summary: 'Recorded Java results · integer cents · 1–20 parcels · historical alternatives compared explicitly',
    snapshots,
  },
  code: [
    { filename: 'yagni/CurrentParcelQuote.java', source: currentSource },
    { filename: 'yagni/SpeculativeQuoteEngine.java', source: speculativeSource },
    { filename: 'yagni/PickupParcelQuote.java', source: pickupSource },
    { filename: 'yagni/YagniDemo.java', source: demoSource },
  ],
  output,
  run: 'javac -d out yagni/CurrentParcelQuote.java yagni/SpeculativeQuoteEngine.java yagni/PickupParcelQuote.java yagni/YagniDemo.java\njava -cp out com.lld.learning.examples.yagni.YagniDemo',
  quiz: {
    prompt: 'For three pickup parcels in YagniDemo, what do guessedPickup and changed return, and what does current return afterward?',
    options: [
      { id: 'actual', text: '300, 500 and 600 cents', correct: true, feedback: 'Correct. The guessed engine multiplies three by 100. The accepted pickup rule subtracts 100 once from 600. Calling the later quote does not mutate the earlier current model.' },
      { id: 'per-parcel', text: '300, 300 and 600 cents', feedback: 'That treats the new discount as 100 off each parcel. The approved rule subtracts 100 once per quote, so changed returns 600 − 100 = 500.' },
      { id: 'automatic', text: '500, 500 and 500 cents', feedback: 'Neither configuration nor an association rewrites another object’s code. guessedPickup still multiplies by its configured 100; current still quotes 200 per parcel. The later requirement is implemented only by PickupParcelQuote.' },
    ],
  },
  exercise: 'Independently design a workshop ticket quote. Today it charges 900 cents per seat for 1–8 seats, rejects other counts, and offers no membership plans. A teammate proposes a configurable membership-rate registry. Defend a current implementation and name evidence that would make you revisit the registry. Then take a real requirement change: an approved voucher subtracts 250 cents once per booking, while no-voucher prices stay unchanged. Implement that rule, contrast it with a guessed 650-cent per-seat voucher rate, and test both accepted and rejected inputs. Explain what you would ask before adding cancellations or dated voucher eligibility. Do not reuse the parcel classes or turn these exclusions into permanent bans.',
  rubric: [
    'State current scope and independent examples: 1 seat = 900, 3 = 2700, 8 = 7200 cents; reject 0, negative counts and 9 before computing any quote.',
    'Identify extra decisions in the proposed membership registry and describe build, delay, carrying and possible repair costs without inventing benchmark numbers. Keep readable names, validation and tests in the current version.',
    'Name a revisit trigger with an approved user need and acceptance cases. “We might add memberships” is insufficient; clarify whether any new benefit is per seat or once per booking.',
    'After the voucher change, independently assert 1, 2, 3 and 8 seats = 650, 1550, 2450 and 6950 cents; no-voucher prices must retain their original values. Invalid counts must fail on both branches.',
    'Show that the guessed 650-cent rate passes at one seat but fails at two (1300 versus 1550). Explain why the old registry cannot represent the approved fixed discount merely by changing one rate.',
    'Keep the base-price decision authoritative without a universal pricing framework. Explain separately the YAGNI scope decision, the KISS implementation choice and the DRY base-rule reuse, and state that this model does not issue tickets or redeem a voucher.',
  ],
  pitfalls: [
    'YAGNI is not “never build it.” Once pickup is required, refusing to implement it would fail the changed contract. Deferral needs an explicit revisit condition.',
    'Small code is not automatically adequate: the current quote still rejects unsupported quantities. Required security, reliability or compliance work cannot be dismissed just because it is less visible than a feature.',
    'The speculative engine really runs in this lesson, but none of these classes belongs to a production parcel module. The comparison demonstrates possible costs, not a measured saving or a claim about repository history.',
    'All quantities and integer cents are bounded: current quotes reach 4000; speculative rates reach 10000 per parcel and quotes reach 200000. These multiplications fit int. No currencies, taxes, payment effects, mutable records or concurrency are modeled.',
    'Map.copyOf gives this engine an unmodifiable mapping with immutable String/Integer contents. final alone prevents field reassignment; it does not make arbitrary referenced objects immutable.',
    'The boolean is adequate for two specified modes here. A later third option requires a new decision about the public API; adding more booleans or a hierarchy in advance has no demonstrated benefit.',
    'Displayed historical stages do not perform a live migration, invalidate saved quotes or decide effective dates. Actual API/deployment compatibility and visual route review are separate checks.',
  ],
  module: {
    path: '/tic-tac-toe',
    title: 'Review Tic Tac Toe scope against its source',
    text: 'Game constructs Board(3) and two players with X and O. TicTacToeService.createGame accepts two names; makeMove calls PlaceMoveCommand under a per-game lock. The command validates bounds, game status, turn and occupancy before mutation. The dedicated YAGNI Java test creates a game through that service, checks a rejected move preserves the count and turn, and plays a row win. Use that concrete human-turn workflow to assess a proposed AI opponent: require an agreed game mode, difficulty behavior and acceptance examples before adding an AI selection API. Board itself accepts a size; do not claim the repository universally avoids generalization. Existing command-backed undo and reset serve actual methods and are not speculative merely because they use a pattern. This is a verified practice prompt about scope, not proof that the authors applied YAGNI, an audit of every module, or evidence that in-memory storage alone establishes the principle.',
    sources: [
      'backend/src/main/java/com/lld/tictactoe/model/Game.java',
      'backend/src/main/java/com/lld/tictactoe/model/Board.java',
      'backend/src/main/java/com/lld/tictactoe/service/TicTacToeService.java',
      'backend/src/main/java/com/lld/tictactoe/command/PlaceMoveCommand.java',
      'backend/src/test/java/com/lld/learning/YagniLessonExampleTest.java',
    ],
  },
  summaryPoints: [
    'Keep accepted requirements separate from future guesses, and record what evidence would change the decision.',
    'Compare present build and delay costs with continuing carrying costs and the risk of repairing a wrong guess; keep validation, design and tests.',
    'When evidence arrives, test its actual rule and preserve required old behavior. A previously built extension point earns no exemption from that test.',
  ],
  references: [
    { title: 'Martin Fowler: Yagni — speculative capability, costs and enabling practices', url: 'https://martinfowler.com/bliki/Yagni.html' },
    { title: 'Java 17 API: Map.copyOf and unmodifiable maps', url: 'https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Map.html#copyOf(java.util.Map)' },
    { title: 'Java 17 Language Specification: final Fields (§8.3.1.2)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.3.1.2' },
  ],
};
