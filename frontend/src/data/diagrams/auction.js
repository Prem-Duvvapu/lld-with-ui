// classDiagrams — auction
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Auction System — Class Diagram',
  classes: [
    {
      name: 'Auction',
      fields: [
        '- id: String',
        '- item: Item',
        '- startingBid: double',
        '- currentBid: Bid',
        '- status: AuctionStatus',
        '- bids: List<Bid>',
        '- auctioneer: Auctioneer',
        '- startTime: LocalDateTime',
        '- endTime: LocalDateTime'
      ],
      methods: [
        '+ placeBid(bidder, amount): boolean',
        '+ close(): Bid',
        '+ getWinner(): Bidder'
      ]
    },
    {
      name: 'Item',
      fields: [
        '- id: String',
        '- name: String',
        '- description: String',
        '- reservePrice: double',
        '- seller: Bidder'
      ],
      methods: []
    },
    {
      name: 'Bidder',
      fields: [
        '- id: String',
        '- name: String',
        '- email: String',
        '- bids: List<Bid>',
        '- notifications: List<String>'
      ],
      methods: [
        '+ placeBid(auction, amount): Bid',
        '+ getWonAuctions(): List<Auction>'
      ]
    },
    {
      name: 'Bid',
      fields: [
        '- id: String',
        '- bidder: Bidder',
        '- auction: Auction',
        '- amount: double',
        '- timestamp: LocalDateTime'
      ],
      methods: []
    },
    {
      name: 'Auctioneer',
      fields: [
        '- id: String',
        '- name: String',
        '- auctions: List<Auction>'
      ],
      methods: [
        '+ createAuction(item, startBid, duration): Auction',
        '+ startAuction(auctionId): void',
        '+ endAuction(auctionId): void'
      ]
    },
    {
      name: 'AuctionStatus',
      stereotype: 'enum',
      fields: [
        'PENDING',
        'ACTIVE',
        'SOLD',
        'UNSOLD',
        'CANCELLED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Auction',
      to: 'Item',
      label: 'sells'
    },
    {
      from: 'Auction',
      to: 'Bid',
      label: 'contains'
    },
    {
      from: 'Auction',
      to: 'Bidder',
      label: 'has winner'
    },
    {
      from: 'Auction',
      to: 'Auctioneer',
      label: 'managed by'
    },
    {
      from: 'Auction',
      to: 'AuctionStatus',
      label: 'has state'
    },
    {
      from: 'Bid',
      to: 'Bidder',
      label: 'placed by'
    }
  ]
};
