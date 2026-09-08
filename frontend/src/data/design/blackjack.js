// designDetails — blackjack
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Blackjack / Deck of Cards — Design Details',
  requirements: [
    'The generic "design a deck of cards" interview question, given concrete shape as Blackjack so it has a real game loop (BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> SETTLEMENT) rather than being an abstract card-shuffling exercise.',
    'Correct soft/hard Ace handling: an Ace counts as 11 unless that would bust the hand, in which case it counts as 1 — a hand can hold multiple Aces, only as many as needed downgrade.',
    'Factory Pattern: Deck.of(deckCount) shuffles deckCount standard 52-card decks into one flat Shoe.',
    'Strategy Pattern for dealer house rules: HitOnSoft17Strategy vs StandOnSoft17Strategy — genuinely different behavior on the one hand that distinguishes them, a soft 17 (e.g. Ace+6).',
    'The centerpiece: multiple simultaneous tables share ONE physical Shoe, mirroring how real casinos run several tables off one continuous shuffle. Two tables must never draw the same physical card, and the shoe must never be over-drawn past its own size.',
    'Isolated Concurrency Simulation: an isolated /api/blackjack/sim/* sandbox (a second BlackjackRepository instance, with its own shoe) with a live 15-table race against a deliberately near-exhausted shared shoe.',
  ],
  entities: [
    {
      name: 'Shoe',
      description: 'A pre-shuffled, fixed-size, immutable array of cards shared by every table dealt against it — the concurrency centerpiece.',
      fields: [
        { name: 'cards', type: 'Card[]', description: 'Immutable once shuffled — the whole draw order is fixed at construction time' },
        { name: 'cursor', type: 'AtomicInteger', description: 'The only mutable state — advanced by exactly one per successful draw' },
      ],
      methods: [
        { name: 'draw()', returns: 'Card', description: 'int idx = cursor.getAndIncrement(); if (idx >= cards.length) throw ShoeExhaustedException; return cards[idx] — a single atomic operation, genuinely lock-free' },
      ],
    },
    {
      name: 'Deck',
      description: 'Factory Pattern: a static factory method, not a Spring-managed factory bean, since a shoe is constructed on demand (table-group creation, or /sim/reset), never resolved repeatedly from a shared singleton.',
      fields: [],
      methods: [
        { name: 'of(deckCount)', returns: 'Shoe', description: 'Builds deckCount standard 52-card decks, shuffles them together, and hands back one immutable Shoe' },
      ],
    },
    {
      name: 'Hand',
      description: 'getValue() and isSoft() both derive from one shared computation, so HitOnSoft17Strategy and StandOnSoft17Strategy can never disagree about whether a 17 is soft.',
      fields: [],
      methods: [
        { name: 'getValue()', returns: 'int', description: 'Sums base values, then downgrades one Ace at a time from 11 to 1 only while the hand would otherwise bust' },
        { name: 'isSoft()', returns: 'boolean', description: 'True iff at least one Ace is still being counted as 11 after that downgrade pass' },
      ],
    },
    {
      name: 'Table',
      description: 'One table\'s round, playing against the SHARED Shoe. status is mutated only through transitionTo(), the one place its lifecycle can move — the same single-enforcement-point idiom as locker.model.Locker#transitionTo.',
      fields: [],
      methods: [],
    },
  ],
  designPatterns: [
    {
      name: 'Factory',
      used: true,
      explanation: 'Deck.of(deckCount) builds and shuffles N standard decks into one flat Shoe — a static factory method rather than a Spring bean, since shoe construction happens per-table-group on demand, not once globally.',
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'DealerStrategy (HitOnSoft17 vs StandOnSoft17), resolved by DealerStrategyFactory via an EnumMap — the same shape as locker.strategy.LockerAllocationStrategyFactory. The two strategies only diverge on a soft 17, which is exactly what DealerStrategyTest proves.',
    },
    {
      name: 'State Machine (declared transition table)',
      used: true,
      explanation: 'RoundStatus declares its own legal-next-states set, and Table#transitionTo is the single enforcement point — the same idiom as uber.model.RideStatus. A natural blackjack on the deal still walks PLAYER_TURN -> DEALER_TURN -> SETTLEMENT (never skips a state), just without waiting for player input in between.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'Shoe only knows how to hand out the next card atomically; Hand only knows its own value; DealerStrategy only knows when to hit; BlackjackService only orchestrates.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A third house rule (e.g. a strategy that always hits on 16 or below) is one new DealerStrategy implementation and one line in DealerStrategyFactory\'s constructor — no existing strategy or Table logic changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every DealerStrategy honors the same shouldHit(hand) contract; BlackjackService never needs to know which concrete strategy a table is using.' },
  ],
  oopConcepts: [
    { name: 'Immutability', description: 'Card is an immutable value object (Lombok @Value) — two Cards with the same rank and suit are equal, which is exactly what the concurrency test relies on to detect a duplicate deal. Shoe\'s backing array is never mutated after construction; only the AtomicInteger cursor advances.' },
    { name: 'Encapsulation', description: 'Table\'s status field is private and mutated only through transitionTo(); Hand\'s cards list is exposed only as an unmodifiable view.' },
    { name: 'Polymorphism', description: 'BlackjackService calls dealerStrategyFactory.forType(...).shouldHit(...) without knowing which concrete strategy backs a given table.' },
  ],
  extensibility: [
    { area: 'Multiple simultaneous player hands per table', description: 'Today each table is one player vs the dealer; splitting a pair or supporting multiple seats at one table would need Table to hold a List<Hand> for players instead of a single Hand, with settlement logic per hand.', difficulty: 'Medium' },
    { area: 'Betting and payouts', description: 'This module models the game loop, not money — a Round\'s bet amount and payout (3:2 for a natural blackjack, 1:1 otherwise) would need a Wallet-shaped integration, deliberately out of scope here.', difficulty: 'Medium' },
    { area: 'Continuous shuffling machines (CSM)', description: 'Real casinos increasingly reshuffle discards back into the shoe continuously rather than dealing down to a cut card — Shoe\'s fixed-size immutable-array design would need to become a genuinely dynamic structure to model that, a materially different concurrency shape than the fixed-cursor design here.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'Shoe#draw is deliberately built on AtomicInteger#getAndIncrement rather than a CAS retry loop or a ReentrantLock — the backing array is fixed-size and fully known upfront at shuffle time, so there is nothing to retry and nothing that benefits from a lock: a single atomic increment is both the simplest and the fastest correct implementation.',
    'A table\'s dealerStrategyType is fixed at table-creation time rather than swappable mid-round — real casino house rules don\'t change between hands either, so this matches the domain rather than being an arbitrary limitation.',
    'RoundStatus has no path back to BETTING — this simplified model treats a settled table as done; a real app would spawn a fresh Round on the same Table for the next hand rather than reusing a terminal one, which this module deliberately leaves out to keep the state machine\'s terminal-state guarantee simple and provable.',
  ],
  summary: 'A blackjack game loop whose centerpiece is proving that multiple tables sharing one physical shoe never step on each other: Shoe#draw is a single atomic AtomicInteger#getAndIncrement into a pre-shuffled, fixed-size, immutable card array — genuinely lock-free, since the array is fully known upfront and there is nothing to retry. Deck.of(deckCount) is the Factory that builds that shared shoe; DealerStrategy (Strategy Pattern) gives each table its own house rule for whether the dealer hits a soft 17; RoundStatus (a declared transition table, the same idiom as uber.model.RideStatus) enforces the BETTING -> DEALING -> PLAYER_TURN -> DEALER_TURN -> SETTLEMENT lifecycle as one single enforcement point.',
  highlights: [
    'The shared-shoe race proven directly: a 300-round repeated test has 16 threads race to fully drain a 52-card shoe, asserting every one of the 52 cards is dealt to exactly one thread, none is ever duplicated, and the shoe ends fully drained — never over-drawn.',
    'A second, harder test proves the "more racers than cards" case is handled cleanly: 30 threads racing a 10-card shoe across 200 rounds, asserting exactly 10 succeed and the other 20 cleanly receive ShoeExhaustedException, never a duplicate or a null card.',
    'Soft/hard Ace math independently verified: HandTest proves a hand with two Aces correctly downgrades only ONE of them (11+11=22 busts, so exactly one becomes 1, giving 12) — a genuinely easy-to-get-wrong edge case that would otherwise silently corrupt every DealerStrategy decision built on top of it.',
  ],
};
