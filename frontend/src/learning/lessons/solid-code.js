import classModel from '../class-models/solid-code';
import { code, run, output, snapshots, diagram, references } from '../solidLessonAssets';

export default {
  "id": "solid-code",
  "summary": "Turn the five SOLID pictures into executable Java evidence. Characterize before-and-after behavior, test a substitutability counterexample, separate quote and printer APIs, and inspect which source dependencies actually change.",
  "prerequisites": "SOLID Principles with Pictures. These are the same canonical Java files, pictures and recorded results, now read as code and contract tests rather than a second unrelated set of examples. Nested public static classes group teaching alternatives; they do not need an outer CounterExamples instance.",
  "objectives": [
    "Preserve known behavior through SRP extraction, then demonstrate an approved OCP extension through the existing fee contract.",
    "Write independent accepted-input, rejection and behavioral-substitution checks, including an intentionally failing implementation and client-specific API boundary.",
    "Trace construction, stored references and runtime calls separately, and defend a narrow DIP claim without pretending all concrete dependencies disappear."
  ],
  "problem": "Review a proposed refactoring of the parcel counter. The old standard receipt and valid price boundaries must remain unchanged. FREE is an approved new policy under the same FeePolicy promise. The team must keep the invalid bulky-only implementation out of valid clients and stop advertising unsupported printing to online quote users. Demonstrate each requirement using the displayed Java and independent expected results; agreement between two implementations alone is insufficient.",
  "explanation": [
    {
      "title": "Compile the source that the page actually displays",
      "text": "Save all seven files with the shown solid/ paths, then use the exact javac and java commands below with JDK 17. FeePolicy documents the accepted range, result range, exact invalid-input exception/message and absence of externally visible quote mutation. All values are integer grams and integer cents. SolidDemo constructs concrete choices, invokes real methods and prints a deterministic trace. The browser presents recorded results from those sources. It does not execute the Java or make the parcel rules part of the application backend."
    },
    {
      "title": "SRP: characterize a behavior before moving it",
      "text": "CoupledCounter.receipt validates the weight, calculates the standard fee and assembles the wording. QuoteService.receipt delegates fee calculation to its required policy and formatting to its required ReceiptFormatter. For the standard policy, independently expect Parcel 1000g: 300c. Also check1g,1001g and 2000g and reject 0/2001. These expectations protect the fee boundary and receipt string; comparing only old with new could preserve the same bug in both. Separate collaborators isolate the scenario’s pricing and wording change pressures while the coordinator retains one readable operation."
    },
    {
      "title": "OCP: exercise the new detail through the old client",
      "text": "SwitchCounter knows STANDARD and PICKUP strings. Its unknown-mode rejection is part of that historical API; the new design does not silently reinterpret an unknown string. QuoteService instead receives a FeePolicy. SolidDemo supplies StandardFee, PickupFee wrapping standard, and the approved FreeFee. At 1000g the results are300,200 and 0. The service contains no instanceof or mode switch. The construction site changes when a new policy is chosen. This demonstrates one extension seam; it does not claim arbitrary requirements can be added without changing existing code, configuration or tests."
    },
    {
      "title": "LSP: test the contract independently of each algorithm",
      "text": "For StandardFee, PickupFee and FreeFee, check the entire supported integer domain1..2000 against independent expected formulas and test invalid integer extremes,0 and 2001. All valid results must be within 0..2000. PickupFee requires a non-null conforming base and floors a100-cent reduction at zero; wrapping FreeFee must remain zero. BulkyOnlyFee intentionally fails the generic accepted-input promise at 1g, although its signature compiles. Catching its exception in the demo records the violation; it does not make the implementation conform. LSP permits differing outcomes when the abstraction explicitly permits that variation. Tests establish this bounded case, not universal type correctness."
    },
    {
      "title": "ISP: make an unsupported call unavailable to the wrong client",
      "text": "OnlineStation.printReceipt always throws, showing the false capability exposed by AllInOneStation. OnlineQuote implements only QuoteReader and declares no printReceipt. DeskPrinter implements ReceiptPrinter and delegates to its supplied QuoteService. A separate external Java client should compile when it calls each advertised operation. An attempted new OnlineQuote().printReceipt(1000) should fail compilation; this is intentional API evidence, not a runtime simulation. Keeping the old broad API for existing callers would require an explicit migration decision. Here both versions are teaching alternatives; the refactoring does not promise binary compatibility."
    },
    {
      "title": "DIP: inspect the source boundary, not only injection syntax",
      "text": "DirectCounter has a field declared StandardFee and constructs it internally. QuoteService stores the application-owned FeePolicy and calls feeCents without inspecting the concrete type. Its caller can supply another conforming implementation, including a focused test fake. The concrete fee implementations depend on the interface too. That direction is the useful inversion at this boundary. The implementation still knows ReceiptFormatter, and policies share StandardFee.requireWeight. Constructor injection alone does not establish full DIP or make those remaining dependencies disappear. Runtime calls still execute the selected policy implementation."
    },
    {
      "title": "Test rejection and effects as well as happy-path arithmetic",
      "text": "Validate weights 1,1000,1001 and 2000 with fixed expected fees; include invalid int extremes and the specified error message. Reuse the same object after a rejected call to check that these stateless examples remain usable. Reject null injected policies, formatters, bases and printer counters before work. Formatter must reject a negative fee or a fee above 2000. No example performs payment or hardware I/O, so tests cannot establish atomic charging, cancellation, persistence or safe printer recovery. A production dependency with external effects needs an explicit effects/error contract instead of assuming injection makes it safe."
    },
    {
      "title": "Refactor only the boundary justified by the change",
      "text": "The independent exercise should force a design decision, not a search-and-replace of class names. First write expected results and invalid-input behavior, then extract a named contract only where real variation exists. Keep a direct implementation if it already expresses the fixed requirement clearly. Compare the cost of maintaining extra types with the value of isolated changes. Explain SRP, OCP, LSP, ISP and DIP claims separately. The same class may demonstrate a useful interface split while retaining a concrete dependency; that is an honest limit, not a reason to invent an unsupported architecture claim."
    }
  ],
  "quiz": {
    "prompt": "QuoteService receives new PickupFee(new FreeFee()). What should quoteCents(1001) return, and what should quoteCents(0) do?",
    "options": [
      {
        "id": "floor-and-validate",
        "text": "Return 0 cents for 1001; reject 0 with the specified invalid-weight exception",
        "feedback": "Correct. FreeFee returns 0 for a valid weight, PickupFee floors0 minus100 at 0, and the weight guard rejects 0 before a quote. Different valid prices remain within the shared contract.",
        "correct": true
      },
      {
        "id": "negative",
        "text": "Return−100 cents for 1001; reject 0",
        "feedback": "PickupFee uses Math.max(0, base fee minus100), so a conforming free base cannot produce a negative quote. Keeping result bounds is part of the shared contract."
      },
      {
        "id": "skip-validation",
        "text": "Return 0 for both weights because free pricing needs no validation",
        "feedback": "Zero is a valid price, not permission to accept invalid input. PickupFee and FreeFee both preserve the1..2000 weight domain and specified rejection."
      },
      {
        "id": "concrete",
        "text": "The service refuses FreeFee because only StandardFee may be injected",
        "feedback": "The constructor stores FeePolicy and rejects null, not other conforming implementations. Restricting the client to StandardFee would discard the boundary demonstrated by this example."
      }
    ]
  },
  "exercise": "Implement an independent community-room quote and receipt design. Standard pricing accepts 1..6 guests and durations30,60,90 or 120 minutes and charges400 cents per30-minute block regardless of guest count. An approved subsidy policy charges0 for the same inputs. Validate guests first with IllegalArgumentException(\"guestCount must be 1..6\"), then duration with IllegalArgumentException(\"durationMinutes must be 30, 60, 90 or 120\"). Keep quote-only web clients separate from receipt-text clients. No booking, payment or stored quote history is allowed. Write the Java, an intentionally invalid substitute that rejects a valid 6-guest request, independent tests and a before/after explanation. Do not copy the parcel implementation as the solution.",
  "rubric": [
    "Specify accepted inputs, error precedence, allowed fees and absence of booking/payment effects. A signature does not express all of these requirements.",
    "Independently assert400/800/1200/1600 at 30/60/90/120 minutes for both 1 and 6 guests; assert0 for the subsidy. Do not derive expected values from the production method or merely compare implementations.",
    "Reject guest counts0/7 and invalid durations0/31/121 with exact messages. When both are invalid the guest error must win; a later valid call on the same object must still work.",
    "Use one contract-test client for all conforming policies and show the intentionally broken6-guest substitute fails that promise. Do not require equal prices across standard and subsidy.",
    "Extract receipt wording from pricing while preserving the original standard receipt. Show a new subsidized construction site without adding a pricing branch to the client.",
    "Prove the quote-only client API has no receipt/print requirement. Trace declared dependency types, creation sites and runtime calls separately; identify concrete dependencies left in the proposed design and justify their cost."
  ],
  "module": {
    "path": "/coffee-machine",
    "title": "Review the Coffee decorator contract before claiming substitution",
    "text": "CoffeeComponent exposes description, price and required ingredients. CoffeeMachine constructs actual wrappers such as ExtraShotDecorator; the composition suite checks real combinations. Inspect the interface, wrapper delegation and ingredient-map copying, then state the input, result and mutation promises a caller can rely on. A wrapper implementing the same interface does not alone prove every possible behavioral contract or all SOLID principles. Map each claim to a specific method and test; keep unverified promises as questions. The coffee model uses its own recipes and numeric units, not this lesson’s gram/cent policy.",
    "sources": [
      "backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeComponent.java",
      "backend/src/main/java/com/lld/coffeemachine/decorator/CoffeeDecorator.java",
      "backend/src/main/java/com/lld/coffeemachine/decorator/ExtraShotDecorator.java",
      "backend/src/main/java/com/lld/coffeemachine/model/CoffeeMachine.java",
      "backend/src/test/java/com/lld/coffeemachine/CoffeeDecoratorCompositionTest.java"
    ]
  },
  "summaryPoints": [
    "Characterize the old behavior before extracting responsibilities; test a new capability through the intended stable boundary.",
    "Behavioral substitution needs explicit accepted-input, output, failure and effect promises. A compiling signature is only part of the evidence.",
    "Separate client capabilities and source dependency direction deliberately. Keep construction, concrete dependencies and remaining tradeoffs visible."
  ],
  "pitfalls": [
    "The before/after maps are authored conceptual pictures, not UML, execution traces or heap layouts. The separate class model uses typed Java relationships. Neither visual proves a behavioral contract by itself.",
    "Quotes accept integer weights 1..2000 grams and return integer cents. They do not reserve a parcel, debit an account, persist data, contact a carrier or physically print. Java int excludes null; an HTTP adapter would need its own type/body validation.",
    "BulkyOnlyFee and OnlineStation printing are deliberately invalid teaching alternatives. A matching signature does not make their broken promises acceptable. Do not copy them into a valid implementation.",
    "The illustration contains Java results recorded and checked by the test suite. Selecting a picture or recorded step does not run a JVM. The two lessons deliberately reuse one source/output/fixture set so their explanations stay connected.",
    "A retained final reference is not proof of immutable state or exclusive ownership. The policy boundary assumes a conforming supplied implementation; injection cannot repair arbitrary side effects, invalid results or new rejection conditions.",
    "SOLID is a set of design questions with costs and boundaries. Do not remove required validation or locks, add an interface for every class, or claim an entire module satisfies all five principles because it uses one pattern."
  ],
  classModel, diagram, code, run, output, references,
  visual: { title: "Five recorded Java checks", summary: "Recorded Java results · integer grams and cents · no booking, payment or hardware I/O", snapshots },
};
