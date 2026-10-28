export default {
  title: 'ReviewPriority enum model',
  summary: 'Three declared enum constants carry explicit weights; parsing is an operation on the enum type.',
  classes: [{
    name: 'ReviewPriority', kind: 'public enum', source: 'ReviewPriority.java', description: 'Declares LOW(1), MEDIUM(2) and HIGH(3).',
    fields: ['+ LOW: ReviewPriority {enum constant}', '+ MEDIUM: ReviewPriority {enum constant}', '+ HIGH: ReviewPriority {enum constant}', '- weight: int {final}'],
    methods: ['- ReviewPriority(weight: int) {enum constructor}', '+ getWeight(): int', '+ parse(input: String): ReviewPriority {static}'],
  }],
  relationships: [],
  noRelationships: 'The constants are instances of the same enum type, not subclasses or separate domain types.',
  notes: ['Enum constants are implicitly public static final. The constructor has implicit private access; callers cannot use new ReviewPriority.', 'parse explicitly trims and normalizes with Locale.ROOT before valueOf. Generated values() and valueOf(String), and inherited Enum members, are omitted.', 'weight is explicit domain data. ordinal position is not a stable external identifier.'],
};
