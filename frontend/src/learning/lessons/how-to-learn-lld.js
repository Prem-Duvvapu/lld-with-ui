import classModel from '../class-models/how-to-learn-lld';
import seatSource from '../examples/howtolearn/StudySeat.java?raw';
import demoSource from '../examples/howtolearn/StudySeatDemo.java?raw';
import output from '../examples/howtolearn-output.txt?raw';
import snapshots from '../examples/howtolearn-snapshots.json';

export default {
  classModel,
  id: 'how-to-learn-lld',
  summary: 'Learn a repeatable way to turn a small problem into responsibilities, objects, rules and evidence. Start with a study-seat reservation, then choose a beginner, revision or interview practice path.',
  prerequisites: 'None. Read the scenarios in ordinary language first. Java is an optional worked example, with its notation explained here; you do not need design patterns, UML notation or concurrency knowledge.',
  objectives: [
    'Separate detailed object design from algorithm selection and system architecture while recognizing where they meet.',
    'Turn requirements into responsibilities, interactions, invariants and tests, then improve the model using evidence.',
    'Choose a practice path and judge readiness by explaining and changing a model rather than counting completed lessons.',
  ],
  problem: 'A study room has seat S1. A learner may reserve it when free; only that learner may cancel. A second reservation must not overwrite the first. Where should these rules live, and how could you prove they work before building a website?',
  explanation: [
    { title: 'Understand LLD, DSA and HLD as related questions', text: 'Low-level design (LLD) works out how a component behaves internally: its responsibilities, data, operations and collaborations. Data structures and algorithms (DSA) help organize information and compute results efficiently; finding the nearest free seat could need an algorithm. High-level design (HLD) considers the wider organization, such as a booking service, storage and their connections. These are useful working boundaries, not universal job titles or separate worlds. A storage choice can constrain object design, and a responsibility can require an algorithm. Here we design one reservation object, not a distributed booking platform.' },
    { title: '1. Clarify requirements and write down the scope', text: 'Ask who acts, what they want, what can go wrong and what must remain true. For this exercise, a seat starts free, any valid learner ID can reserve it once, only the current holder can cancel, and cancellation makes it reusable. IDs are text: surrounding ordinary spaces are removed, and Ada and ada are different IDs. Empty or null IDs are rejected. Even the same learner reserving twice is rejected; cancelling a free seat is rejected too. We assume sequential calls to one seat object. Time slots, expiry, payment, authentication and room-wide learner limits are outside this first model.' },
    { title: '2. Make the requirements observable with scenarios', text: 'Write input, starting state and expected result before choosing classes. Given free S1, reserve Ada means holder Ada. Given holder Ada, reserve Ben must fail and leave Ada in place. Given holder Ada, cancel Ben must fail without a change. Given holder Ada, cancel Ada leaves the seat free; Ben may then reserve it. Add empty-ID and repeated-operation cases. These examples become acceptance checks. If two people disagree about an expected result, clarify the requirement before treating either implementation as correct.' },
    { title: '3. Assign responsibilities before multiplying classes', text: 'A responsibility is something a part of the design knows or does. StudySeat knows its seat ID and current holder and decides whether a reservation or cancellation is legal. StudySeatDemo asks it to act and prints observations. A learner ID is enough here; we have no learner profile behavior that requires a separate Learner class yet. A screen should report a rejected request, but the model must enforce the rule even without that screen. Start with the smallest useful set of responsibilities and add a collaborator when a concrete requirement gives it work.' },
    { title: '4. Draw objects and walk through their interactions', text: 'On paper, draw a box labelled seat: StudySeat with seatId S1 and holder none. Write demo -> seat: reserve Ada, then update the holder to Ada. For reserve Ben, write rejected and keep the box unchanged. A class is the definition; the seat is one instance created from it. An interaction is a request and its result, not just an arrow between names. This informal trace is enough to start. Formal class and sequence diagrams can document a larger design later, but a diagram must agree with actual operations and rejection rules.' },
    { title: '5. State invariants and choose who protects them', text: 'An invariant is a condition that every valid state must satisfy. Here the seat ID is nonempty and stable; the holder is either absent or one nonempty learner ID. We store one nullable holder and derive whether the seat is reserved, so there is no second flag to drift out of agreement. A transition rule adds that a reservation cannot replace an existing holder, and cancellation must match that holder. These checks belong in the methods that change the state. Private fields restrict direct access; they do not invent business rules. Each rejected operation in this model is checked before the state assignment.' },
    { title: '6. Test, review and iterate on one change', text: 'Predict each scenario, run it and compare both the result and the state afterward. For an occupied-seat rejection, checking only the exception misses whether Ada was accidentally erased. Review whether the names explain the behavior and whether a caller can bypass the rule. Then change one requirement, such as allowing the same holder to repeat reserve, and update its expected scenarios before changing code. Run the earlier checks again to catch regressions. If the new requirement exposes a missing responsibility, revise the design and trace again. This loop is a learning workflow, not a mandatory waterfall process.' },
    { title: 'Read the Java only when it helps the model', text: 'String means text and boolean means true or false. A class groups stored fields and methods; new StudySeat("S1") constructs one seat. The constructor names the seat, and private keeps fields behind methods. final keeps seatId from being reassigned. reservedBy starts as null, meaning no holder. reserve and cancel are methods; their learnerId parameter is the request input. void means no returned result on success. isReserved and the getters return observations. These terms are introduced here so you can follow the example; the Classes and Objects lesson teaches them more fully.' },
    { title: 'Read checks and failures without needing a framework', text: 'An if runs a check. != null asks whether a holder exists; ! means not, and || means either condition, skipping the right side when the left is true. requireText is a small shared helper: static means it does not need a particular seat, trim removes surrounding ordinary spaces and control characters, and isEmpty checks for empty text. equals compares ID text, rather than Java reference identity. throw stops this operation with an exception: IllegalArgumentException for invalid input and IllegalStateException for a disallowed action. try/catch lets the demo report a rejection and continue; System.out.println prints. A package groups Java names. No web framework or pattern is needed to run it.' },
    { title: 'Keep the optional example and its proof in proportion', text: 'Choose an illustration step, predict the next state and explain the rule even if you cannot compile Java yet. To run later, install a JDK 17, save both files at the shown paths under one folder, and run the commands from that folder. The demo prints a repeatable trace; automated tests also check invalid inputs, unchanged state and independent seats. This small object trusts submitted IDs and has no login, global seat directory, persistence or safe simultaneous reservation mechanism. Two new objects with the same seat ID are still separate objects; this constructor does not enforce a room-wide uniqueness rule.' },
    { title: 'Beginner path: learn one concept, then use it', text: 'Start here with the six-step reservation trace. Next use the published Classes and Objects, Constructors and Initialization, and Access Modifiers lessons to understand the code. Continue with Encapsulation, Interfaces and Abstraction, following prerequisite links before dependents; then study Inheritance, Polymorphism and Association. Use Enums when you need named alternatives. After each concept, predict a result, make one small change and test it in a familiar model. Move into principles and patterns when you can explain the problem they solve. Catalog entries labelled planned are a roadmap, not completed reading assignments. Return to a small example whenever a larger module feels opaque.' },
    { title: 'Revision path: retrieve, check and repair one gap', text: 'Close the solution and reconstruct the requirements, responsibility box and valid/rejected traces from memory. Compare with the Java and record one specific mismatch, such as forgetting to preserve the holder after rejection. Revisit the relevant concept, correct your model and test the correction. Revisit the exercise on another day and try a small variation without copying. This uses retrieval and spaced practice; the exact interval is your choice. A bookmark or reviewed mark records your own activity, not a mastery score. Keep a short error log containing the mistaken assumption, a counterexample and the corrected rule.' },
    { title: 'Interview path: explain choices within an agreed timebox', text: 'For a practice 40-minute session, spend about 5 minutes clarifying scope, 5 on responsibilities and invariants, 10 on objects and interactions, 10 on a core implementation or precise pseudocode, and 10 testing scenarios and discussing one change. Agree priorities with an interviewer and adjust the split; it is a practice suggestion, not a universal interview format. Narrate one successful request and one rejection. Explain a tradeoff, such as one object per seat now versus a directory when global uniqueness is required. If asked about simultaneous users, identify the extra coordination requirement rather than claiming this example already handles it. A pattern name is useful only when you can justify the responsibility it serves.' },
    { title: 'Use a readiness check to pick the next task', text: 'With the example closed, can you state the scope, assign each rule to a method, trace valid and rejected requests, and explain why rejection preserves state? Can you change one rule and describe which checks must change? Can you distinguish a tested guarantee from an assumption, such as sequential calls or trusted IDs? If yes, try the modeling exercise and then inspect the practice module. If not, return to the specific step that failed; syntax difficulty can be addressed in the Java fundamentals lessons while you continue paper traces. These are self-check prompts, not certification or proof of interview readiness.' },
  ],
  visual: {
    title: 'Trace the requirements through one Java seat',
    summary: 'Six recorded Java states · accepted and rejected requests · null means no holder',
    snapshots,
  },
  code: [
    { filename: 'howtolearn/StudySeat.java', source: seatSource },
    { filename: 'howtolearn/StudySeatDemo.java', source: demoSource },
  ],
  output,
  run: 'javac --release 17 -d out howtolearn/StudySeat.java howtolearn/StudySeatDemo.java\njava -cp out com.lld.learning.examples.howtolearn.StudySeatDemo',
  quiz: {
    prompt: 'Ada holds S1. Ben tries reserve("Ben"), then cancel("Ben"). Both requests are rejected. What should the model report next, and what would you test?',
    options: [
      { id: 'unchanged', text: 'Still reserved by Ada; check both rejections and the unchanged holder', correct: true, feedback: 'Correct. Each method checks the request before assigning reservedBy. Verify the failure and the final state; an exception alone would not prove the reservation was preserved.' },
      { id: 'clear', text: 'Free; any rejected request should clear the reservation', feedback: 'That would erase Ada’s valid reservation. Our requirement says rejected requests preserve the previous state. Only a successful cancellation by Ada releases it.' },
      { id: 'replace', text: 'Reserved by Ben; the latest request should win', feedback: 'Latest-request-wins would be a different requirement. This model rejects an occupied seat and checks the holder on cancellation, so Ben cannot replace Ada.' },
    ],
  },
  exercise: 'Model a single shared study-room locker on paper before writing code. It starts free. A nonempty, trimmed learner ID may claim it; only that learner may release it. Clarify one deliberate difference from the seat: repeating claim by the current holder succeeds without changing state, while a different learner is rejected; releasing a free locker is rejected. Write the requirements, name the responsibilities, draw one object and list its operations. Trace free -> Ada claims -> Ada claims again -> Ben is rejected -> Ben cannot release -> Ada releases -> Ben claims. State the invariants and expected state after every step. Add invalid-ID and independent-locker checks. Optionally implement it in Java without copying the seat’s duplicate-reservation behavior. Finally, consider adding a maximum of one locker per learner across several lockers: explain what shared knowledge is missing and propose a responsibility to own it before adding code.',
  rubric: [
    'Record the scope and explicit duplicate-claim policy before choosing classes; keep login, storage, expiry and simultaneous requests outside this first exercise.',
    'Give the locker responsibility for its holder and legal changes; identify who supplies requests and reports results. Justify any extra class by the work it owns.',
    'Use a stable locker ID and one optional, nonempty holder; derive availability and protect changes through operations rather than a public setter.',
    'Trace every listed request, including the same-holder success and different-holder rejection. After a rejection, verify the previous state as well as the failure.',
    'Check null, empty and surrounding-space IDs, case-sensitive matching, releasing a free locker, reuse after release and independence of two lockers. If writing Java, compare ID text with equals.',
    'Explain why a single locker cannot enforce a quota across all lockers by itself. Propose a directory or allocation service with the necessary view of assignments, then identify the new scenarios it needs; do not claim it is already implemented.',
  ],
  pitfalls: [
    'Starting with a pattern or a long class list can hide an unresolved requirement. Test the rule with concrete requests before deciding that a new abstraction earns its place.',
    'A diagram, compiling code and a successful demo answer different questions. Check observable behavior, failure paths and state preservation as well as syntax.',
    'Throwing an exception does not automatically undo earlier changes. This example preserves state because its checks precede its single state assignment.',
    'Matching an ID string is a business-rule check in this exercise, not authentication. A real application must establish who is making the request.',
    'Private fields and sequential checks do not provide concurrency safety or durable storage. Revisit those concerns when the requirements include them.',
    'Do not require yourself to finish the entire roadmap before practicing. Small exercises expose missing knowledge more precisely than a completion count.',
    'The recorded illustration displays actual Java fixtures. The browser does not implement a second reservation engine or grade your modeling exercise.',
  ],
  module: {
    path: '/parking-lot',
    title: 'Practise tracing one Parking Lot allocation',
    text: 'Use the Parking Lot source as a later practice trace: start at ParkingLotService.entry, follow repository.occupySpot, then find where the chosen ParkingSpot becomes occupied. With the real NearestSpotStrategy, a one-CAR-spot repository returns that spot once, returns null when no eligible spot remains, and can allocate it again after releaseSpot. The service translates a null allocation into SpotNotAvailableException. Our Java test checks that sequential repository trace; the linked module tests cover broader repository behavior and allocation races. ParkingSpot itself has generated setters, so allocation discipline belongs to the repository/service workflow rather than a guarded spot method. This is a comparison of responsibilities, not the same domain: parking also has vehicle types, gates, tickets, pricing and locks. It does not implement learner-owned cancellation. Read only the allocation path first; the seat lesson does not prove the whole module or reproduce its coordination rules. The module’s Interactive Simulation tab uses a separate sandbox; Entry/Exit operate on live in-memory state.',
    sources: [
      'backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java',
      'backend/src/main/java/com/lld/parkinglot/repository/ParkingLotRepository.java',
      'backend/src/main/java/com/lld/parkinglot/model/ParkingSpot.java',
      'backend/src/main/java/com/lld/parkinglot/strategy/NearestSpotStrategy.java',
      'backend/src/test/java/com/lld/parkinglot/ParkingLotRepositoryTest.java',
      'backend/src/test/java/com/lld/parkinglot/ParkingLotConcurrencyTest.java',
    ],
  },
  summaryPoints: [
    'Clarify scope and observable scenarios, assign responsibilities, trace objects and interactions, state invariants, then test and review one change.',
    'Use DSA to reason about computation and representation, LLD for internal responsibilities and behavior, and HLD for broader system organization; carry constraints across those boundaries.',
    'Practise with a small model, retrieve it without looking and revisit gaps. Explain why a rule holds and what a proposed change would affect.',
    'Choose the next lesson from evidence of a gap. Reading, reviewed marks and passing one example do not establish mastery of every design concern.',
  ],
  references: [
    { title: 'IEEE Computer Society SWEBOK Guide: Software Design (high-level and detailed design)', url: 'https://ieeecs-media.computer.org/media/education/swebok/swebok-v4.pdf' },
    { title: 'NIST Dictionary of Algorithms and Data Structures: Data Structure', url: 'https://xlinux.nist.gov/dads/HTML/dataStructure.html' },
    { title: 'Oracle Java Tutorial: What Is an Object?', url: 'https://docs.oracle.com/javase/tutorial/java/concepts/object.html' },
    { title: 'Java 17 Language Specification: The throw Statement (§14.18)', url: 'https://docs.oracle.com/javase/specs/jls/se17/html/jls-14.html#jls-14.18' },
    { title: 'Carnegie Mellon Eberly Center: Spaced Practice', url: 'https://www.cmu.edu/teaching/resources/instructionalstrategies/activelearningstrategies/spacedopractice/index.html' },
  ],
};
