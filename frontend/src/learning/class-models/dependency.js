export default {
  title: 'Temporary policy use and a stored association',
  summary: 'QuoteService uses a supplied policy per call; QuoteSession stores a required policy. Both rely on FeePolicy behavior.',
  classes: [{
    name: 'FeePolicy', kind: 'public interface', source: 'dependency/FeePolicy.java', description: 'For a nonnegative subtotal, requires a nonnegative fee in cents.',
    fields: [], methods: ['+ feeCents(subtotalCents: int): int {abstract}'],
  }, {
    name: 'FlatFeePolicy', kind: 'public final class', source: 'dependency/FlatFeePolicy.java', description: 'Returns its configured nonnegative fee.',
    fields: ['- feeCents: int {final}'], methods: ['+ FlatFeePolicy(feeCents: int)', '+ feeCents(subtotalCents: int): int'],
  }, {
    name: 'FreeAbovePolicy', kind: 'public final class', source: 'dependency/FreeAbovePolicy.java', description: 'Returns zero at/above its positive threshold and the configured fee below it.',
    fields: ['- thresholdCents: int {final}', '- feeCents: int {final}'], methods: ['+ FreeAbovePolicy(thresholdCents: int, feeCents: int)', '+ feeCents(subtotalCents: int): int'],
  }, {
    name: 'QuoteService', kind: 'public final class', source: 'dependency/QuoteService.java', description: 'Checks the result and adds subtotal plus fee with integer overflow detection.',
    fields: [], methods: ['+ quote(subtotalCents: int, policy: FeePolicy): int', '+ quoteWithDefault(subtotalCents: int): int'],
  }, {
    name: 'QuoteSession', kind: 'public final class', source: 'dependency/QuoteSession.java', description: 'Retains an injected policy and delegates each quote to a local service.',
    fields: ['- policy: FeePolicy {final}'], methods: ['+ QuoteSession(policy: FeePolicy)', '+ getPolicy(): FeePolicy', '+ quote(subtotalCents: int): int'],
  }],
  relationships: [{ from: 'FlatFeePolicy', to: 'FeePolicy', kind: 'Realization', explanation: 'implements supplies feeCents with constant fee behavior.' }, { from: 'FreeAbovePolicy', to: 'FeePolicy', kind: 'Realization', explanation: 'implements supplies threshold fee behavior.' }, { from: 'QuoteService', to: 'FeePolicy', kind: 'Dependency', explanation: 'quote uses its policy parameter without retaining a collaborator field. Dependency is a source/usage relation; no stored-link multiplicity is asserted.' }, { from: 'QuoteService', to: 'FlatFeePolicy', kind: 'Dependency', explanation: 'quoteWithDefault explicitly constructs a local FlatFeePolicy(50). The service therefore also depends on a concrete implementation.' }, { from: 'QuoteSession', to: 'FeePolicy', kind: 'Association', explanation: 'The constructor rejects null and stores the same supplied reference. Multiple sessions can receive the same policy; rebinding a caller variable does not replace this field.', multiplicity: 'Each session → exactly 1 policy; each policy ← 0..* sessions.', navigation: 'Session → policy through its field/getPolicy. Policies store no reverse session link.' }, { from: 'QuoteSession', to: 'QuoteService', kind: 'Dependency', explanation: 'quote constructs a local QuoteService to calculate the result; it stores no service field.' }],
  notes: ['Retaining a collaborator also creates a dependency; association highlights the additional stored link. Injection alone does not establish ownership or full Dependency Inversion.', 'No retained field does not imply the supplied object is destroyed after the call. This diagram makes no claim about reachability or garbage collection.', 'Signature compatibility does not prove policy behavior. Result validation and overflow rejection do not roll back a policy’s external side effects.'],
};
