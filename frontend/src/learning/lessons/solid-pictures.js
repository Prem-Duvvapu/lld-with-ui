import classModel from '../class-models/solid-pictures';
import { code, run, output, snapshots, diagram, references } from '../solidLessonAssets';

export default {
  "id": "solid-pictures",
  "summary": "Understand all five SOLID principles through one parcel counter. Compare before-and-after pictures, trace what each arrow actually means, and use observable promises to explain whether a change helps.",
  "prerequisites": "Abstraction, Polymorphism, Dependency and Composition: distinguish a contract from an implementation, runtime dispatch from a declared link, and a stored collaborator from a temporary use. The conceptual maps below are not UML; the separate class model shows curated Java declarations.",
  "objectives": [
    "Identify the independent design question behind each letter: reasons to change, extension boundary, substitutability, client needs and dependency direction.",
    "Explain each before/after map using explicit requirements and preserved behavior rather than treating more boxes as better design.",
    "Distinguish signature compatibility, allowed behavioral variation and a broken contract, then transfer the reasoning to another domain."
  ],
  "problem": "A parcel counter quotes whole-gram weights from 1 through 2000. Standard fees are 300 cents through 1000 g and 500 cents above it. Pickup reduces a conforming base fee by 100 cents, never below zero; an approved free policy returns zero. A valid fee policy accepts every supported weight, returns 0..2000 cents, rejects other ints with the specified IllegalArgumentException message, and has no externally visible quote mutation. Pricing staff change fees; support staff change receipt wording independently. Online users need quotes, while a separate desk client requests receipt text. Which boundary does each requirement justify?",
  "explanation": [
    {
      "title": "Read a picture as an argument, not a verdict",
      "text": "Start with the selected question and contract. The boxes identify responsibilities or API promises; each arrow has a written relation such as constructs, asks for cents or implements quoting. These maps are intentionally conceptual. An arrow pointing at a box is not automatically UML realization, ownership or runtime call order. Switch among the five principles and compare before with after. The complete text explanation retains every picture even while one is selected. The class model later shows the narrower, typed Java relationships."
    },
    {
      "title": "S — isolate independent change pressures",
      "text": "In this scenario pricing staff request fee-band changes and support staff request wording changes. CoupledCounter.receipt mixes both decisions. The revised QuoteService coordinates a FeePolicy and ReceiptFormatter. The standard 1000-gram receipt remains Parcel 1000g: 300c. SRP guides the grouping of decisions that change together; it does not demand one method per class. The split is justified here by the explicitly independent change pressures. If two details always change together, separating them mechanically can make maintenance harder."
    },
    {
      "title": "O — name what is open and what stays stable",
      "text": "SwitchCounter contains branches that construct STANDARD and PICKUP policies. To add FREE there, this dispatch method would need an edit. QuoteService instead calls the existing FeePolicy boundary. A new FreeFee can be supplied by the construction site without editing the service. This is closure with respect to new conforming fee algorithms, not immunity to every change. The caller still chooses a concrete policy and tests still grow. A new operation, a new input range or a changed policy promise may require a new boundary. An interface should serve actual variation, not speculative plugins."
    },
    {
      "title": "L — distinguish a Java signature from a behavioral promise",
      "text": "All four fee classes declare implements FeePolicy. StandardFee, PickupFee over a conforming base, and FreeFee accept every promised weight. They may return different prices: 300, 200 and 0 at one gram are all within the written result range. BulkyOnlyFee compiles too, but it throws for one gram. That adds a precondition the contract did not allow. A caller reasoning only from FeePolicy can therefore fail unexpectedly. LSP asks about the promised behavior, including valid inputs, allowed outputs, invariants, failures and effects. Signature realization alone is insufficient."
    },
    {
      "title": "I — let a client ask for the capability it needs",
      "text": "AllInOneStation bundles quoteCents and printReceipt. OnlineStation can quote but throws UnsupportedOperationException when asked to print. The revised QuoteReader and ReceiptPrinter express two coherent client capabilities. OnlineQuote implements the former and has no printer method; DeskPrinter implements the latter and returns receipt text. This is a smaller, honest API for each client, not a way to make unsupported behavior succeed. One implementation could support both interfaces if it actually offered both capabilities. Choosing interfaces by client role is more useful than splitting every method automatically."
    },
    {
      "title": "D — draw source dependencies toward the required contract",
      "text": "DirectCounter constructs StandardFee internally. The revised QuoteService stores FeePolicy, while StandardFee, PickupFee and FreeFee implement that application-owned fee boundary. The application chooses a concrete object at construction time; the workflow calls through the contract at runtime. DIP concerns which side defines and depends on the needed abstraction. Constructor injection makes that choice possible but is not a complete proof of inversion. QuoteService still has a concrete ReceiptFormatter, and the policy implementations use StandardFee.requireWeight as a shared helper. The claim is deliberately limited to the fee-selection boundary."
    },
    {
      "title": "Use the same case to keep the principles distinct",
      "text": "The same refactoring can answer several questions: fee/format separation addresses SRP, a supplied algorithm supports a named OCP extension, and the FeePolicy dependency addresses a narrow DIP boundary. Those benefits do not establish LSP until implementations honor the contract. ISP concerns the quote/printer client split rather than the number of price algorithms. The intentionally invalid OnlineStation printing promise also illustrates why capabilities and behavior interact. Name the requirement and evidence for each claim instead of counting patterns, interfaces or boxes."
    },
    {
      "title": "Follow pictures with independently checked behavior",
      "text": "Choose each recorded step and inspect the exact Java beside it. The shared demo runs all five cases. Tests compile the displayed Java with JDK 17, characterize fixed boundary values and invalid inputs, check the deliberately broken substitutes, and compare output and recorded scalar fields with execution. These checks give evidence for this bounded example; they do not prove universal substitutability or a production architecture. Continue to SOLID Principles with Code to design contract tests, inspect construction sites and justify which changes should remain local."
    }
  ],
  "quiz": {
    "prompt": "At 1 gram StandardFee returns 300, PickupFee returns 200, FreeFee returns 0, and BulkyOnlyFee throws. Which statement follows from the written FeePolicy contract?",
    "options": [
      {
        "id": "contract",
        "text": "Different valid prices are allowed; BulkyOnlyFee breaks the promised input domain",
        "feedback": "Correct. Every supported weight must be accepted and the returned cents must stay within 0..2000. The contract permits differing prices, but not rejection of 1 gram.",
        "correct": true
      },
      {
        "id": "same-price",
        "text": "Every implementation must return 300, so pickup and free break substitution",
        "feedback": "That would be true only if FeePolicy promised the StandardFee formula. Its written result contract permits0..2000 cents. StandardFee adds its own particular300/500 price rule."
      },
      {
        "id": "signature",
        "text": "All four are valid substitutes because Java accepts their implements declarations",
        "feedback": "Java verifies the declared method signature and types. It does not prove the promised input domain or effect constraints. BulkyOnlyFee rejects 1 gram and violates that behavioral promise."
      },
      {
        "id": "remove-input",
        "text": "Change the contract to exclude small parcels without changing any clients",
        "feedback": "That would remove a promise existing clients can rely on. You must examine and migrate those clients or use a different contract; silently narrowing the input domain does not fix their failure."
      }
    ]
  },
  "exercise": "Independently model a community-room quotation service. It accepts 1..6 guests and durations30,60,90 or 120 minutes; charges400 cents per30-minute block, independent of guest count; and neither books nor charges. A second approved subsidized policy returns 0 for the same valid inputs. Front-desk clients need receipt text and web clients need only quotes. Pricing and wording are changed by different business groups. Draw five before/after conceptual pictures, state the accepted-input/rejection/effect contract, and identify a deliberately invalid policy that rejects one promised input. Label each relation and justify the smallest useful change. Do not transplant the parcel diagrams with renamed boxes.",
  "rubric": [
    "State the shared accepted inputs, allowed result/effect constraints and invalid-input behavior before drawing. A subsidized policy may return zero without violating a contract that explicitly allows it.",
    "For SRP identify the two independent change pressures and preserve current results during extraction; retain a coordinator if it expresses a coherent workflow.",
    "For OCP show where the subsidized policy is selected and what service code stays stable. For DIP show actual source dependency direction and who owns the contract; identify concrete dependencies that remain.",
    "For LSP choose a supported input such as one guest for 30 minutes, show the broken substitute rejects it, and explain why matching signatures do not repair the promise.",
    "For ISP separate the quotation and receipt-text client capabilities. A client that needs only quotes must not require a print method or unsupported stub.",
    "Write independent acceptance cases: fees 400/800/1200/1600 for the standard policy, zero for the subsidy, invalid guests0/7 and invalid duration31. Explain boundaries, tradeoffs and what each diagram deliberately omits."
  ],
  "module": {
    "path": "/parking-lot",
    "title": "Trace a real policy boundary in Parking Lot",
    "text": "Inspect ParkingLotService, PricingStrategy and PricingStrategyFactory. The factory receives real hourly, flat and dynamic implementations, registers them in an EnumMap and selects one for the service to call. Adding a policy still changes registration and the enum; that limitation matters when discussing OCP. The service depends on an injected factory, so this is not identical to the lesson client directly receiving FeePolicy. Trace one real selected calculation and identify the consumer, contract and construction/selection site. This supports a bounded extension/dependency exercise; it does not establish every SOLID principle, all subtype contracts or the whole module’s quality. Preserve live/sandbox boundaries and locks.",
    "sources": [
      "backend/src/main/java/com/lld/parkinglot/service/ParkingLotService.java",
      "backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategy.java",
      "backend/src/main/java/com/lld/parkinglot/strategy/PricingStrategyFactory.java",
      "backend/src/test/java/com/lld/parkinglot/ParkingLotPricingStrategyTest.java"
    ]
  },
  "summaryPoints": [
    "Ask a different explicit design question for each letter; an interface or pattern name does not prove all five.",
    "Keep valid behavior stable during a refactoring and state the limited extension axis when adding a capability.",
    "Check behavioral promises independently, keep client APIs honest, and explain which concrete dependencies and change costs remain."
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
