// classDiagrams — parking
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Parking Lot — Class Diagram',
  classes: [
    {
      name: 'ParkingLotController',
      stereotype: 'controller',
      fields: [
        '- service: ParkingLotService',
        '- simService: ParkingLotSimService'
      ],
      methods: [
        '+ entry(dto): Ticket',
        '+ scanExit(request): Ticket',
        '+ payExit(request): Ticket',
        '+ simEntry(request): Map',
        '+ simScan(request): Map',
        '+ simPay(request): Map'
      ]
    },
    {
      name: 'ParkingLotService',
      stereotype: 'singleton',
      fields: [
        '- repository: ParkingLotRepository',
        '- spotStrategyFactory: SpotAssignmentStrategyFactory',
        '- pricingStrategyFactory: PricingStrategyFactory'
      ],
      methods: [
        '+ entry(dto): Ticket',
        '+ scanTicket(gateId, tktNo, strategy): Ticket',
        '+ payAndExit(gateId, tktNo, strategy, payMethod): Ticket',
        '+ getActiveTickets(): List<Ticket>'
      ]
    },
    {
      name: 'ParkingLotSimService',
      stereotype: 'singleton',
      fields: [
        '- simSpots: ConcurrentHashMap<String, ParkingSpot>',
        '- simTickets: ConcurrentHashMap<String, Ticket>',
        '- simEventLog: CopyOnWriteArrayList<SimEvent>',
        '- simSpotLock: ReentrantLock',
        '- simTicketLock: ReentrantLock'
      ],
      methods: [
        '+ reset(): Map',
        '+ entry(vehicleNumber, vehicleType, strategy): Map',
        '+ scan(ticketNumber, pricingStrategy): Map',
        '+ pay(ticketNumber, pricingStrategy, paymentMethod): Map'
      ]
    },
    {
      name: 'Ticket',
      fields: [
        '- ticketNumber: String',
        '- vehicleNumber: String',
        '- vehicleType: VehicleType',
        '- spotId: String',
        '- entryTime: LocalDateTime',
        '- exitTime: LocalDateTime',
        '- amount: double',
        '- paymentStatus: PaymentStatus',
        '- paymentMethod: String'
      ],
      methods: []
    },
    {
      name: 'ParkingSpotRequestDto',
      stereotype: 'dto',
      fields: [
        '- gateId: String',
        '- vehicleNumber: String',
        '- vehicleType: String',
        '- strategy: String'
      ],
      methods: [
        '+ getGateId()',
        '+ getVehicleNumber()',
        '+ getVehicleType()',
        '+ getStrategy()'
      ]
    },
    {
      name: 'ParkingSpot',
      fields: [
        '- id: String',
        '- floorNumber: int',
        '- spotNumber: int',
        '- vehicleType: VehicleType',
        '- occupied: boolean'
      ],
      methods: [
        '+ isOccupied(): boolean',
        '+ setOccupied(b): void'
      ]
    },
    {
      name: 'Floor',
      fields: [
        '- floorNumber: int',
        '- spots: List<ParkingSpot>'
      ],
      methods: []
    },
    {
      name: 'Gate',
      fields: [
        '- id: String',
        '- name: String',
        '- type: GateType (ENTRY/EXIT)'
      ],
      methods: []
    },
    {
      name: 'SimEvent',
      stereotype: 'dto',
      fields: [
        '- id: long',
        '- timestamp: String',
        '- eventType: String',
        '- actorName: String',
        '- description: String',
        '- data: Map<String, Object>'
      ],
      methods: []
    },
    {
      name: 'VehicleType',
      stereotype: 'enum',
      fields: ['CAR', 'BIKE', 'TRUCK'],
      methods: []
    },
    {
      name: 'PaymentStatus',
      stereotype: 'enum',
      fields: ['UNPAID', 'PAID'],
      methods: []
    },
    {
      name: 'ParkingLotException',
      stereotype: 'abstract',
      fields: [],
      methods: []
    },
    {
      name: 'GateNotFoundException',
      stereotype: '404',
      fields: [],
      methods: []
    },
    {
      name: 'InvalidGateTypeException',
      stereotype: '400',
      fields: [],
      methods: []
    },
    {
      name: 'VehicleTypeNotSupportedException',
      stereotype: '400',
      fields: [],
      methods: []
    },
    {
      name: 'SpotNotAvailableException',
      stereotype: '409',
      fields: [],
      methods: []
    },
    {
      name: 'SpotNotFoundException',
      stereotype: '404',
      fields: [],
      methods: []
    },
    {
      name: 'TicketNotFoundException',
      stereotype: '404',
      fields: [],
      methods: []
    },
    {
      name: 'TicketAlreadyExitedException',
      stereotype: '409',
      fields: [],
      methods: []
    },
    {
      name: 'ParkingLotRepository',
      fields: [
        '- floors: Map<String, Floor>',
        '- spots: ConcurrentHashMap<String, ParkingSpot>',
        '- tickets: ConcurrentHashMap<String, Ticket>',
        '- spotLock: ReentrantLock',
        '- ticketLock: ReentrantLock'
      ],
      methods: [
        '+ occupySpot(type, strategy): ParkingSpot',
        '+ releaseSpot(spotId): void',
        '+ completeExit(tktNo, exitTime, strategy, payMethod): Ticket',
        '+ generateTicketNumber(): String'
      ]
    },
    {
      name: 'SpotAssignmentStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ findSpot(spots, vehicleType): ParkingSpot'
      ]
    },
    {
      name: 'NearestSpotStrategy',
      fields: [
        'implements SpotAssignmentStrategy'
      ],
      methods: [
        '+ findSpot(spots, vehicleType): ParkingSpot'
      ]
    },
    {
      name: 'FarthestSpotStrategy',
      fields: [
        'implements SpotAssignmentStrategy'
      ],
      methods: [
        '+ findSpot(spots, vehicleType): ParkingSpot'
      ]
    },
    {
      name: 'SpotAssignmentStrategyFactory',
      fields: [
        '- strategies: EnumMap<SpotAssignmentStrategyType, SpotAssignmentStrategy>'
      ],
      methods: [
        '+ getStrategy(name): SpotAssignmentStrategy'
      ]
    },
    {
      name: 'PricingStrategy',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ calculatePrice(ticket): double'
      ]
    },
    {
      name: 'HourlyPricingStrategy',
      fields: [
        'implements PricingStrategy'
      ],
      methods: [
        '+ calculatePrice(ticket): double'
      ]
    },
    {
      name: 'FlatRatePricingStrategy',
      fields: [
        'implements PricingStrategy'
      ],
      methods: [
        '+ calculatePrice(ticket): double'
      ]
    },
    {
      name: 'DynamicPricingStrategy',
      fields: [
        'implements PricingStrategy',
        '- baseStrategy: HourlyPricingStrategy'
      ],
      methods: [
        '+ calculatePrice(ticket): double'
      ]
    },
    {
      name: 'PricingStrategyFactory',
      fields: [
        '- strategies: EnumMap<PricingStrategyType, PricingStrategy>'
      ],
      methods: [
        '+ getStrategy(name): PricingStrategy'
      ]
    }
  ],
  relationships: [
    { from: 'ParkingLotController', to: 'ParkingLotService', label: 'delegates to' },
    { from: 'ParkingLotController', to: 'ParkingLotSimService', label: 'delegates /sim/* to' },
    { from: 'ParkingLotService', to: 'ParkingLotRepository', label: 'uses' },
    { from: 'ParkingLotService', to: 'SpotAssignmentStrategyFactory', label: 'uses' },
    { from: 'ParkingLotService', to: 'PricingStrategyFactory', label: 'uses' },
    { from: 'ParkingLotService', to: 'Ticket', label: 'creates & updates' },
    { from: 'ParkingLotService', to: 'ParkingSpotRequestDto', label: 'validates' },
    { from: 'ParkingLotService', to: 'ParkingLotException', label: 'throws' },
    { from: 'ParkingLotSimService', to: 'SpotAssignmentStrategyFactory', label: 'reuses' },
    { from: 'ParkingLotSimService', to: 'PricingStrategyFactory', label: 'reuses' },
    { from: 'ParkingLotSimService', to: 'SimEvent', label: 'logs' },
    { from: 'ParkingLotRepository', to: 'Floor', label: 'contains' },
    { from: 'Floor', to: 'ParkingSpot', label: 'contains' },
    { from: 'Ticket', to: 'ParkingSpot', label: 'references' },
    { from: 'Ticket', to: 'VehicleType', label: 'uses' },
    { from: 'Ticket', to: 'PaymentStatus', label: 'has status' },
    { from: 'ParkingSpot', to: 'VehicleType', label: 'uses' },
    { from: 'NearestSpotStrategy', to: 'SpotAssignmentStrategy', label: 'implements', dashed: true },
    { from: 'FarthestSpotStrategy', to: 'SpotAssignmentStrategy', label: 'implements', dashed: true },
    { from: 'HourlyPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'FlatRatePricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'DynamicPricingStrategy', to: 'PricingStrategy', label: 'implements', dashed: true },
    { from: 'SpotAssignmentStrategyFactory', to: 'SpotAssignmentStrategy', label: 'creates' },
    { from: 'PricingStrategyFactory', to: 'PricingStrategy', label: 'creates' },
    { from: 'GateNotFoundException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'InvalidGateTypeException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'VehicleTypeNotSupportedException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'SpotNotAvailableException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'SpotNotFoundException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'TicketNotFoundException', to: 'ParkingLotException', label: 'extends', dashed: true },
    { from: 'TicketAlreadyExitedException', to: 'ParkingLotException', label: 'extends', dashed: true }
  ]
};
