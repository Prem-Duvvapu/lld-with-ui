export default {
  "title": "Policy declarations and their behavioral limits",
  "summary": "A curated Java view of the common fee boundary and four implementations. The deliberately broken implementation has the same realization connector as the conforming ones.",
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
      "name": "PickupFee",
      "kind": "public final class",
      "source": "solid/PickupFee.java",
      "description": "Stores a required conforming base, subtracts 100 cents and floors at zero.",
      "fields": [
        "- base: FeePolicy {final}"
      ],
      "methods": [
        "+ PickupFee(base: FeePolicy)",
        "+ feeCents(weightGrams: int): int"
      ]
    },
    {
      "name": "FreeFee",
      "kind": "public final class",
      "source": "solid/FreeFee.java",
      "description": "Returns zero for every valid weight; rejects invalid inputs.",
      "fields": [],
      "methods": [
        "+ feeCents(weightGrams: int): int"
      ]
    },
    {
      "name": "BulkyOnlyFee",
      "kind": "public final class",
      "source": "solid/BulkyOnlyFee.java",
      "description": "Intentionally violates the accepted-input promise by rejecting valid weights 1..1000. Signature realization is not behavioral substitutability.",
      "fields": [],
      "methods": [
        "+ feeCents(weightGrams: int): int"
      ]
    }
  ],
  "relationships": [
    {
      "to": "FeePolicy",
      "kind": "Realization",
      "explanation": "The source declares implements and supplies feeCents under the written policy contract.",
      "from": "StandardFee"
    },
    {
      "to": "FeePolicy",
      "kind": "Realization",
      "explanation": "The source declares implements and supplies feeCents under the written policy contract.",
      "from": "PickupFee"
    },
    {
      "to": "FeePolicy",
      "kind": "Realization",
      "explanation": "The source declares implements and supplies feeCents under the written policy contract.",
      "from": "FreeFee"
    },
    {
      "to": "FeePolicy",
      "kind": "Realization",
      "explanation": "The source declares implements and supplies feeCents. This connector describes the Java signature relationship; BulkyOnlyFee still violates the written behavioral contract.",
      "from": "BulkyOnlyFee"
    },
    {
      "from": "PickupFee",
      "to": "FeePolicy",
      "kind": "Association",
      "explanation": "The constructor rejects null and retains the same supplied policy in base. The contract assumes a conforming base; the wrapper does not repair an arbitrary violating implementation.",
      "multiplicity": "Each PickupFee → exactly 1 base policy; each policy ← 0..* wrappers.",
      "navigation": "PickupFee → its base field. No reverse reference is stored."
    }
  ],
  "notes": [
    "The dashed realization connector proves declared implements, not LSP. The 1-gram rejection is the behavioral counterexample.",
    "StandardFee.requireWeight is a package-access static helper also used by the other policies. Those concrete source dependencies are omitted from this focused view, so it is not a claim of complete DIP.",
    "CounterExamples, SolidDemo, implicit constructors and JDK utility declarations are omitted. The separate code lesson models the client and interface split. The conceptual SOLID pictures above show different relations and are not this Java model.",
    "No association here claims composition ownership, automatic destruction, or a JVM memory layout."
  ]
};
