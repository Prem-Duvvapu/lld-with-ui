export default {
  "kind": "principles",
  "title": "Five SOLID principles: before and after",
  "summary": "Follow one parcel quotation scenario through five different design questions. These conceptual maps are distinct from the source-curated Java class model below.",
  "principles": [
    {
      "id": "srp",
      "name": "Single Responsibility",
      "question": "Who requests each change?",
      "before": {
        "title": "Before: two change pressures in one place",
        "nodes": [
          {
            "id": "coupled",
            "title": "CoupledCounter",
            "lines": [
              "Pricing team: fee bands",
              "Support team: receipt wording"
            ]
          }
        ],
        "edges": [],
        "caption": "One receipt method contains both fee arithmetic and presentation."
      },
      "after": {
        "title": "After: separate the independent decisions",
        "nodes": [
          {
            "id": "service",
            "title": "QuoteService",
            "lines": [
              "Orchestrates one quote"
            ]
          },
          {
            "id": "policy",
            "title": "FeePolicy / StandardFee",
            "lines": [
              "Owns the price rule"
            ]
          },
          {
            "id": "format",
            "title": "ReceiptFormatter",
            "lines": [
              "Owns receipt wording"
            ]
          }
        ],
        "edges": [
          {
            "from": "service",
            "to": "policy",
            "label": "asks for cents"
          },
          {
            "from": "service",
            "to": "format",
            "label": "formats the result"
          }
        ],
        "caption": "At 1000 g both stages return Parcel 1000g: 300c. The split preserves the current receipt."
      },
      "contract": "Pricing changes and support wording changes are independent requests in this teaching scenario. Preserve the accepted weight range and current receipt during extraction.",
      "tradeoff": "An extra class earns its place by isolating a demonstrated change pressure. SRP does not mean one method per class, one class per employee or eliminating orchestration.",
      "sourcePaths": [
        "solid/CounterExamples.java",
        "solid/StandardFee.java",
        "solid/FeePolicy.java"
      ]
    },
    {
      "id": "ocp",
      "name": "Open/Closed",
      "question": "Where does adding an approved policy require an edit?",
      "before": {
        "title": "Before: dispatch knows each option",
        "nodes": [
          {
            "id": "switch",
            "title": "SwitchCounter",
            "lines": [
              "STANDARD branch",
              "PICKUP branch"
            ]
          },
          {
            "id": "standard",
            "title": "StandardFee",
            "lines": [
              "300 / 500 cents"
            ]
          },
          {
            "id": "pickup",
            "title": "PickupFee",
            "lines": [
              "100 cents off"
            ]
          }
        ],
        "edges": [
          {
            "from": "switch",
            "to": "standard",
            "label": "constructs in STANDARD branch"
          },
          {
            "from": "switch",
            "to": "pickup",
            "label": "constructs in PICKUP branch"
          }
        ],
        "caption": "Adding FREE would require a third branch in this client."
      },
      "after": {
        "title": "After: client uses the existing boundary",
        "nodes": [
          {
            "id": "service",
            "title": "QuoteService",
            "lines": [
              "Calls feeCents"
            ]
          },
          {
            "id": "contract",
            "title": "FeePolicy",
            "lines": [
              "Accepts 1..2000 g"
            ]
          },
          {
            "id": "policies",
            "title": "StandardFee / PickupFee / FreeFee",
            "lines": [
              "300 / 200 / 0 cents at 1000 g"
            ]
          }
        ],
        "edges": [
          {
            "from": "service",
            "to": "contract",
            "label": "depends on the contract"
          },
          {
            "from": "policies",
            "to": "contract",
            "label": "supply implementations"
          }
        ],
        "caption": "Construct another service with FreeFee. Selection at the construction site changes; QuoteService does not."
      },
      "contract": "The extension axis is the fee algorithm under the same input/result contract. A new operation or changed contract can still require client edits.",
      "tradeoff": "No design is closed against every future change. Wiring, registration and tests still change. A switch is not automatically wrong when the alternatives are intentionally fixed.",
      "sourcePaths": [
        "solid/CounterExamples.java",
        "solid/FeePolicy.java",
        "solid/FreeFee.java"
      ]
    },
    {
      "id": "lsp",
      "name": "Liskov Substitution",
      "question": "Can a client rely on every promised input?",
      "before": {
        "title": "Before: a signature hides a broken promise",
        "nodes": [
          {
            "id": "client",
            "title": "FeePolicy client",
            "lines": [
              "May quote every weight 1..2000"
            ]
          },
          {
            "id": "broken",
            "title": "BulkyOnlyFee",
            "lines": [
              "Throws at valid 1 g"
            ]
          }
        ],
        "edges": [
          {
            "from": "client",
            "to": "broken",
            "label": "call compiles; contract fails"
          }
        ],
        "caption": "BulkyOnlyFee declares implements FeePolicy but strengthens the precondition to weights above 1000 g."
      },
      "after": {
        "title": "After: check each substitute against the contract",
        "nodes": [
          {
            "id": "client",
            "title": "FeePolicy client",
            "lines": [
              "All valid weights accepted",
              "Fees remain within 0..2000"
            ]
          },
          {
            "id": "standard",
            "title": "StandardFee",
            "lines": [
              "1 g → 300 cents"
            ]
          },
          {
            "id": "pickup",
            "title": "PickupFee",
            "lines": [
              "1 g → 200 cents"
            ]
          },
          {
            "id": "free",
            "title": "FreeFee",
            "lines": [
              "1 g → 0 cents"
            ]
          }
        ],
        "edges": [
          {
            "from": "client",
            "to": "standard",
            "label": "valid substitute"
          },
          {
            "from": "client",
            "to": "pickup",
            "label": "valid substitute over a conforming base"
          },
          {
            "from": "client",
            "to": "free",
            "label": "valid substitute"
          }
        ],
        "caption": "Different permitted prices are compatible with this contract. Identical prices are not a requirement."
      },
      "contract": "Accept all weights 1..2000, return a fee within 0..2000 cents, reject other ints with the specified exception/message, and perform no externally visible quote mutation.",
      "tradeoff": "Passing a few examples is evidence, not a universal mathematical proof. Java checks signatures; behavioral promises, invariants and allowed effects need their own specifications and tests. A weaker contract may support more implementations but promise less to clients.",
      "sourcePaths": [
        "solid/FeePolicy.java",
        "solid/BulkyOnlyFee.java",
        "solid/StandardFee.java",
        "solid/PickupFee.java",
        "solid/FreeFee.java"
      ]
    },
    {
      "id": "isp",
      "name": "Interface Segregation",
      "question": "Which operations does this client actually need?",
      "before": {
        "title": "Before: a broad contract forces a false promise",
        "nodes": [
          {
            "id": "broad",
            "title": "AllInOneStation",
            "lines": [
              "quoteCents",
              "printReceipt"
            ]
          },
          {
            "id": "online",
            "title": "OnlineStation",
            "lines": [
              "Quote works",
              "Printing throws unsupported"
            ]
          }
        ],
        "edges": [
          {
            "from": "online",
            "to": "broad",
            "label": "implements both operations"
          }
        ],
        "caption": "An online quote-only client is coupled to a printer capability it cannot offer."
      },
      "after": {
        "title": "After: two coherent client contracts",
        "nodes": [
          {
            "id": "online",
            "title": "OnlineQuote",
            "lines": [
              "Only quoteCents"
            ]
          },
          {
            "id": "reader",
            "title": "QuoteReader",
            "lines": [
              "Quotation client boundary"
            ]
          },
          {
            "id": "desk",
            "title": "DeskPrinter",
            "lines": [
              "Only printReceipt"
            ]
          },
          {
            "id": "printer",
            "title": "ReceiptPrinter",
            "lines": [
              "Printer client boundary"
            ]
          }
        ],
        "edges": [
          {
            "from": "online",
            "to": "reader",
            "label": "implements quoting"
          },
          {
            "from": "desk",
            "to": "printer",
            "label": "implements printing"
          }
        ],
        "caption": "OnlineQuote has no printReceipt member. DeskPrinter returns receipt text for the printer-facing client; no hardware is driven."
      },
      "contract": "The quote-only client should not require printer operations. Each implementation must fulfill the complete smaller interface it advertises.",
      "tradeoff": "Smaller interfaces should follow client needs, not a rule to create one interface per method everywhere. A class can implement several coherent interfaces when it really supports them.",
      "sourcePaths": [
        "solid/CounterExamples.java"
      ]
    },
    {
      "id": "dip",
      "name": "Dependency Inversion",
      "question": "Who owns the contract and chooses the detail?",
      "before": {
        "title": "Before: workflow fixes its concrete choice",
        "nodes": [
          {
            "id": "direct",
            "title": "DirectCounter",
            "lines": [
              "Constructs StandardFee internally"
            ]
          },
          {
            "id": "standard",
            "title": "StandardFee",
            "lines": [
              "Fixed fee implementation"
            ]
          }
        ],
        "edges": [
          {
            "from": "direct",
            "to": "standard",
            "label": "source dependency on concrete detail"
          }
        ],
        "caption": "Changing this counter to pickup pricing requires editing its internal choice."
      },
      "after": {
        "title": "After: both sides target a workflow boundary",
        "nodes": [
          {
            "id": "service",
            "title": "QuoteService",
            "lines": [
              "Needs feeCents behavior"
            ]
          },
          {
            "id": "contract",
            "title": "FeePolicy",
            "lines": [
              "Application-owned quotation contract"
            ]
          },
          {
            "id": "details",
            "title": "StandardFee / PickupFee / FreeFee",
            "lines": [
              "Details chosen by the caller"
            ]
          }
        ],
        "edges": [
          {
            "from": "service",
            "to": "contract",
            "label": "client source dependency"
          },
          {
            "from": "details",
            "to": "contract",
            "label": "implement the required boundary"
          }
        ],
        "caption": "The caller constructs concrete objects and supplies the chosen policy. Runtime calls still go from the service to the chosen detail."
      },
      "contract": "Keep the stable business workflow dependent on the fee behavior it needs. Construction knows implementations; quoteCents itself does not branch on concrete policy type.",
      "tradeoff": "Constructor injection is a mechanism, not the whole principle. QuoteService still uses concrete ReceiptFormatter and policies share a concrete weight-validation helper. This example demonstrates one boundary, not complete architectural inversion or an absence of all concrete dependencies.",
      "sourcePaths": [
        "solid/CounterExamples.java",
        "solid/FeePolicy.java",
        "solid/SolidDemo.java"
      ]
    }
  ],
  "notes": [
    "These are conceptual responsibility and contract pictures, not UML. Read each labelled arrow as its written relation; arrow direction alone is not a Java inheritance or ownership claim.",
    "The examples are teaching alternatives, not successive objects in one execution or five production subsystems. Quoting has no booking, payment, persistence or physical printing.",
    "Before and after share requirements unless an approved extension is explicitly named. BulkyOnlyFee and OnlineStation printing are intentionally broken counterexamples, never recommended substitutes.",
    "Source paths identify canonical Java displayed by both lessons. Illustration controls select authored pictures and recorded values; they do not compile or run Java in the browser."
  ]
};
