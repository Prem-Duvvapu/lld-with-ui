// Sequence diagram content for auction.
// Grounded directly in the real classes and AuctionConcurrencyTest#equalAmountRace_onlyOneWins:
// AuctionController -> AuctionService -> per-auction ReentrantLock -> BidIncrementStrategyFactory
// -> BidIncrementStrategy -> AuctionRepository -> AuctionNotifier.
export default {
  title: 'Auction — Concurrent Equal-Amount Bid Race (Per-Auction Lock)',
  description:
    'Why a class diagram cannot show the fix for the check-then-act race: two bidders offering the ' +
    'IDENTICAL amount at the IDENTICAL instant both read "I am not yet outbid" before either writes. ' +
    'Only a sequence diagram shows that AuctionService#doPlaceBid re-reads the current bid AFTER ' +
    'acquiring the lock, not before — which is the one line standing between "exactly one winner" and ' +
    '"both bidders think they won."',
  flows: [
    {
      id: 'equal-amount-race',
      label: 'Two bidders race the same winning amount',
      description:
        'Alice and Bob both call POST /api/auction/bids with auctionId=7, amount=110.00 at effectively ' +
        'the same instant (AuctionConcurrencyTest#equalAmountRace_onlyOneWins fires 12 threads this way). ' +
        'Alice\'s thread happens to acquire the per-auction lock first; Bob\'s thread blocks on the SAME ' +
        'lock object rather than proceeding — that blocking, not a timestamp comparison, is what makes ' +
        'the outcome deterministic.',
      participants: [
        { id: 'alice', name: 'Alice — Thread A', kind: 'actor' },
        { id: 'bob', name: 'Bob — Thread B', kind: 'actor' },
        { id: 'controller', name: 'AuctionController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'AuctionService', kind: 'component', stereotype: 'facade' },
        { id: 'lock', name: 'ReentrantLock\n(auction #7)', kind: 'component', stereotype: 'lock' },
        { id: 'strategy', name: 'BidIncrement\nStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'repo', name: 'AuctionRepository', kind: 'store' },
        { id: 'notifier', name: 'AuctionNotifier', kind: 'component', stereotype: 'subject' },
      ],
      steps: [
        { from: 'alice', to: 'controller', text: 'POST /bids {auctionId:7, bidderId:Alice, amount:110.00}' },
        { from: 'controller', to: 'service', text: 'placeBid(7, aliceId, 110.00)', activate: 'service',
          detail: 'AuctionController#placeBid only unpacks the request Map and forwards it — no validation, no locking, no persistence in the controller.' },
        { from: 'service', to: 'lock', text: 'lockFor(7).lock()  — Alice acquires',
          detail: 'auctionLocks.computeIfAbsent(7, id -> new ReentrantLock(true)) — a fair lock keyed by auction id, never nested with any other auction\'s lock.' },
        { type: 'note', over: ['bob', 'controller'], text: 'Bob\'s identical request arrives on another thread at nearly the same instant.' },
        { from: 'bob', to: 'controller', text: 'POST /bids {auctionId:7, bidderId:Bob, amount:110.00}' },
        { from: 'controller', to: 'service', text: 'placeBid(7, bobId, 110.00)',
          detail: 'A second, concurrent call into the SAME AuctionService instance — Spring beans are singletons, so both threads are inside doPlaceBid() at once.' },
        { from: 'service', to: 'lock', text: 'lockFor(7).lock()  — Bob BLOCKS',
          detail: 'Bob\'s thread parks here until Alice\'s thread releases the lock. This is the entire fix: the check and the write for the SAME auction can never interleave between two threads.' },
        { from: 'service', to: 'repo', text: '(Alice, holding lock) getAuction(7); getBidder(aliceId)' },
        { from: 'repo', to: 'service', text: 'return Auction{currentBid:100.00}, Bidder{Alice}', type: 'return' },
        { from: 'service', to: 'service', text: 'requireBiddable(auction, now) — ACTIVE, within window ✓' },
        { from: 'service', to: 'strategy', text: 'strategy.minNextBid(auction)', activate: 'strategy' },
        { from: 'strategy', to: 'service', text: 'return 110.00  (100.00 + fixed increment 10.00)', type: 'return', deactivate: 'strategy' },
        { from: 'service', to: 'service', text: '110.00 >= 110.00 → ACCEPT Alice\'s bid' },
        { from: 'service', to: 'repo', text: 'auction.setCurrentBid(110.00); setHighestBidderId(Alice); updateAuction(auction); saveBid(...)' },
        { from: 'service', to: 'lock', text: 'lockFor(7).unlock()  — Alice releases' },
        { from: 'service', to: 'controller', text: 'return Bid{Alice, 110.00}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'alice', text: '200 OK  Bid accepted at 110.00', type: 'return' },
        { type: 'note', over: ['lock'], text: 'Bob\'s blocked thread now acquires the lock and resumes inside doPlaceBid().' },
        { from: 'lock', to: 'service', text: 'lockFor(7).lock()  — Bob acquires', activate: 'service' },
        { from: 'service', to: 'repo', text: '(Bob, holding lock) getAuction(7); getBidder(bobId)' },
        { from: 'repo', to: 'service', text: 'return Auction{currentBid:110.00}  ← Alice\'s write, now visible', type: 'return',
          detail: 'This re-read is the whole point: it happens AFTER Bob\'s lock acquisition, so it observes Alice\'s update. A version that read the auction BEFORE locking (or that trusted a value cached before the lock) would let Bob see the stale currentBid:100.00 and wrongly accept his 110.00 too.' },
        { from: 'service', to: 'strategy', text: 'strategy.minNextBid(auction)  → 110.00 + 10.00 = 120.00' },
        { from: 'service', to: 'service', text: '110.00 >= 120.00 → false → reject' },
        { from: 'service', to: 'controller', text: 'throw BidTooLowException(auctionId=7, offered=110.00, minRequired=120.00)', deactivate: 'service' },
        { from: 'controller', to: 'bob', text: '400 Bad Request  "Bid too low — minimum acceptable bid is 120.00"', type: 'return' },
        { type: 'note', over: ['service', 'notifier'], text: 'No OutbidEvent fires here: Bob never became the leading bidder, so there is nothing to notify Alice about. AuctionNotifier only publishes when a bid actually supersedes a previous leader (see the outbid case below).' },
      ],
    },
  ],
};
