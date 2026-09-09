// Sequence diagram content for blackjack.
// Grounded directly in Shoe#draw and
// BlackjackConcurrencyTest#repeatedFullShoeDrainRaceNeverDuplicatesOrOverdraws: many threads
// (representing many tables) racing to draw from one physical shoe until it is exhausted. A
// class diagram shows Shoe owns a cursor and an array; it does not show why a single
// AtomicInteger#getAndIncrement, with no lock inside Shoe, is enough to guarantee two threads
// never receive the same array index. BlackjackService still uses a distinct lock per table for
// the larger status/hand/outcome transaction; those locks never serialize different tables.
export default {
  title: 'Blackjack / Deck of Cards — Multiple Tables Racing One Shared Shoe',
  description:
    'Two different tables both call shoe.draw() at nearly the same instant. Each service action holds only its own table\'s fair lock, so the calls still reach the shared shoe concurrently. AtomicInteger#getAndIncrement is one atomic read-modify-write: whichever draw executes first gets index N and advances the counter to N+1; the other draw can only get N+1, never N again. Shoe itself needs no ReentrantLock, synchronized block, or CAS retry loop.',
  flows: [
    {
      id: 'shared-shoe-draw-race',
      label: 'Two tables racing to draw from the same physical shoe',
      description:
        'Table A and Table B both call deal(), which each draw 4 cards from the SAME Shoe instance, started together via a CountDownLatch (see BlackjackConcurrencyTest, run for 300 rounds against a full 52-card shoe with 16 racing threads). No two draws, across any number of concurrent tables, may ever return the same array index -- and once cursor reaches the shoe\'s size, every further draw cleanly throws instead of returning null or wrapping around.',
      participants: [
        { id: 'tableA', name: 'Table A\n(deal — draws 4)', kind: 'actor' },
        { id: 'tableB', name: 'Table B\n(deal — draws 4)', kind: 'actor' },
        { id: 'service', name: 'BlackjackService', kind: 'component', stereotype: 'facade' },
        { id: 'shoe', name: 'Shoe\n(shared by every table)', kind: 'component' },
        { id: 'cursor', name: 'shoe.cursor\n(AtomicInteger)', kind: 'component', stereotype: 'lock-free' },
      ],
      steps: [
        { type: 'note', over: ['shoe'], text: 'cursor=48 -- 4 cards remain before this shoe is exhausted.' },
        { from: 'tableA', to: 'service', text: 'deal() — acquire Table A lock, draw card 1 of 4' },
        { from: 'tableB', to: 'service', text: 'deal() — acquire distinct Table B lock, ~simultaneously' },
        { from: 'service', to: 'shoe', text: '[A] draw()' },
        { from: 'shoe', to: 'cursor', text: '[A] cursor.getAndIncrement()  -- atomically returns 48, cursor becomes 49' },
        { from: 'shoe', to: 'service', text: '[A] return cards[48]', type: 'return' },
        { from: 'service', to: 'shoe', text: '[B] draw() — concurrent with A because the table locks are independent' },
        { from: 'shoe', to: 'cursor', text: '[B] cursor.getAndIncrement()  -- the hardware guarantees this sees cursor AFTER A\'s increment: returns 49, cursor becomes 50' },
        { from: 'shoe', to: 'service', text: '[B] return cards[49]', type: 'return' },
        { type: 'note', over: ['cursor'], text: 'This is the guarantee a naive "check index, then read, then increment" (three separate steps) would break: two threads could both read cursor=48 before either increments, both returning cards[48].' },
        { from: 'service', to: 'shoe', text: '[A,B continue] two more draws each -- cursor climbs 50, 51' },
        { from: 'shoe', to: 'service', text: 'cursor now 52 == cards.length -- shoe exactly exhausted, no over-draw', type: 'return' },
        { type: 'note', over: ['tableA', 'tableB'], text: 'Table A and Table B end with 8 total distinct cards between them -- never a shared card, never a duplicate. See BlackjackConcurrencyTest, 300 rounds.' },
      ],
    },
  ],
};
