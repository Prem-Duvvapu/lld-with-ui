// designDetails — auction
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Auction — Design Details',
  requirements: [
    'Auction creation — seller creates an auction for an item with reserve price, start time, and end time',
    'Bidding — registered users can place bids on active auctions, each bid must be higher than the current highest bid',
    'Automatic bidding — users can set a maximum bid amount; the system auto-bids incrementally on their behalf up to their max',
    'Auction states: UPCOMING, ACTIVE, EXTENDED, CLOSED, SOLD, UNSOLD — state transitions based on time and bid activity',
    'Bid increment rules — each new bid must exceed the current bid by at least the configured increment amount',
    'Auction extension — if a bid is placed in the final minute, the auction extends by 1 minute (soft-close / anti-sniping)',
    'Winner determination — highest bidder at auction close wins; if no bids meet reserve price, item is UNSOLD',
    'Notifications — bidders notified when outbid, when auction ends, and when they win or lose'
  ],
  entities: [
    {
      name: 'AuctionService',
      description: 'Core orchestrator managing auction lifecycle: creation, bidding, automatic extension, and closing. Coordinates between repositories and notification service.',
      fields: [
        {
          name: 'auctionRepo',
          type: 'Repository<Auction>',
          description: 'Data store for all auctions'
        },
        {
          name: 'bidRepo',
          type: 'Repository<Bid>',
          description: 'Data store for all bids'
        },
        {
          name: 'notificationService',
          type: 'NotificationService',
          description: 'Sends outbid, won, lost notifications'
        },
        {
          name: 'scheduler',
          type: 'ScheduledExecutorService',
          description: 'Manages auction start/end timers and extension scheduling'
        }
      ],
      methods: [
        {
          name: 'createAuction(seller, item, reservePrice, duration)',
          returns: 'Auction',
          description: 'Creates a new auction in UPCOMING state'
        },
        {
          name: 'placeBid(auctionId, bidder, amount)',
          returns: 'Bid',
          description: 'Places a bid if valid (above current + increment). Triggers auto-extension if in final minute.'
        },
        {
          name: 'closeAuction(auctionId)',
          returns: 'Auction',
          description: 'Determines winner or marks as UNSOLD. Sends notifications.'
        },
        {
          name: 'cancelAuction(auctionId)',
          returns: 'void',
          description: 'Cancels auction (only before start or by seller)'
        }
      ]
    },
    {
      name: 'Auction',
      description: 'An auction event for a single item. Maintains state, current highest bid, bid history, and timing configuration.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique auction identifier'
        },
        {
          name: 'item',
          type: 'Item',
          description: 'The item being auctioned'
        },
        {
          name: 'seller',
          type: 'User',
          description: 'User who listed the item'
        },
        {
          name: 'reservePrice',
          type: 'double',
          description: 'Minimum acceptable price — bids below this don\'t win even if highest'
        },
        {
          name: 'highestBid',
          type: 'Bid',
          description: 'Current winning bid'
        },
        {
          name: 'bidIncrement',
          type: 'double',
          description: 'Minimum amount next bid must exceed current by'
        },
        {
          name: 'status',
          type: 'AuctionStatus',
          description: 'UPCOMING, ACTIVE, EXTENDED, CLOSED, SOLD, UNSOLD'
        },
        {
          name: 'startTime',
          type: 'LocalDateTime',
          description: 'Scheduled auction start'
        },
        {
          name: 'endTime',
          type: 'LocalDateTime',
          description: 'Scheduled end (may be extended)'
        },
        {
          name: 'maxBids',
          type: 'Map<User, Double>',
          description: 'Maximum auto-bid amounts per user'
        }
      ],
      methods: [
        {
          name: 'start()',
          returns: 'void',
          description: 'Transitions to ACTIVE and begins accepting bids'
        },
        {
          name: 'placeBid(bid)',
          returns: 'boolean',
          description: 'Processes a new bid — validates amount, updates highest, checks extension'
        },
        {
          name: 'extend()',
          returns: 'void',
          description: 'Extends endTime by extension period (anti-sniping)'
        },
        {
          name: 'close()',
          returns: 'void',
          description: 'Finalizes auction — determines winning bid or marks unsold'
        }
      ]
    },
    {
      name: 'Bid',
      description: 'A single bid placed by a user on an auction. Contains amount, timestamp, and whether it was automatic.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique bid identifier'
        },
        {
          name: 'auction',
          type: 'Auction',
          description: 'Auction this bid belongs to'
        },
        {
          name: 'bidder',
          type: 'User',
          description: 'User placing the bid'
        },
        {
          name: 'amount',
          type: 'double',
          description: 'Bid amount (must exceed current highest + increment)'
        },
        {
          name: 'timestamp',
          type: 'LocalDateTime',
          description: 'When the bid was placed'
        },
        {
          name: 'isAutoBid',
          type: 'boolean',
          description: 'True if system placed this bid on behalf of the user'
        }
      ],
      methods: []
    },
    {
      name: 'User',
      description: 'Auction participant — can be a seller (creates auctions) or bidder (places bids). Has notification preferences and bidding history.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique user identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Display name'
        },
        {
          name: 'email',
          type: 'String',
          description: 'Contact email for notifications'
        }
      ],
      methods: [
        {
          name: 'createAuction(item, reservePrice, duration)',
          returns: 'Auction',
          description: 'Creates a new auction as seller'
        },
        {
          name: 'placeBid(auction, amount)',
          returns: 'Bid',
          description: 'Places a bid on an active auction'
        },
        {
          name: 'setMaxBid(auction, maxAmount)',
          returns: 'void',
          description: 'Sets maximum auto-bid amount'
        }
      ]
    },
    {
      name: 'NotificationService',
      description: 'Manages user notifications for auction events: outbid alerts, auction start, auction end, won/lost results.',
      fields: [
        {
          name: 'subscribers',
          type: 'Map<String, List<User>>',
          description: 'Users subscribed to notifications per auction'
        }
      ],
      methods: [
        {
          name: 'onOutbid(auction, bidder)',
          returns: 'void',
          description: 'Notifies previous highest bidder they\'ve been outbid'
        },
        {
          name: 'onAuctionEnd(auction)',
          returns: 'void',
          description: 'Notifies winner and all participants of auction result'
        },
        {
          name: 'onAuctionStart(auction)',
          returns: 'void',
          description: 'Notifies watchers that an auction they follow has started'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'NotificationService implements Observer. Bidders subscribe to events (outbid, won, lost). AuctionService notifies without knowing who is watching. Also used for auto-bidding — system watches bids and auto-places higher bids up to max.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'AuctionStatus enum with transitions: UPCOMING to ACTIVE to EXTENDED/CLOSED, CLOSED to SOLD/UNSOLD. Each state determines which operations are allowed. State machine prevents illegal transitions.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'AuctionService and NotificationService are singletons ensuring single source of truth for auction state. Critical for preventing bid conflicts on concurrent bids.'
    },
    {
      name: 'Strategy',
      used: true,
      explanation: 'BidIncrementStrategy interface with FixedIncrementStrategy, PercentageIncrementStrategy, DynamicIncrementStrategy (based on bid velocity). Auction delegates increment calculation to strategy.'
    },
    {
      name: 'Proxy',
      used: false,
      explanation: 'An AuctionProxy could control access based on state — rejecting bids on CLOSED auctions, blocking cancelled auctions. Separates access control from business logic.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Auction manages state and bids. Bid is a value object. User handles participant actions. AuctionService orchestrates workflow. NotificationService manages alerts.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New bid increment strategies implement BidIncrementStrategy. New auction statuses add to enum. New notification channels implement NotificationChannel. Core auction flow stays closed.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'AuctionService depends on Auction and Bid abstractions. NotificationService depends on NotificationChannel interface. Workflow logic doesn\'t depend on low-level infrastructure.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Bid validation is in Auction.placeBid(). Timer logic for extension is in one place. Notification dispatch is centralized in NotificationService. No duplication.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'English auction model: highest bid wins. Time-based state machine. Anti-sniping is just an extension timer. Complexities like sealed bids are deliberate extensions.'
    }
  ],
  oopConcepts: [
    {
      name: 'State Machine — Auction Status',
      description: 'AuctionStatus enum drives allowed operations. placeBid() checks status is ACTIVE/EXTENDED. close() requires ACTIVE/EXTENDED. cancel() requires UPCOMING. Invalid states are unrepresentable.',
      alternative: 'Could use boolean flags (isActive, isClosed). Enum makes exactly one state valid at any time, preventing contradictory flags.'
    },
    {
      name: 'Composition over Inheritance',
      description: 'Auction has-a Item, List of Bid, and highest Bid. Bid has-a User (bidder). User has-a List of Auction and List of Bid. Domain modeled through entity composition.',
      alternative: 'Could create auction type hierarchy (EnglishAuction extends Auction). Composition is chosen for flexibility.'
    },
    {
      name: 'Encapsulation — Bid Validation',
      description: 'Auction.placeBid() encapsulates all validation: checks auction is active, amount exceeds bid + increment, handles auto-extension. External code cannot bypass rules.',
      alternative: 'Could validate in service layer. Encapsulated validation keeps business rules co-located with protected state.'
    }
  ],
  extensibility: [
    {
      area: 'New Auction Type',
      description: 'Add DutchAuction (descending price) or SealedBidAuction. Each implements different bidding logic. AuctionService delegates to the auction type.',
      difficulty: 'Hard'
    },
    {
      area: 'Buy It Now',
      description: 'Add buyNowPrice to Auction. User purchases immediately at this price, ending auction early. Auction transitions to SOLD directly from ACTIVE.',
      difficulty: 'Easy'
    },
    {
      area: 'Proxy Bidding (Auto-bid)',
      description: 'Users set maximum bid. System monitors auction and automatically places incremental bids when outbid. Implemented via scheduled task evaluating active auctions.',
      difficulty: 'Medium'
    },
    {
      area: 'Watchlist / Favorites',
      description: 'Users add auctions to watchlist. Watchers notified when auction starts and when new bids placed. Implemented via existing NotificationService with minimal changes.',
      difficulty: 'Easy'
    }
  ]
};
