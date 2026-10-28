export default {
  title: 'One delivery rule, independent quote records',
  summary: 'The refactored OrderQuotes delegates fee decisions to DeliveryFeeRule. Each quote book retains its own records; RewardRule expresses independent loyalty knowledge.',
  classes: [{
    name: 'BeforeQuotes', kind: 'public final class', source: 'dry/BeforeQuotes.java',
    description: 'Historical baseline and deliberately drifted versions; not called by the refactored quote book.',
    fields: [],
    methods: ['- BeforeQuotes()', '+ originalPreview(subtotalCents: int): int {static}', '+ originalCheckout(subtotalCents: int): int {static}', '+ updatedPreview(subtotalCents: int): int {static}', '+ staleCheckout(subtotalCents: int): int {static}', '- requireSubtotal(subtotalCents: int): void {static}'],
  }, {
    name: 'DeliveryFeeRule', kind: 'public final class', source: 'dry/DeliveryFeeRule.java',
    description: 'Immutable threshold and fee configuration; rejects invalid configuration and negative subtotals.',
    fields: ['- freeFromCents: int {final}', '- standardFeeCents: int {final}'],
    methods: ['+ DeliveryFeeRule(freeFromCents: int, standardFeeCents: int)', '+ feeCents(subtotalCents: int): int'],
  }, {
    name: 'OrderQuotes', kind: 'public final class', source: 'dry/OrderQuotes.java',
    description: 'Stores the required rule reference and a private per-instance map of quoted fees. checkoutQuote records a fee, not a payment.',
    fields: ['- rule: DeliveryFeeRule {final}', '- recordedFees: Map<String, Integer> {final}'],
    methods: ['+ OrderQuotes(rule: DeliveryFeeRule)', '+ preview(subtotalCents: int): int', '+ checkoutQuote(orderId: String, subtotalCents: int): int', '+ recordedFee(orderId: String): int', '+ recordedCount(): int'],
  }, {
    name: 'RewardRule', kind: 'public final class', source: 'dry/RewardRule.java',
    description: 'Separate loyalty eligibility rule in points. Equal numeric thresholds do not establish a delivery dependency.',
    fields: [], methods: ['- RewardRule()', '+ canRedeem(points: int): boolean {static}'],
  }],
  relationships: [{
    from: 'OrderQuotes', to: 'DeliveryFeeRule', kind: 'Association',
    explanation: 'The constructor rejects null and retains the supplied rule. preview and checkoutQuote both call feeCents; different quote books may share the same immutable rule without sharing their recordedFees maps.',
    multiplicity: 'Each quote book → exactly 1 rule; each rule ← 0..* quote books.',
    navigation: 'OrderQuotes → rule through a private field. DeliveryFeeRule has no reverse quote-book reference or public collaborator getter.',
  }],
  notes: [
    'The model includes the historical and refactored types. BeforeQuotes and RewardRule have no source-level relationship to DeliveryFeeRule merely because their literals resemble its configuration.',
    'The association asserts a retained collaborator, not ownership of its lifetime. No aggregation, composition, inheritance or Strategy interface is required here.',
    'The JDK Map and demo plumbing are omitted as boxes. Each OrderQuotes constructs its own mutable HashMap; final prevents field rebinding and does not make the map immutable or thread-safe.',
    'This is a curated class view, not execution of the Java in the browser. The text explanation includes every shown member and relationship.',
  ],
};
