---
name: class-diagram
description: Create or improve a module's UML class diagram data in frontend/src/data/diagrams/<module>.js — classes, fields, methods, stereotypes and relationships rendered by the ClassDiagram component. Use when the user asks to add, fix, or improve a class diagram for an LLD module.
---

# Create or improve a class diagram

Diagram content lives in **one file per module**: `frontend/src/data/diagrams/<key>.js`,
registered once in the `classDiagrams.js` barrel. Reference: `data/diagrams/splitwise.js`.

## Shape

```js
// classDiagrams — <key>
export default {
  title: '<Module> — Class Diagram',
  classes: [
    {
      name: 'SplitwiseService',
      stereotype: 'singleton',              // optional: 'singleton' | 'enum' | 'interface' | 'abstract'
      fields: [
        '- repository: SplitwiseRepository',
        '- lock: ReentrantLock'
      ],
      methods: [
        '+ addExpense(desc, amount, paidBy, groupId, splits): Expense',
        '+ getSimplifiedDebts(groupId): List<SuggestedSettlement>'
      ]
    }
  ],
  relationships: [
    { from: 'EqualSplitStrategy', to: 'SplitStrategy', label: 'implements', dashed: true },
    { from: 'SplitStrategyFactory', to: 'SplitStrategy', label: 'creates' },
    { from: 'Expense', to: 'Split', label: 'contains' }
  ]
};
```

UML visibility prefixes: `-` private, `+` public, `#` protected. Methods carry the return type
after a colon. `dashed: true` marks implements/realizes edges.

## The rule that breaks diagrams silently

**Every `from` and `to` must exactly match a `name` in the same file's `classes` array.**

The renderer resolves endpoints with `container.querySelector('[data-class="..."]')` and
`.filter(Boolean)` — an edge pointing at an undeclared class is **dropped with no error**. This
has already happened once in production: `diagrams/atm.js` referenced `BankingService`, a real
backend class that was never declared in the diagram's class list, so that relationship silently
vanished from the rendered graph.

`designDataCoverage.test.js` now asserts this. If it fails, you either misspelled an endpoint or
forgot to declare a class.

## Making the diagram accurate

Read the backend package before writing — `backend/src/main/java/com/lld/<key>/`. The diagram
must reflect the code that exists, not the code the README describes.

- Include the facade service, the domain models, the pattern participants (strategy interface +
  its implementations + the factory), and the status enums.
- Omit controllers and DTOs unless the module's design is genuinely about its API surface.
- Show the **lock and concurrency fields** — `ReentrantLock`, `ConcurrentHashMap`,
  `AtomicInteger`. They are the interesting part of most of these designs and are exactly what an
  interviewer asks about.
- 8–14 classes is the readable range. Beyond that the graph layout gets crowded.

## Relationship labels

Use domain language, not UML jargon: `'contains'`, `'creates'`, `'paid by'`, `'assigned to'`,
`'has type'`, `'implements'`, `'guards'`, `'notifies'`. The label appears on the edge, and
`'aggregation'` tells a reader far less than `'contains'`.

## Register and verify

Add the export to the `classDiagrams.js` barrel — **exactly once**. A second key for the same
module is how JavaScript silently discarded 653 lines of content before (RCA-002), and a test
now guards it.

```bash
cd frontend && npx vitest run src/__tests__/designDataCoverage.test.js
```

If the module is listed in that test's `PENDING_DESIGN_CONTENT` allowlist and you have now
written full content, remove it from the list.

Pair this with the `design-details` skill — the two files are usually written together.
