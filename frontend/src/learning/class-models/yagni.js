export default {
  title: 'Current behavior, a speculative alternative and an approved change',
  summary: 'Separate historical alternatives from the later PickupParcelQuote, which retains the current base-price calculator. These are teaching types, not a parcel subsystem of this application.',
  classes: [{
    name: 'CurrentParcelQuote', kind: 'public final class', source: 'yagni/CurrentParcelQuote.java',
    description: 'Current 200-cent per-parcel requirement and 1–20 quantity validation. The implicit public no-argument constructor creates a stateless calculator.',
    fields: ['- CENTS_PER_PARCEL: int = 200 {static, final}'],
    methods: ['+ CurrentParcelQuote() {implicit}', '+ quoteCents(parcels: int): int'],
  }, {
    name: 'SpeculativeQuoteEngine', kind: 'public final class', source: 'yagni/SpeculativeQuoteEngine.java',
    description: 'Executed alternative that guesses named per-parcel services. It validates and copies its supplied rates; it does not implement a fixed per-quote discount.',
    fields: ['- rates: Map<String, Integer> {final}'],
    methods: ['+ SpeculativeQuoteEngine(rates: Map<String, Integer>)', '+ quoteCents(service: String, parcels: int): int'],
  }, {
    name: 'PickupParcelQuote', kind: 'public final class', source: 'yagni/PickupParcelQuote.java',
    description: 'Later accepted two-mode contract. Uses the current base validation and price, then subtracts 100 once if pickup is true; no object state is changed.',
    fields: ['- PICKUP_DISCOUNT_CENTS: int = 100 {static, final}', '- standard: CurrentParcelQuote {final}'],
    methods: ['+ PickupParcelQuote(standard: CurrentParcelQuote)', '+ quoteCents(parcels: int, pickup: boolean): int'],
  }],
  relationships: [{
    from: 'PickupParcelQuote', to: 'CurrentParcelQuote', kind: 'Association',
    explanation: 'The constructor rejects null and retains the supplied standard calculator; quoteCents delegates base pricing and validation to it. The earlier object stays unchanged and can also serve other callers.',
    multiplicity: 'Each pickup calculator → exactly 1 current calculator; each current calculator ← 0..* pickup calculators.',
    navigation: 'PickupParcelQuote → standard through its private field. CurrentParcelQuote stores no reverse reference.',
  }],
  notes: [
    'The types coexist to compare development stages. There is no source-level inheritance or dependency between SpeculativeQuoteEngine and the other calculators; a shared method name does not create a UML relationship.',
    'The retained standard reference supports an association, not exclusive ownership, object destruction or an automatically implemented design pattern.',
    'JDK Map, String and Integer and the main-method driver are omitted as boxes. Map.copyOf prevents caller edits from changing the engine configuration; final by itself only prevents field rebinding.',
    'This curated class model describes source structure. It does not show object addresses, a live migration or browser execution of Java; the complete text alternative includes every shown member and connector.',
  ],
};
