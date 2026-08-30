// classDiagrams — auction
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Grounded directly in the real backend classes under com.lld.auction.*.

export default {
  title: 'Online Auction House — Class Diagram',
  classes: [
    {
      name: 'AuctionController',
      stereotype: 'controller',
      fields: ['- service: AuctionService'],
      methods: [
        '+ createAuction(request): Auction',
        '+ placeBid(request): Bid',
        '+ closeAuction(id): Auction',
        '+ getNotifications(): List<OutbidEvent>',
      ]
    },
    {
      name: 'AuctionService',
      stereotype: 'facade',
      fields: [
        '- repository: AuctionRepository',
        '- notifier: AuctionNotifier',
        '- strategyFactory: BidIncrementStrategyFactory',
        '- auctionLocks: ConcurrentHashMap<Long, ReentrantLock>'
      ],
      methods: [
        '+ createAuction(itemName, description, startingBid, durationMinutes, startDelayMinutes, policy, incrementValue): Auction',
        '+ placeBid(auctionId, bidderId, amount): Bid',
        '+ closeAuction(auctionId): Auction',
        '- doPlaceBid(repo, notifier, auctionId, bidderId, amount): Bid',
        '- requireBiddable(auction, now): void',
        '- syncStatus(repo, auction, now): void'
      ]
    },
    {
      name: 'AuctionRepository',
      stereotype: 'repository',
      fields: [
        '- auctions: ConcurrentHashMap<Long, Auction>',
        '- bidders: ConcurrentHashMap<Long, Bidder>',
        '- bids: ConcurrentHashMap<Long, Bid>'
      ],
      methods: [
        '+ saveAuction(auction): void',
        '+ getAuction(id): Auction',
        '+ getAllAuctions(): List<Auction>',
        '+ saveBid(bid): void',
        '+ getBidsForAuction(auctionId): List<Bid>',
        '+ nextAuctionId/nextBidderId/nextBidId(): long'
      ]
    },
    {
      name: 'Auction',
      stereotype: 'entity',
      fields: [
        '- id: long', '- itemName: String', '- startingBid: double', '- currentBid: double',
        '- highestBidderId: Long', '- status: AuctionStatus',
        '- incrementPolicy: BidIncrementPolicy', '- incrementValue: double',
        '- startTime: long', '- endTime: long'
      ],
      methods: ['+ hasStarted(now): boolean', '+ hasEnded(now): boolean']
    },
    {
      name: 'Bid',
      stereotype: 'entity',
      fields: ['- id: long', '- auctionId: long', '- bidderId: long', '- amount: double', '- timestamp: long'],
      methods: []
    },
    {
      name: 'Bidder',
      stereotype: 'entity',
      fields: ['- id: long', '- name: String', '- email: String'],
      methods: []
    },
    {
      name: 'BidIncrementStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ name(): String', '+ minNextBid(auction): double']
    },
    {
      name: 'FixedIncrementStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ minNextBid(auction): double']
    },
    {
      name: 'PercentageIncrementStrategy',
      stereotype: 'strategy',
      fields: [],
      methods: ['+ minNextBid(auction): double']
    },
    {
      name: 'BidIncrementStrategyFactory',
      stereotype: 'factory',
      fields: ['- strategies: EnumMap<BidIncrementPolicy, BidIncrementStrategy>'],
      methods: ['+ forPolicy(policy): BidIncrementStrategy']
    },
    {
      name: 'AuctionNotifier',
      stereotype: 'subject',
      fields: ['- observers: CopyOnWriteArrayList<AuctionObserver>'],
      methods: ['+ registerObserver(observer): void', '+ removeObserver(observer): void', '+ publish(event): void']
    },
    {
      name: 'AuctionObserver',
      stereotype: 'interface',
      fields: [],
      methods: ['+ onOutbid(event): void']
    },
    {
      name: 'InAppAuctionObserver',
      stereotype: 'observer',
      fields: ['- events: Deque<OutbidEvent>'],
      methods: ['+ onOutbid(event): void', '+ recentEvents(): List<OutbidEvent>']
    },
    {
      name: 'LoggingAuctionObserver',
      stereotype: 'observer',
      fields: [],
      methods: ['+ onOutbid(event): void']
    },
    {
      name: 'OutbidEvent',
      stereotype: 'entity',
      fields: [
        '- auctionId: long', '- previousBidderId: long', '- previousAmount: double',
        '- newBidderId: long', '- newAmount: double', '- message: String'
      ],
      methods: []
    },
    {
      name: 'AuctionStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'ACTIVE', 'CLOSED'],
      methods: []
    },
    {
      name: 'BidIncrementPolicy',
      stereotype: 'enum',
      fields: ['FIXED', 'PERCENTAGE'],
      methods: []
    }
  ],
  relationships: [
    { from: 'AuctionController', to: 'AuctionService', label: 'delegates to' },
    { from: 'AuctionService', to: 'AuctionRepository', label: 'uses' },
    { from: 'AuctionService', to: 'AuctionNotifier', label: 'publishes via' },
    { from: 'AuctionService', to: 'BidIncrementStrategyFactory', label: 'resolves via' },
    { from: 'AuctionNotifier', to: 'AuctionObserver', label: 'notifies' },
    { from: 'AuctionNotifier', to: 'OutbidEvent', label: 'publishes' },
    { from: 'InAppAuctionObserver', to: 'AuctionObserver', label: 'implements', dashed: true },
    { from: 'LoggingAuctionObserver', to: 'AuctionObserver', label: 'implements', dashed: true },
    { from: 'BidIncrementStrategyFactory', to: 'BidIncrementStrategy', label: 'resolves' },
    { from: 'FixedIncrementStrategy', to: 'BidIncrementStrategy', label: 'implements', dashed: true },
    { from: 'PercentageIncrementStrategy', to: 'BidIncrementStrategy', label: 'implements', dashed: true },
    { from: 'BidIncrementStrategyFactory', to: 'BidIncrementPolicy', label: 'keyed by' },
    { from: 'AuctionRepository', to: 'Auction', label: 'stores' },
    { from: 'AuctionRepository', to: 'Bidder', label: 'stores' },
    { from: 'AuctionRepository', to: 'Bid', label: 'stores' },
    { from: 'Auction', to: 'AuctionStatus', label: 'has state' },
    { from: 'Auction', to: 'BidIncrementPolicy', label: 'priced by' },
    { from: 'Bid', to: 'Auction', label: 'placed on' },
    { from: 'Bid', to: 'Bidder', label: 'placed by' },
    { from: 'OutbidEvent', to: 'Auction', label: 'concerns' }
  ]
};
