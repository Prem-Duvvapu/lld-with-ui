export default {
  "title": "Client boundaries, retained collaborators and interface split",
  "summary": "Curated declarations from CounterExamples plus the fee boundary. The model highlights actual retained links and Java implements relationships.",
  "classes": [
    {
      "name": "FeePolicy",
      "kind": "public interface",
      "source": "solid/FeePolicy.java",
      "description": "Accept all whole-gram weights 1..2000 and return 0..2000 cents without externally visible quote mutation. Invalid ints use the specified rejection.",
      "fields": [],
      "methods": [
        "+ feeCents(weightGrams: int): int {abstract}"
      ]
    },
    {
      "name": "StandardFee",
      "kind": "public final class",
      "source": "solid/StandardFee.java",
      "description": "Returns 300 cents through 1000 g and 500 cents above it, after validating the whole accepted range.",
      "fields": [],
      "methods": [
        "~ requireWeight(weightGrams: int): void {static}",
        "+ feeCents(weightGrams: int): int"
      ]
    },
    {
      "name": "CounterExamples.QuoteService",
      "kind": "public static final class",
      "source": "solid/CounterExamples.java",
      "description": "Orchestrates quotation through a supplied FeePolicy and receipt wording through a supplied formatter.",
      "fields": [
        "- policy: FeePolicy {final}",
        "- formatter: ReceiptFormatter {final}"
      ],
      "methods": [
        "+ QuoteService(policy: FeePolicy, formatter: ReceiptFormatter)",
        "+ quoteCents(weightGrams: int): int",
        "+ receipt(weightGrams: int): String"
      ]
    },
    {
      "name": "CounterExamples.ReceiptFormatter",
      "kind": "public static final class",
      "source": "solid/CounterExamples.java",
      "description": "Validates the displayed units and renders the receipt string. No physical printer is contacted.",
      "fields": [],
      "methods": [
        "+ format(weightGrams: int, feeCents: int): String"
      ]
    },
    {
      "name": "CounterExamples.QuoteReader",
      "kind": "public interface",
      "source": "solid/CounterExamples.java",
      "description": "Nested quotation-only contract. Nested member interfaces are implicitly static.",
      "fields": [],
      "methods": [
        "+ quoteCents(weightGrams: int): int {abstract}"
      ]
    },
    {
      "name": "CounterExamples.ReceiptPrinter",
      "kind": "public interface",
      "source": "solid/CounterExamples.java",
      "description": "Nested client contract for producing receipt text in this teaching case.",
      "fields": [],
      "methods": [
        "+ printReceipt(weightGrams: int): String {abstract}"
      ]
    },
    {
      "name": "CounterExamples.OnlineQuote",
      "kind": "public static final class",
      "source": "solid/CounterExamples.java",
      "description": "Implements quotation without advertising any printer method.",
      "fields": [],
      "methods": [
        "+ quoteCents(weightGrams: int): int"
      ]
    },
    {
      "name": "CounterExamples.DeskPrinter",
      "kind": "public static final class",
      "source": "solid/CounterExamples.java",
      "description": "Retains a QuoteService and delegates receipt generation.",
      "fields": [
        "- counter: QuoteService {final}"
      ],
      "methods": [
        "+ DeskPrinter(counter: QuoteService)",
        "+ printReceipt(weightGrams: int): String"
      ]
    },
    {
      "name": "CounterExamples.DirectCounter",
      "kind": "public static final class",
      "source": "solid/CounterExamples.java",
      "description": "Constructs and retains StandardFee internally: constructor injection is absent at this fee boundary.",
      "fields": [
        "- policy: StandardFee {final}"
      ],
      "methods": [
        "+ quoteCents(weightGrams: int): int"
      ]
    }
  ],
  "relationships": [
    {
      "from": "CounterExamples.QuoteService",
      "to": "FeePolicy",
      "kind": "Association",
      "explanation": "Constructor injection retains the required policy. Runtime dispatch calls feeCents on this supplied object.",
      "multiplicity": "Each service → exactly 1 policy; each policy ← 0..* services.",
      "navigation": "QuoteService → policy."
    },
    {
      "from": "CounterExamples.QuoteService",
      "to": "CounterExamples.ReceiptFormatter",
      "kind": "Association",
      "explanation": "The service retains the required concrete formatter. DIP is demonstrated at the fee boundary, not at every collaborator.",
      "multiplicity": "Each service → exactly 1 formatter; each formatter ← 0..* services.",
      "navigation": "QuoteService → formatter."
    },
    {
      "from": "CounterExamples.DeskPrinter",
      "to": "CounterExamples.QuoteService",
      "kind": "Association",
      "explanation": "DeskPrinter retains the required counter and delegates to its receipt method.",
      "multiplicity": "Each printer → exactly 1 counter; each counter ← 0..* printers.",
      "navigation": "DeskPrinter → counter."
    },
    {
      "from": "CounterExamples.DirectCounter",
      "to": "StandardFee",
      "kind": "Association",
      "explanation": "The initializer constructs and retains a concrete StandardFee. No abstraction is supplied at this boundary.",
      "multiplicity": "Each direct counter → exactly 1 internally created StandardFee.",
      "navigation": "DirectCounter → policy."
    },
    {
      "from": "CounterExamples.OnlineQuote",
      "to": "StandardFee",
      "kind": "Dependency",
      "explanation": "quoteCents constructs a temporary StandardFee for its call. This ISP example still has a concrete dependency and is not a claim of complete DIP."
    },
    {
      "from": "CounterExamples.QuoteService",
      "to": "CounterExamples.QuoteReader",
      "kind": "Realization",
      "explanation": "The concrete nested class implements the indicated smaller public client interface."
    },
    {
      "from": "CounterExamples.OnlineQuote",
      "to": "CounterExamples.QuoteReader",
      "kind": "Realization",
      "explanation": "The concrete nested class implements the indicated smaller public client interface."
    },
    {
      "from": "CounterExamples.DeskPrinter",
      "to": "CounterExamples.ReceiptPrinter",
      "kind": "Realization",
      "explanation": "The concrete nested class implements the indicated smaller public client interface."
    },
    {
      "from": "StandardFee",
      "to": "FeePolicy",
      "kind": "Realization",
      "explanation": "StandardFee implements the application fee boundary. This is a signature link; the written behavior is checked independently."
    }
  ],
  "notes": [
    "CounterExamples is a namespace holder with a private constructor. Nested public static classes do not need an enclosing CounterExamples instance. Interfaces nested in a class are implicitly static.",
    "The intentionally broad AllInOneStation/OnlineStation, historical CoupledCounter, SwitchCounter, other policy implementations and demo plumbing are omitted from this focused model. Their complete displayed source remains authoritative.",
    "Association highlights a retained reference and also implies a source dependency. It does not by itself establish exclusive ownership, composition, immutability or destruction.",
    "The injected policy is a narrow DIP boundary; the concrete ReceiptFormatter and OnlineQuote construction remain concrete dependencies. ISP and DIP are separate questions."
  ]
};
