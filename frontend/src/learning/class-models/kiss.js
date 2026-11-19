export default {
  title: 'Direct policy and rule-plumbing alternative',
  summary: 'Two independent public classes offer the same feeCents operation. Only RuleBasedParcelFees retains Rule objects; the direct ParcelFees has no fields or rule collaborators.',
  classes: [{
    name: 'RuleBasedParcelFees', kind: 'public final class', source: 'kiss/RuleBasedParcelFees.java',
    description: 'The deliberately indirect alternative validates weight, then returns the result of the first matching configured rule.',
    fields: ['- rules: List<Rule> {final}'],
    methods: ['+ feeCents(weightGrams: int): int'],
  }, {
    name: 'RuleBasedParcelFees.Rule', kind: 'private static final class', source: 'kiss/RuleBasedParcelFees.java',
    description: 'Nested rule holding an int condition callback and an int calculation callback. static means a Rule needs no enclosing policy instance reference.',
    fields: ['- condition: IntPredicate {final}', '- calculation: IntUnaryOperator {final}'],
    methods: ['- Rule(condition: IntPredicate, calculation: IntUnaryOperator)', '- matches(weightGrams: int): boolean', '- evaluate(weightGrams: int): int'],
  }, {
    name: 'ParcelFees', kind: 'public final class', source: 'kiss/ParcelFees.java',
    description: 'Direct alternative: reject unsupported weights, then choose between the two fixed fees. No fields or mutable quote state.',
    fields: [], methods: ['+ feeCents(weightGrams: int): int'],
  }],
  relationships: [{
    from: 'RuleBasedParcelFees', to: 'RuleBasedParcelFees.Rule', kind: 'Association',
    explanation: 'The rules field retains two privately constructed Rule references in list order. The loop calls matches and evaluate. This line describes retained references; it does not claim a domain lifetime/deletion contract.',
    multiplicity: 'Each RuleBasedParcelFees → exactly 2 Rule objects in the displayed fixed configuration.',
    navigation: 'RuleBasedParcelFees → its Rule list; the static nested Rule declares no back-reference to the outer object.',
  }],
  notes: [
    'These are alternatives in a refactoring comparison. There is no inheritance, realization or dependency between ParcelFees and RuleBasedParcelFees merely because their public methods have matching signatures.',
    'Nested declaration is a Java access/organization choice; it is not sufficient evidence for a UML composition diamond or automatic JVM destruction. The association shows only the retained source-level link.',
    'List, IntPredicate and IntUnaryOperator are JDK types named in fields and explained in the lesson; their declarations and the KissDemo formatting helpers are omitted as boxes. Implicit public no-argument constructors of the two public classes are also omitted.',
    'The rule list is configured once with first-match semantics. Its two predicates overlap on 1..1000, so list order is behaviorally significant. final fields alone do not prove callback purity; the displayed lambdas just compare or return constants.',
    'The direct class remains a useful named abstraction despite having no collaborators. This curated source view and its complete text alternative are not object snapshots or an execution trace.',
  ],
};
