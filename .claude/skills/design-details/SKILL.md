---
name: design-details
description: Create or improve a module's design write-up in frontend/src/data/design/<module>.js — requirements, entities, design patterns, SOLID principles, OOP concepts, extensibility, trade-offs and highlights. Use when the user asks to add, fix or improve design details, design documentation or the Design Details tab of an LLD module.
---

# Create or improve design details

Design content lives in **one file per module**: `frontend/src/data/design/<key>.js`, registered
once in the `designDetails.js` barrel. Reference: `data/design/splitwise.js`.

This is the interview-prep surface of the project. It should read like what you would actually
say out loud when asked "walk me through your design."

## Shape

```js
export default {
  title: '<Module> — Design Details',
  requirements: ['<Capability>: <what it must do and the constraint>', /* 5–7 */],
  entities: [
    {
      name: 'SplitwiseService',
      description: 'Central facade coordinating ...',
      fields:  [{ name: 'lock', type: 'ReentrantLock', description: 'Mutex guarding atomic ledger updates' }],
      methods: [{ name: 'addExpense(desc, amount, paidBy, groupId, splits)', returns: 'Expense',
                  description: 'Validates and executes split calculation, updates ledger atomically' }]
    }
  ],
  designPatterns: [{ name: 'Strategy Pattern', used: true, explanation: 'Encapsulates EQUAL, PERCENTAGE and EXACT split algorithms behind SplitStrategy.' }],
  principles:     [{ name: 'Open/Closed Principle (OCP)', description: '...' }],
  oopConcepts:    [{ name: 'Polymorphism', description: '...' }],
  extensibility:  [{ area: 'Multi-Currency Support', description: '...', difficulty: 'Medium' }],  // Easy | Medium | Hard
  tradeoffs:      ['<decision> <because> <what was given up>'],
  summary: 'One paragraph: what the system does and its defining characteristics.',
  highlights: ['<the 4 things worth leading with in an interview>']
};
```

Every field is required and must be non-empty — `designDataCoverage.test.js` asserts `title`,
`requirements`, `entities` and `designPatterns` are all present and non-empty. A missing `title`
once shipped a blank page heading (caught by that test in `design/atm.js`).

## Writing content that is worth reading

**Read the backend first.** `backend/src/main/java/com/lld/<key>/`. Describe the code that
exists. Claiming a pattern the code does not implement is the most common defect in this repo,
and it is worse than claiming nothing.

- **requirements** — functional capability plus its hard constraint. "Support PERCENTAGE splits
  (must sum to 100%)" beats "Support percentage splits."
- **entities** — the facade service, domain models, pattern participants, enums. Include
  concurrency fields (`ReentrantLock`, `ConcurrentHashMap`); they are the design.
- **designPatterns** — set `used: false` with an honest explanation for a pattern that would fit
  but was not implemented. That is more useful than silence and keeps the docs truthful.
- **tradeoffs** — the highest-value section and the most often skipped. Each entry names a
  decision, its reason, and what it cost:
  > "Used a single service-level ReentrantLock for ledger updates to eliminate multi-lock
  > deadlock risk during multi-user splits" — states the alternative it rejected and why.
- **extensibility** — real next features with an honest difficulty, not aspirational ones.
- **highlights** — the four things you would lead with. Algorithms with complexity, the
  concurrency guarantee, the pattern that carries the design.

Be concrete: name the algorithm ("greedy Min-Cash-Flow, ≤ N-1 transactions"), the lock ordering
("ascending productId prevents deadlock"), the complexity ("O(N log N)").

## Register and verify

Add to the `designDetails.js` barrel **exactly once** — duplicate keys in the old shared literal
let JavaScript discard the richer entry at parse time (RCA-002).

If the key is in `PENDING_DESIGN_CONTENT` in `designDataCoverage.test.js`, remove it now.

```bash
cd frontend && npx vitest run src/__tests__/designDataCoverage.test.js
```

Pair with the `class-diagram` skill — same module, same sitting.
