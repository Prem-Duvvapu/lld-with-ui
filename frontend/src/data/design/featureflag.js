export default {
  title: 'Feature Flag — Design Details',
  requirements: [
    'Create, enable/disable, and delete a flag by a unique key.',
    'Attach an arbitrary targeting rule tree to a flag: by country, by user id, by an arbitrary attribute, by percentage rollout, and boolean combinations (AND/OR/NOT) of all of the above.',
    'Evaluate a flag for a given user context and get back not just true/false but a human-readable explanation of why.',
    'A disabled flag (the "kill switch") always evaluates to false, regardless of its configured targeting rule — no rule tree needs to be discarded to turn a feature off.',
    'Updating a flag\'s rule tree must never be observed mid-update: a concurrent evaluate() call must see either the fully-old or the fully-new rule tree, never a torn mix of the two, and must never throw.',
  ],
  entities: [
    {
      name: 'FeatureFlagService',
      description: 'Facade the controller delegates to wholesale. Owns the production FeatureFlagRepository plus a completely separate, isolated sandbox repository (and its own event log) for the /sim/* engine.',
      fields: [{ name: 'repository', type: 'FeatureFlagRepository', description: 'In-memory store of live flags' }],
      methods: [
        { name: 'updateRules(key, newRoot)', returns: 'FeatureFlag', description: 'Builds an entirely new tree elsewhere and swaps it in with a single volatile write — never mutates the tree currently hanging off this flag' },
        { name: 'evaluate(key, ctx)', returns: 'EvaluationResult', description: 'Short-circuits to false if disabled; otherwise reads the rule tree once and evaluates it' },
      ],
    },
    {
      name: 'FeatureFlag',
      description: 'A flag\'s whole targeting logic is one composite Condition tree hanging off a single field. enabled is a global kill switch: when false, evaluation always returns false regardless of the rule tree.',
      fields: [
        { name: 'enabled', type: 'volatile boolean', description: 'The kill switch' },
        { name: 'rule', type: 'volatile Condition', description: 'The whole targeting logic — a single volatile write swaps generations atomically' },
      ],
      methods: [{ name: 'getRuleDescription()', returns: 'String', description: 'Derived, explanatory view of the current rule tree — never a black box' }],
    },
    {
      name: 'Condition',
      stereotype: 'interface',
      description: 'Composite pattern participant. Every leaf and composite implements evaluate(ctx) and describe() identically, so AndCondition/OrCondition can hold any mix of leaves and other composites.',
      fields: [],
      methods: [
        { name: 'evaluate(ctx)', returns: 'boolean', description: '' },
        { name: 'describe()', returns: 'String', description: 'Human-readable, used to build EvaluationResult\'s explanation' },
      ],
    },
    {
      name: 'CountryCondition / UserIdCondition / AttributeEqualsCondition / PercentageRolloutCondition',
      description: 'The four leaf conditions. PercentageRolloutCondition hashes the user id into a stable [0,100) bucket so the same user always lands on the same side of a given percentage, rather than a fresh coin-flip on every call.',
      fields: [], methods: [],
    },
    {
      name: 'AndCondition / OrCondition / NotCondition',
      description: 'The three composite conditions. Children are copied into an unmodifiable list at construction and never mutated afterwards — that immutability, combined with FeatureFlag.rule\'s volatile swap, is what makes concurrent evaluation race-free without any lock on the read path.',
      fields: [], methods: [],
    },
    {
      name: 'ConditionTreeBuilder',
      description: 'Factory that turns a validated RuleNodeDto tree (the wire shape Jackson deserializes request bodies into, since Condition itself has no polymorphic type info) into a real, immutable Condition composite. Every rejection is an InvalidRuleException, never a bare NPE or ClassCastException.',
      fields: [], methods: [{ name: 'build(dto)', returns: 'Condition', description: '' }],
    },
    {
      name: 'UserContext / EvaluationResult',
      description: 'UserContext is the read-only input to evaluation (userId, country, an arbitrary attributes map). EvaluationResult is the output: a boolean plus a full-sentence explanation naming the flag, the rule, and the verdict.',
      fields: [], methods: [],
    },
  ],
  designPatterns: [
    { name: 'Composite Pattern', used: true, explanation: 'Condition is the component; the four leaves and three composites (And/Or/Not) share one interface, so a rule tree of arbitrary depth evaluates through one recursive call with no type-checking at any level.' },
    { name: 'Factory Pattern', used: true, explanation: 'ConditionTreeBuilder resolves a wire-format RuleNodeDto tree to the right Condition implementations in one place, instead of the controller or service branching on a type string.' },
    { name: 'Facade Pattern', used: true, explanation: 'FeatureFlagService is the single entry point the controller talks to, hiding the production/sandbox repository split behind it.' },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'FeatureFlagRepository only stores and looks up flags; all targeting logic lives in the Condition tree; all wire-format translation lives in ConditionTreeBuilder.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A new targeting rule kind is a new Condition implementation plus one ConditionTreeBuilder branch — FeatureFlagService.evaluate() never changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every Condition, leaf or composite, is fully interchangeable from a parent composite\'s point of view; nothing downcasts to a concrete type.' },
  ],
  oopConcepts: [
    { name: 'Composition', description: 'AndCondition/OrCondition hold a List<Condition> of arbitrary children — any mix of leaves and further composites — rather than a fixed, named set of fields.' },
    { name: 'Polymorphism', description: 'evaluate() and describe() dispatch to completely different logic per concrete Condition without a single instanceof check anywhere in the tree-walking code.' },
    { name: 'Immutability', description: 'A Condition, once built, is never mutated — updateRules always builds an entirely new tree and swaps the volatile reference, rather than editing an existing node\'s children in place.' },
  ],
  extensibility: [
    { area: 'Time-window targeting (a rule only active between two instants)', description: 'A new TimeWindowCondition leaf plus one ConditionTreeBuilder branch — the composite structure is untouched.', difficulty: 'Easy' },
    { area: 'Per-flag audit log of who changed what rule when', description: 'FeatureFlagService.updateRules would append to a history list alongside the volatile swap; a small, additive change.', difficulty: 'Medium' },
    { area: 'Gradual rollout that remembers prior bucket assignments across a percentage change', description: 'Currently a stable hash bucket is recomputed fresh from userId every call; persisting explicit per-user overrides is a materially different storage model.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'PercentageRolloutCondition is a hash-based bucket, not a literal random sample — deterministic per user id, at the cost of not being resamplable without changing the flag\'s rollout salt.',
    'A rule update always rebuilds the entire tree from scratch rather than patching one node — simpler and race-free (one volatile write), at the cost of the caller having to resend a complete tree even for a one-leaf change.',
    'Range syntax and time-window rules are out of scope for the four leaf condition types shipped here — a deliberate scope cut, not a silent gap.',
  ],
  summary: 'A feature-flag service whose whole targeting logic is one Composite Condition tree hanging off a single volatile field, so a concurrent evaluate() can never observe a torn mix of two rule generations — the whole story is proven with a 250-round repeated concurrency test, not a single lucky pass, after a genuine regression in an earlier draft (an in-place child mutation) was caught by exactly that test.',
  highlights: [
    'A real Composite pattern: four leaf conditions and three composites (And/Or/Not) share one Condition interface, so an arbitrarily nested rule tree evaluates through one recursive call.',
    'The concurrency guarantee: FeatureFlag.rule is volatile and updateRules always swaps in a brand-new tree rather than mutating an existing one — a single volatile write is atomic, so a reader always sees either the fully-old or fully-new generation.',
    'A hash-bucketed percentage rollout that is deterministic per user id, not a fresh coin-flip on every evaluate() call.',
    'A ConditionTreeBuilder factory that turns a loosely-typed wire format into a validated, immutable Condition tree, rejecting every malformed shape as a readable InvalidRuleException rather than a 500.',
  ],
};
