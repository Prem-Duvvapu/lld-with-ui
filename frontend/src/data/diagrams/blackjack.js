// classDiagrams — blackjack
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Blackjack / Deck of Cards — Class Diagram',
  classes: [
    {
      name: 'BlackjackService',
      stereotype: 'service',
      fields: [
        '- repository: BlackjackRepository',
        '- dealerStrategyFactory: DealerStrategyFactory',
        '- tableLocks: ConcurrentMap<String, ReentrantLock>',
        '- simTableLocks: ConcurrentMap<String, ReentrantLock>',
      ],
      methods: [
        '+ createTable(dealerStrategyType): Table',
        '+ deal(tableId): Table',
        '+ hit(tableId): Table',
        '+ stand(tableId): Table',
      ],
    },
    {
      name: 'BlackjackRepository',
      stereotype: 'repository',
      fields: ['- tables: ConcurrentHashMap<String, Table>', '- shoe: Shoe'],
      methods: ['+ addTable(table): void', '+ getTable(id): Table', '+ getShoe(): Shoe', '+ reset(): void'],
    },
    {
      name: 'Table',
      fields: [
        '- id: String',
        '- dealerStrategyType: DealerStrategyType',
        '- playerHand: Hand',
        '- dealerHand: Hand',
        '- status: RoundStatus',
        '- outcome: RoundOutcome',
      ],
      methods: ['+ transitionTo(target: RoundStatus): void  // the only place status is ever assigned'],
    },
    {
      name: 'Hand',
      fields: ['- cards: List<Card>'],
      methods: [
        '+ addCard(card): void',
        '+ getValue(): int  // soft/hard Ace resolved here',
        '+ isSoft(): boolean',
        '+ isBust(): boolean',
        '+ isBlackjack(): boolean',
      ],
    },
    {
      name: 'Card',
      stereotype: 'value',
      fields: ['rank: Rank', 'suit: Suit'],
      methods: [],
    },
    {
      name: 'Rank',
      stereotype: 'enum',
      fields: ['TWO..TEN', 'JACK', 'QUEEN', 'KING', 'ACE'],
      methods: ['+ getBaseValue(): int'],
    },
    {
      name: 'Suit',
      stereotype: 'enum',
      fields: ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'],
      methods: [],
    },
    {
      name: 'RoundStatus',
      stereotype: 'enum',
      fields: ['BETTING', 'DEALING', 'PLAYER_TURN', 'DEALER_TURN', 'SETTLEMENT'],
      methods: ['+ canTransitionTo(next): boolean', '+ allowedNext(): Set<RoundStatus>', '+ isTerminal(): boolean'],
    },
    {
      name: 'RoundOutcome',
      stereotype: 'enum',
      fields: ['PLAYER_BLACKJACK', 'PLAYER_WIN', 'DEALER_WIN', 'PUSH'],
      methods: [],
    },
    {
      name: 'Shoe',
      stereotype: 'component',
      fields: ['- cards: Card[]  // immutable, pre-shuffled', '- cursor: AtomicInteger'],
      methods: ['+ draw(): Card  // atomic cursor.getAndIncrement()', '+ remaining(): int'],
    },
    {
      name: 'Deck',
      stereotype: 'factory',
      fields: [],
      methods: ['+ of(deckCount): Shoe  // builds + shuffles deckCount standard decks into one Shoe'],
    },
    {
      name: 'DealerStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ shouldHit(dealerHand): boolean'],
    },
    {
      name: 'HitOnSoft17Strategy',
      fields: ['implements DealerStrategy'],
      methods: ['+ shouldHit(...): boolean'],
    },
    {
      name: 'StandOnSoft17Strategy',
      fields: ['implements DealerStrategy'],
      methods: ['+ shouldHit(...): boolean'],
    },
    {
      name: 'DealerStrategyFactory',
      stereotype: 'resolver',
      fields: [],
      methods: ['+ forType(type): DealerStrategy'],
    },
  ],
  relationships: [
    { from: 'BlackjackService', to: 'BlackjackRepository', label: 'reads/writes' },
    { from: 'BlackjackService', to: 'Table', label: 'serializes each action with a fair per-table lock' },
    { from: 'BlackjackService', to: 'DealerStrategyFactory', label: 'resolves dealer play via' },
    { from: 'BlackjackRepository', to: 'Table', label: 'stores' },
    { from: 'BlackjackRepository', to: 'Shoe', label: 'holds the ONE shared instance of' },
    { from: 'Deck', to: 'Shoe', label: 'builds' },
    { from: 'Shoe', to: 'Card', label: 'holds a pre-shuffled array of' },
    { from: 'Table', to: 'Hand', label: 'has a player and dealer' },
    { from: 'Hand', to: 'Card', label: 'holds' },
    { from: 'Card', to: 'Rank', label: 'has' },
    { from: 'Card', to: 'Suit', label: 'has' },
    { from: 'Table', to: 'RoundStatus', label: 'has' },
    { from: 'Table', to: 'RoundOutcome', label: 'has' },
    { from: 'DealerStrategyFactory', to: 'DealerStrategy', label: 'resolves' },
    { from: 'HitOnSoft17Strategy', to: 'DealerStrategy', label: 'implements', dashed: true },
    { from: 'StandOnSoft17Strategy', to: 'DealerStrategy', label: 'implements', dashed: true },
  ],
};
