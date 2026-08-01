const classDiagrams = {
  parking: {
    title: 'Parking Lot — Class Diagram',
    classes: [
      { name: 'ParkingLotService', stereotype: 'singleton', fields: ['- repository: ParkingLotRepository', '- spotStrategyFactory: SpotAssignmentStrategyFactory', '- pricingStrategyFactory: PricingStrategyFactory'], methods: ['+ entry(dto): Ticket', '+ scanTicket(gateId, tktNo, strategy): Ticket', '+ payAndExit(gateId, tktNo, strategy, payMethod): Ticket', '+ getActiveTickets(): List<Ticket>'] },
      { name: 'Ticket', fields: ['- ticketNumber: String', '- vehicleNumber: String', '- vehicleType: VehicleType', '- spotId: String', '- entryTime: LocalDateTime', '- exitTime: LocalDateTime', '- amount: double', '- paymentStatus: PaymentStatus', '- paymentMethod: String'], methods: [] },
      { name: 'ParkingSpotRequestDto', stereotype: 'dto', fields: ['- gateId: String', '- vehicleNumber: String', '- vehicleType: String', '- strategy: String'], methods: ['+ getGateId()', '+ getVehicleNumber()', '+ getVehicleType()', '+ getStrategy()'] },
      { name: 'ParkingSpot', fields: ['- id: String', '- floorNumber: int', '- spotNumber: int', '- vehicleType: VehicleType', '- occupied: boolean'], methods: ['+ isOccupied(): boolean', '+ setOccupied(b): void'] },
      { name: 'Floor', fields: ['- floorNumber: int', '- spots: List<ParkingSpot>'], methods: [] },
      { name: 'Gate', fields: ['- id: String', '- name: String', '- type: GateType (ENTRY/EXIT)'], methods: [] },
      { name: 'VehicleType', stereotype: 'enum', fields: ['CAR', 'BIKE', 'TRUCK'], methods: [] },
      { name: 'PaymentStatus', stereotype: 'enum', fields: ['UNPAID', 'PAID'], methods: [] },
      { name: 'ParkingLotRepository', fields: ['- floors: Map<String, Floor>', '- spots: ConcurrentHashMap<String, ParkingSpot>', '- tickets: ConcurrentHashMap<String, Ticket>', '- spotLock: ReentrantLock', '- ticketLock: ReentrantLock'], methods: ['+ occupySpot(type, strategy): ParkingSpot', '+ releaseSpot(spotId): void', '+ generateTicketNumber(): String'] },
      { name: 'SpotAssignmentStrategy', stereotype: 'interface', fields: [], methods: ['+ findSpot(spots, vehicleType): ParkingSpot'] },
      { name: 'NearestSpotStrategy', fields: ['implements SpotAssignmentStrategy'], methods: ['+ findSpot(spots, vehicleType): ParkingSpot'] },
      { name: 'FarthestSpotStrategy', fields: ['implements SpotAssignmentStrategy'], methods: ['+ findSpot(spots, vehicleType): ParkingSpot'] },
      { name: 'SpotAssignmentStrategyFactory', fields: ['- strategies: Map<String, SpotAssignmentStrategy>'], methods: ['+ getStrategy(name): SpotAssignmentStrategy'] },
      { name: 'PricingStrategy', stereotype: 'interface', fields: [], methods: ['+ calculatePrice(ticket): double'] },
      { name: 'HourlyPricingStrategy', fields: ['implements PricingStrategy'], methods: ['+ calculatePrice(ticket): double'] },
      { name: 'FlatRatePricingStrategy', fields: ['implements PricingStrategy'], methods: ['+ calculatePrice(ticket): double'] },
      { name: 'DynamicPricingStrategy', fields: ['implements PricingStrategy', '- baseStrategy: HourlyPricingStrategy'], methods: ['+ calculatePrice(ticket): double'] },
      { name: 'PricingStrategyFactory', fields: ['- strategies: Map<String, PricingStrategy>'], methods: ['+ getStrategy(name): PricingStrategy'] },
    ],
    relationships: [
      { from: 'ParkingLotService', to: 'ParkingLotRepository', label: 'uses' },
      { from: 'ParkingLotService', to: 'SpotAssignmentStrategyFactory', label: 'uses' },
      { from: 'ParkingLotService', to: 'PricingStrategyFactory', label: 'uses' },
      { from: 'ParkingLotService', to: 'Ticket', label: 'creates & updates' },
      { from: 'ParkingLotService', to: 'ParkingSpotRequestDto', label: 'validates' },
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
    ]
  },

  zomato: {
    title: 'Zomato — Class Diagram',
    classes: [
      { name: 'ZomatoService', fields: ['- repository: ZomatoRepository'], methods: ['+ getRestaurants(): List<Restaurant>', '+ placeOrder(user, items): Order', '+ updateOrderStatus(orderId, status): Order'] },
      { name: 'Order', fields: ['- id: String', '- status: OrderStatus', '- items: List<OrderItem>', '- totalAmount: double'], methods: ['+ nextStatus(): void', '+ calculateTotal(): double'] },
      { name: 'OrderStatus', stereotype: 'enum', fields: ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'], methods: [] },
      { name: 'Restaurant', fields: ['- id: String', '- name: String', '- cuisine: String', '- menu: List<MenuItem>'], methods: ['+ getMenu(): List<MenuItem>'] },
      { name: 'MenuItem', fields: ['- id: String', '- name: String', '- price: double', '- restaurantId: String'], methods: [] },
      { name: 'DeliveryPartner', fields: ['- id: String', '- name: String', '- phone: String', '- available: boolean'], methods: ['+ assignOrder(order): void'] },
    ],
    relationships: [
      { from: 'ZomatoService', to: 'Order', label: 'manages' },
      { from: 'Order', to: 'OrderStatus', label: 'has state' },
      { from: 'Order', to: 'Restaurant', label: 'belongs to' },
      { from: 'Restaurant', to: 'MenuItem', label: 'has menu' },
      { from: 'Order', to: 'DeliveryPartner', label: 'assigned to' },
    ]
  },

  uber: {
    title: 'Uber Cab Booking — Class Diagram',
    classes: [
      { name: 'UberService', methods: ['+ registerRider(rider): Rider', '+ registerDriver(driver): Driver', '+ updateDriverStatus(id, status): Driver', '+ estimate(pickup, dropoff, type): FareEstimate', '+ requestRide(userId, pickup, dropoff, type): Ride', '+ assignDriver(rideId, driverId): Ride', '+ startTrip(rideId): Ride', '+ completeTrip(rideId, paymentMethod): Ride', '+ cancelTrip(rideId): Ride'] },
      { name: 'User', stereotype: 'abstract', fields: ['# id: String', '# name: String', '# phone: String'], methods: ['+ getId(): String', '+ getName(): String'] },
      { name: 'Rider', fields: ['- currentLocation: Location'], methods: ['+ getCurrentLocation(): Location'] },
      { name: 'Driver', fields: ['- vehicleType: VehicleType', '- vehicleNumber: String', '- currentLocation: Location', '- status: DriverStatus'], methods: ['+ isAvailable(): boolean', '+ setStatus(status): void'] },
      { name: 'Ride', fields: ['- id: String', '- rider: Rider', '- driver: Driver', '- pickup: Location', '- dropoff: Location', '- distanceKm: double', '- fare: double', '- status: RideStatus', '- payment: Payment'], methods: ['+ setStatus(status): void', '+ setPayment(payment): void'] },
      { name: 'Location', fields: ['- latitude: double', '- longitude: double', '- label: String'], methods: ['+ distanceTo(other): double'] },
      { name: 'DriverStatus', stereotype: 'enum', fields: ['AVAILABLE', 'ON_TRIP', 'OFFLINE'], methods: [] },
      { name: 'RideStatus', stereotype: 'enum', fields: ['REQUESTED', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED'], methods: [] },
      { name: 'Payment', fields: ['- id: String', '- tripId: String', '- amount: double', '- method: String', '- status: PaymentStatus'], methods: ['+ setStatus(status): void'] },
      { name: 'PaymentStatus', stereotype: 'enum', fields: ['PENDING', 'COMPLETED', 'FAILED'], methods: [] },
      { name: 'PaymentProcessor', methods: ['+ validate(payment): boolean', '+ process(payment): Payment'] },
      { name: 'VehicleType', stereotype: 'enum', fields: ['UBER_GO', 'UBER_XL', 'UBER_PREMIUM'], methods: [] },
    ],
    relationships: [
      { from: 'Rider', to: 'User', label: 'extends', dashed: true },
      { from: 'Driver', to: 'User', label: 'extends', dashed: true },
      { from: 'UberService', to: 'Ride', label: 'manages' },
      { from: 'UberService', to: 'PaymentProcessor', label: 'uses' },
      { from: 'Ride', to: 'Rider', label: 'requested by' },
      { from: 'Ride', to: 'Driver', label: 'assigned to' },
      { from: 'Ride', to: 'RideStatus', label: 'has state' },
      { from: 'Ride', to: 'Payment', label: 'has payment' },
      { from: 'Driver', to: 'DriverStatus', label: 'has status' },
      { from: 'Driver', to: 'VehicleType', label: 'drives' },
      { from: 'Payment', to: 'PaymentStatus', label: 'has status' },
    ]
  },

  stackoverflow: {
    title: 'Stack Overflow — Class Diagram',
    classes: [
      { name: 'StackOverflowService', methods: ['+ postQuestion(user, title, body, tags): Question', '+ postAnswer(user, questionId, body): Answer', '+ vote(entity, user, voteType): void', '+ acceptAnswer(questionId, answerId): void'] },
      { name: 'Question', fields: ['- id: String', '- title: String', '- body: String', '- author: User', '- tags: List<Tag>', '- answers: List<Answer>', '- acceptedAnswerId: String'], methods: ['+ addVote(vote): void', '+ getScore(): int'] },
      { name: 'Answer', fields: ['- id: String', '- body: String', '- author: User', '- votes: List<Vote>'], methods: ['+ addVote(vote): void'] },
      { name: 'User', fields: ['- id: String', '- name: String', '- reputation: int'], methods: ['+ updateReputation(delta): void'] },
      { name: 'Vote', fields: ['- type: VoteType', '- user: User'], methods: [] },
      { name: 'VoteType', stereotype: 'enum', fields: ['UPVOTE', 'DOWNVOTE'], methods: [] },
      { name: 'Tag', fields: ['- name: String'], methods: [] },
      { name: 'ReputationStrategy', stereotype: 'interface', methods: ['+ calculateReputation(user, action): int'] },
      { name: 'QuestionReputationStrategy', fields: ['- implements ReputationStrategy'], methods: ['+ calculateReputation(user, action): int'] },
      { name: 'AnswerReputationStrategy', fields: ['- implements ReputationStrategy'], methods: ['+ calculateReputation(user, action): int'] },
    ],
    relationships: [
      { from: 'StackOverflowService', to: 'Question', label: 'manages' },
      { from: 'StackOverflowService', to: 'Answer', label: 'manages' },
      { from: 'Question', to: 'Answer', label: 'has' },
      { from: 'Question', to: 'Tag', label: 'tagged with' },
      { from: 'Question', to: 'Vote', label: 'has' },
      { from: 'Answer', to: 'Vote', label: 'has' },
      { from: 'StackOverflowService', to: 'ReputationStrategy', label: 'uses' },
      { from: 'QuestionReputationStrategy', to: 'ReputationStrategy', label: 'implements', dashed: true },
      { from: 'AnswerReputationStrategy', to: 'ReputationStrategy', label: 'implements', dashed: true },
    ]
  },

  tictactoe: {
    title: 'Tic Tac Toe — Class Diagram',
    classes: [
      { name: 'TicTacToeService', methods: ['+ createGame(): Game', '+ makeMove(gameId, playerId, row, col): Game', '+ checkWin(board): Player', '+ checkDraw(board): boolean'] },
      { name: 'Game', fields: ['- id: String', '- board: String[3][3]', '- players: Player[2]', '- currentTurn: Player', '- state: GameState', '- winner: Player'], methods: ['+ switchTurn(): void'] },
      { name: 'GameState', stereotype: 'enum', fields: ['IN_PROGRESS', 'FINISHED', 'DRAW'], methods: [] },
      { name: 'Player', fields: ['- name: String', '- symbol: Symbol (X/O)'], methods: [] },
    ],
    relationships: [
      { from: 'TicTacToeService', to: 'Game', label: 'manages' },
      { from: 'Game', to: 'GameState', label: 'has state' },
      { from: 'Game', to: 'Player', label: 'has 2' },
    ]
  },

  snakeladders: {
    title: 'Snake & Ladders — Class Diagram',
    classes: [
      { name: 'SnakeLaddersService', methods: ['+ createGame(playerNames): Game', '+ rollDice(gameId): RollResult', '+ checkWin(player): boolean'] },
      { name: 'Game', fields: ['- id: String', '- players: List<Player>', '- board: Map<Integer, Integer>', '- currentPlayerIndex: int', '- state: GameState'], methods: ['+ movePlayer(player, steps): void', '+ applySnakeOrLadder(pos): int', '+ nextTurn(): void'] },
      { name: 'Player', fields: ['- name: String', '- position: int', '- color: String'], methods: ['+ setPosition(pos): void'] },
      { name: 'Dice', methods: ['+ roll(): int'] },
      { name: 'Snake', fields: ['- head: int', '- tail: int'], methods: [] },
      { name: 'Ladder', fields: ['- bottom: int', '- top: int'], methods: [] },
      { name: 'GameState', stereotype: 'enum', fields: ['IN_PROGRESS', 'FINISHED'], methods: [] },
    ],
    relationships: [
      { from: 'SnakeLaddersService', to: 'Game', label: 'manages' },
      { from: 'Game', to: 'Player', label: 'has' },
      { from: 'Game', to: 'Dice', label: 'uses' },
      { from: 'Game', to: 'Snake', label: 'has 6' },
      { from: 'Game', to: 'Ladder', label: 'has 11' },
      { from: 'Game', to: 'GameState', label: 'has state' },
    ]
  },

  atm: {
    title: 'ATM — Class Diagram',
    classes: [
      { name: 'AtmService', methods: ['+ authenticate(cardNo, pin): Account', '+ getBalance(accNo): double', '+ withdraw(accNo, amount): Transaction', '+ deposit(accNo, amount): Transaction'] },
      { name: 'Account', fields: ['- accountNumber: String', '- pin: String', '- holderName: String', '- balance: double'], methods: ['+ debit(amount): void', '+ credit(amount): void'] },
      { name: 'Transaction', fields: ['- id: long', '- type: TransactionType', '- amount: double', '- status: String', '- timestamp: LocalDateTime'], methods: [] },
      { name: 'TransactionType', stereotype: 'enum', fields: ['BALANCE_INQUIRY', 'WITHDRAWAL', 'DEPOSIT'], methods: [] },
      { name: 'AtmRepository', fields: ['- accounts: ConcurrentHashMap', '- lock: ReentrantLock'], methods: ['+ findAccountByNumber(no): Account', '+ updateBalance(acc): void'] },
    ],
    relationships: [
      { from: 'AtmService', to: 'Account', label: 'manages' },
      { from: 'AtmService', to: 'Transaction', label: 'creates' },
      { from: 'Transaction', to: 'TransactionType', label: 'has type' },
      { from: 'AtmService', to: 'AtmRepository', label: 'uses' },
    ]
  },

  splitwise: {
    title: 'Splitwise — Class Diagram',
    classes: [
      { name: 'SplitwiseService', methods: ['+ createUser(name, email): User', '+ createGroup(name, members): Group', '+ addExpense(desc, amount, paidBy, group, splits): Expense', '+ getBalances(userId): Map', '+ settleUp(from, to, group, amount): Settlement'] },
      { name: 'User', fields: ['- id: long', '- name: String', '- email: String'], methods: [] },
      { name: 'Group', fields: ['- id: long', '- name: String', '- members: List<User>'], methods: ['+ addMember(user): void'] },
      { name: 'Expense', fields: ['- id: long', '- description: String', '- amount: double', '- paidBy: User', '- splits: List<Split>', '- groupId: long'], methods: [] },
      { name: 'Split', fields: ['- user: User', '- amount: double', '- percentage: double', '- type: SplitType'], methods: [] },
      { name: 'SplitType', stereotype: 'enum', fields: ['EQUAL', 'PERCENTAGE', 'EXACT'], methods: [] },
      { name: 'Settlement', fields: ['- fromUser: User', '- toUser: User', '- amount: double', '- groupId: long'], methods: [] },
    ],
    relationships: [
      { from: 'SplitwiseService', to: 'User', label: 'manages' },
      { from: 'SplitwiseService', to: 'Group', label: 'manages' },
      { from: 'Group', to: 'User', label: 'contains' },
      { from: 'Expense', to: 'Split', label: 'has' },
      { from: 'Expense', to: 'User', label: 'paid by' },
      { from: 'Split', to: 'SplitType', label: 'has type' },
      { from: 'SplitwiseService', to: 'Settlement', label: 'creates' },
    ]
  },

  elevator: {
    title: 'Elevator — Class Diagram',
    classes: [
      { name: 'ElevatorService', methods: ['+ requestElevator(from, to): Request', '+ tick(): List<Elevator>', '+ findBestElevator(from, to): Elevator'] },
      { name: 'Elevator', fields: ['- id: int', '- name: String', '- currentFloor: int', '- direction: Direction', '- status: ElevatorStatus', '- capacity: int', '- pendingFloors: List<Integer>'], methods: ['+ addStop(floor): void', '+ removeStop(floor): void', '+ isFull(): boolean'] },
      { name: 'Direction', stereotype: 'enum', fields: ['UP', 'DOWN', 'IDLE'], methods: [] },
      { name: 'ElevatorStatus', stereotype: 'enum', fields: ['MOVING', 'STOPPED', 'DOOR_OPEN', 'OUT_OF_ORDER'], methods: [] },
      { name: 'Request', fields: ['- id: long', '- fromFloor: int', '- toFloor: int', '- status: String', '- assignedElevatorId: int'], methods: [] },
      { name: 'ElevatorRepository', fields: ['- elevators: ConcurrentHashMap', '- requests: ConcurrentHashMap', '- lock: ReentrantLock'], methods: ['+ getAllElevators(): List', '+ saveElevator(e): void'] },
    ],
    relationships: [
      { from: 'ElevatorService', to: 'Elevator', label: 'manages' },
      { from: 'ElevatorService', to: 'Request', label: 'creates' },
      { from: 'Elevator', to: 'Direction', label: 'has' },
      { from: 'Elevator', to: 'ElevatorStatus', label: 'has status' },
      { from: 'Request', to: 'Elevator', label: 'assigned to' },
      { from: 'ElevatorService', to: 'ElevatorRepository', label: 'uses' },
    ]
  },

  chess: {
    title: 'Chess — Class Diagram',
    classes: [
      { name: 'ChessService', fields: ['- repository: ChessRepository', '- lock: ReentrantLock'], methods: ['+ createGame(w, b): Game', '+ makeMove(id, fr, fc, tr, tc): Game', '+ getValidMoves(id, r, c): List<int[]>', '+ getGame(id): Game'] },
      { name: 'Game', fields: ['- id: long', '- board: String[8][8]', '- players: Player[2]', '- currentPlayerIndex: int', '- status: GameStatus', '- winner: String', '- moveHistory: List<Move>'], methods: [] },
      { name: 'Player', fields: ['- id: long', '- name: String', '- color: String (WHITE/BLACK)'], methods: [] },
      { name: 'Move', fields: ['- fromRow/Col: int', '- toRow/Col: int', '- piece: String', '- capturedPiece: String', '- isCastling: boolean'], methods: [] },
      { name: 'GameStatus', stereotype: 'enum', fields: ['ACTIVE', 'CHECK', 'CHECKMATE', 'DRAW', 'STALEMATE'], methods: [] },
      { name: 'PieceType', stereotype: 'enum', fields: ['KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN'], methods: [] },
      { name: 'ChessRepository', fields: ['- games: ConcurrentHashMap<Long, Game>'], methods: ['+ save(game): void', '+ get(id): Game', '+ nextId(): long'] },
    ],
    relationships: [
      { from: 'ChessService', to: 'ChessRepository', label: 'uses' },
      { from: 'ChessService', to: 'Game', label: 'manages' },
      { from: 'Game', to: 'Player', label: 'has 2' },
      { from: 'Game', to: 'GameStatus', label: 'has state' },
      { from: 'Game', to: 'Move', label: 'has many' },
    ]
  },

  ludo: {
    title: 'Ludo — Class Diagram',
    classes: [
      { name: 'LudoService', fields: ['- repository: LudoRepository', '- lock: ReentrantLock'], methods: ['+ createGame(players): Game', '+ rollDice(id): Game', '+ moveToken(id, pi, ti): Game', '+ getGame(id): Game'] },
      { name: 'Game', fields: ['- id: long', '- players: List<Player>', '- tokens: List<List<Token>>', '- currentPlayerIndex: int', '- diceValue: int', '- status: GameStatus', '- winner: String'], methods: [] },
      { name: 'Player', fields: ['- index: int', '- name: String', '- color: String (RED/GREEN/BLUE/YELLOW)'], methods: [] },
      { name: 'Token', fields: ['- id: int', '- color: String', '- position: int', '- isHome: boolean', '- isFinished: boolean'], methods: [] },
      { name: 'GameStatus', stereotype: 'enum', fields: ['WAITING', 'PLAYING', 'FINISHED'], methods: [] },
      { name: 'LudoRepository', fields: ['- games: ConcurrentHashMap<Long, Game>'], methods: ['+ save(game): void', '+ get(id): Game', '+ nextId(): long'] },
    ],
    relationships: [
      { from: 'LudoService', to: 'LudoRepository', label: 'uses' },
      { from: 'LudoService', to: 'Game', label: 'manages' },
      { from: 'Game', to: 'Player', label: 'has 4' },
      { from: 'Game', to: 'Token', label: 'has 16 (4x4)' },
      { from: 'Game', to: 'GameStatus', label: 'has state' },
    ]
  },

  coffee: {
    title: 'Coffee Machine — Class Diagram',
    classes: [
      { name: 'CoffeeMachineService', fields: ['- repository: CoffeeRepository', '- lock: ReentrantLock'], methods: ['+ getMenu(): List<Beverage>', '+ selectBeverage(id): Map', '+ brew(id): Map', '+ getStatus(): Map', '+ refillIngredient(ing, amt): Map'] },
      { name: 'Beverage', fields: ['- id: long', '- name: String', '- price: double', '- recipe: Map<Ingredient, Integer>', '- available: boolean'], methods: [] },
      { name: 'Ingredient', stereotype: 'enum', fields: ['COFFEE_BEANS', 'MILK', 'WATER', 'SUGAR', 'CHOCOLATE', 'CREAM'], methods: [] },
      { name: 'CoffeeMachine', fields: ['- id: long', '- status: String (IDLE/BREWING/COMPLETE/ERROR)', '- currentBeverage: String', '- ingredients: Map<Ingredient, Integer>'], methods: ['+ setStatus(s): void', '+ setCurrentBeverage(b): void'] },
      { name: 'Order', fields: ['- id: long', '- beverageId: long', '- status: String (PREPARING/COMPLETED/FAILED)', '- timestamp: LocalDateTime'], methods: [] },
      { name: 'CoffeeRepository', fields: ['- beverages: ConcurrentHashMap', '- machine: CoffeeMachine', '- orders: List<Order>'], methods: ['+ getBeverages(): List', '+ getMachine(): CoffeeMachine', '+ addOrder(o): void'] },
    ],
    relationships: [
      { from: 'CoffeeMachineService', to: 'CoffeeRepository', label: 'uses' },
      { from: 'CoffeeMachineService', to: 'Beverage', label: 'manages' },
      { from: 'CoffeeMachineService', to: 'CoffeeMachine', label: 'controls' },
      { from: 'CoffeeMachineService', to: 'Order', label: 'creates' },
      { from: 'Beverage', to: 'Ingredient', label: 'uses' },
      { from: 'CoffeeMachine', to: 'Ingredient', label: 'tracks' },
    ]
  },

  wallet: {
    title: 'Digital Wallet — Class Diagram',
    classes: [
      { name: 'WalletService', fields: ['- repository: WalletRepository', '- lock: ReentrantLock'], methods: ['+ createWallet(userId, name): Wallet', '+ getBalance(id): double', '+ addFunds(id, amt, method): Map', '+ sendMoney(from, to, amt, desc): Map', '+ getTransactions(id): List<Transaction>'] },
      { name: 'Wallet', fields: ['- id: long', '- userId: String', '- userName: String', '- balance: double', '- currency: String', '- createdAt: LocalDateTime'], methods: ['+ setBalance(b): void'] },
      { name: 'Transaction', fields: ['- id: long', '- fromWalletId: Long', '- toWalletId: Long', '- amount: double', '- type: String (CREDIT/DEBIT/TRANSFER)', '- status: String (PENDING/COMPLETED/FAILED)', '- timestamp: LocalDateTime', '- description: String'], methods: [] },
      { name: 'PaymentMethod', stereotype: 'enum', fields: ['UPI', 'CARD', 'BANK_TRANSFER', 'WALLET_BALANCE'], methods: [] },
      { name: 'WalletRepository', fields: ['- wallets: ConcurrentHashMap', '- transactions: ConcurrentHashMap', '- walletIdGen: AtomicLong', '- txnIdGen: AtomicLong'], methods: ['+ findWalletById(id): Wallet', '+ saveWallet(w): Wallet', '+ addTransaction(t): void', '+ getTransactionsByWalletId(id): List'] },
    ],
    relationships: [
      { from: 'WalletService', to: 'WalletRepository', label: 'uses' },
      { from: 'WalletService', to: 'Wallet', label: 'manages' },
      { from: 'WalletService', to: 'Transaction', label: 'creates' },
      { from: 'Transaction', to: 'Wallet', label: 'references (from/to)' },
    ]
  },

  hotel: {
    title: 'Hotel Management — Class Diagram',
    classes: [
      { name: 'HotelService', fields: ['- repository: HotelRepository', '- lock: ReentrantLock'], methods: ['+ getHotels(): List<Hotel>', '+ getAvailableRooms(hotelId, dates): List<Room>', '+ bookRoom(roomId, user, guest, dates): Booking', '+ checkIn(bookingId): Booking', '+ checkOut(bookingId): Booking', '+ cancelBooking(bookingId): Booking'] },
      { name: 'Hotel', fields: ['- id: String', '- name: String', '- location: String', '- rating: double', '- amenities: List<String>'], methods: [] },
      { name: 'Room', fields: ['- id: String', '- roomNumber: String', '- type: RoomType (SINGLE/DOUBLE/SUITE/DELUXE)', '- price: double', '- status: RoomStatus'], methods: ['+ setStatus(s): void'] },
      { name: 'Booking', fields: ['- id: String', '- guestName: String', '- checkIn: LocalDate', '- checkOut: LocalDate', '- status: BookingStatus', '- totalAmount: double'], methods: [] },
      { name: 'RoomType', stereotype: 'enum', fields: ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE'], methods: [] },
      { name: 'RoomStatus', stereotype: 'enum', fields: ['AVAILABLE', 'BOOKED', 'OCCUPIED', 'MAINTENANCE'], methods: [] },
      { name: 'BookingStatus', stereotype: 'enum', fields: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'], methods: [] },
      { name: 'HotelRepository', fields: ['- hotels: Map<String, Hotel>', '- rooms: ConcurrentHashMap', '- bookings: ConcurrentHashMap', '- lock: ReentrantLock'], methods: ['+ getAvailableRooms(hotelId): List<Room>', '+ saveBooking(b): void', '+ getActiveBookings(): List<Booking>'] },
    ],
    relationships: [
      { from: 'HotelService', to: 'HotelRepository', label: 'uses' },
      { from: 'HotelService', to: 'Booking', label: 'manages' },
      { from: 'HotelRepository', to: 'Hotel', label: 'contains' },
      { from: 'HotelRepository', to: 'Room', label: 'contains' },
      { from: 'Booking', to: 'Room', label: 'references' },
      { from: 'Room', to: 'RoomType', label: 'has type' },
      { from: 'Room', to: 'RoomStatus', label: 'has status' },
      { from: 'Booking', to: 'BookingStatus', label: 'has state' },
    ]
  },

  airline: {
    title: 'Airline Reservation — Class Diagram',
    classes: [
      { name: 'AirlineService', fields: ['- repository: AirlineRepository', '- lock: ReentrantLock'], methods: ['+ searchFlights(src, dest, date): List<Flight>', '+ getSeats(flightId): List<Seat>', '+ bookFlight(flightId, seats, user, pax): Booking', '+ checkIn(bookingId): Booking', '+ cancelBooking(bookingId): Booking'] },
      { name: 'Flight', fields: ['- id: String', '- flightNumber: String', '- source: String', '- destination: String', '- departureTime: LocalDateTime', '- totalSeats: int', '- availableSeats: int', '- fare: double'], methods: [] },
      { name: 'Seat', fields: ['- id: String', '- row: String', '- col: String', '- classType: SeatClass', '- price: double', '- status: SeatStatus'], methods: ['+ setStatus(s): void'] },
      { name: 'Booking', fields: ['- id: String', '- flightId: String', '- seatIds: List<String>', '- passengerName: String', '- status: BookingStatus', '- totalAmount: double'], methods: [] },
      { name: 'SeatClass', stereotype: 'enum', fields: ['ECONOMY', 'BUSINESS', 'FIRST'], methods: [] },
      { name: 'SeatStatus', stereotype: 'enum', fields: ['AVAILABLE', 'BOOKED'], methods: [] },
      { name: 'BookingStatus', stereotype: 'enum', fields: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED'], methods: [] },
      { name: 'AirlineRepository', fields: ['- flights: Map<String, Flight>', '- seats: ConcurrentHashMap', '- bookings: ConcurrentHashMap', '- lock: ReentrantLock'], methods: ['+ getAvailableSeats(flightId): List<Seat>', '+ saveBooking(b): void', '+ getActiveBookings(): List<Booking>'] },
    ],
    relationships: [
      { from: 'AirlineService', to: 'AirlineRepository', label: 'uses' },
      { from: 'AirlineService', to: 'Booking', label: 'manages' },
      { from: 'AirlineRepository', to: 'Flight', label: 'contains' },
      { from: 'AirlineRepository', to: 'Seat', label: 'contains' },
      { from: 'Flight', to: 'Seat', label: 'has many' },
      { from: 'Booking', to: 'Seat', label: 'references' },
      { from: 'Booking', to: 'Flight', label: 'belongs to' },
      { from: 'Seat', to: 'SeatClass', label: 'has class' },
      { from: 'Seat', to: 'SeatStatus', label: 'has status' },
      { from: 'Booking', to: 'BookingStatus', label: 'has state' },
    ]
  },

  minesweeper: {
    title: 'Minesweeper — Class Diagram',
    classes: [
      { name: 'MinesweeperService', methods: ['+ createGame(rows, cols, mines): Game', '+ revealCell(gameId, row, col): Game', '+ flagCell(gameId, row, col): Game', '+ getGame(id): Game'] },
      { name: 'Game', fields: ['- id: long', '- board: Cell[][]', '- rows: int', '- cols: int', '- totalMines: int', '- status: GameStatus', '- flagsUsed: int', '- revealedCount: int'], methods: [] },
      { name: 'Cell', fields: ['- row: int', '- col: int', '- isMine: boolean', '- isRevealed: boolean', '- isFlagged: boolean', '- adjacentMines: int'], methods: [] },
      { name: 'GameStatus', stereotype: 'enum', fields: ['PLAYING', 'WON', 'LOST'], methods: [] },
      { name: 'MinesweeperRepository', fields: ['- games: ConcurrentHashMap<Long, Game>'], methods: ['+ save(game): void', '+ get(id): Game'] },
    ],
    relationships: [
      { from: 'MinesweeperService', to: 'Game', label: 'manages' },
      { from: 'Game', to: 'Cell', label: 'contains' },
      { from: 'Game', to: 'GameStatus', label: 'has state' },
      { from: 'MinesweeperService', to: 'MinesweeperRepository', label: 'uses' },
    ]
  },

  vendingmachine: {
    title: 'Vending Machine — Class Diagram',
    classes: [
      { name: 'VendingMachineService', methods: ['+ getProducts(): List', '+ selectProduct(productId, qty): Transaction', '+ insertCoin(txnId, amount): Transaction', '+ dispense(txnId): Transaction', '+ cancelTransaction(txnId): Transaction'] },
      { name: 'Transaction', fields: ['- id: long', '- selectedProductIds: List', '- totalAmount: double', '- insertedAmount: double', '- change: double', '- status: String (PENDING/PAID/COMPLETED/CANCELLED)'], methods: [] },
      { name: 'Product', fields: ['- id: long', '- name: String', '- price: double', '- quantity: int', '- category: String'], methods: [] },
      { name: 'Slot', fields: ['- id: long', '- productId: long', '- row: int', '- col: int', '- capacity: int', '- currentStock: int'], methods: [] },
      { name: 'VendingState', stereotype: 'enum', fields: ['IDLE', 'SELECTING', 'DISPENSING', 'COMPLETE'], methods: [] },
      { name: 'VendingRepository', fields: ['- products: ConcurrentHashMap', '- slots: ConcurrentHashMap', '- transactions: ConcurrentHashMap'], methods: ['+ getAllProducts(): List', '+ findSlotByProductId(id): Slot', '+ saveTransaction(txn): void'] },
    ],
    relationships: [
      { from: 'VendingMachineService', to: 'Transaction', label: 'creates' },
      { from: 'VendingMachineService', to: 'Product', label: 'manages' },
      { from: 'Transaction', to: 'Product', label: 'references' },
      { from: 'Product', to: 'Slot', label: 'assigned to' },
      { from: 'VendingMachineService', to: 'VendingRepository', label: 'uses' },
      { from: 'VendingMachineService', to: 'VendingState', label: 'has state' },
    ]
  },

  loggingFramework: {
    title: 'Logging Framework — Class Diagram',
    classes: [
      { name: 'Logger', stereotype: 'singleton', fields: ['- instance: Logger', '- appenders: List<LogAppender>', '- defaultFormatter: LogFormatter'], methods: ['+ getInstance(): Logger', '+ addAppender(appender): void', '+ removeAppender(appender): void', '+ info(msg): void', '+ error(msg): void', '+ debug(msg): void'] },
      { name: 'LogLevel', stereotype: 'enum', fields: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'], methods: [] },
      { name: 'LogAppender', stereotype: 'interface', fields: [], methods: ['+ append(message, level): void'] },
      { name: 'ConsoleAppender', fields: ['- formatter: LogFormatter'], methods: ['+ append(message, level): void'] },
      { name: 'FileAppender', fields: ['- filePath: String', '- formatter: LogFormatter', '- maxSize: long'], methods: ['+ append(message, level): void', '+ rotateFile(): void'] },
      { name: 'LogFormatter', fields: ['- pattern: String'], methods: ['+ format(message, level, timestamp): String'] },
    ],
    relationships: [
      { from: 'Logger', to: 'LogLevel', label: 'uses' },
      { from: 'Logger', to: 'LogAppender', label: 'sends to' },
      { from: 'LogAppender', to: 'LogFormatter', label: 'uses' },
      { from: 'ConsoleAppender', to: 'LogAppender', label: 'implements', dashed: true },
      { from: 'FileAppender', to: 'LogAppender', label: 'implements', dashed: true },
    ]
  },

  trafficSignal: {
    title: 'Traffic Signal — Class Diagram',
    classes: [
      { name: 'TrafficLight', fields: ['- id: String', '- currentState: LightState', '- timer: Timer'], methods: ['+ changeState(newState): void', '+ getState(): LightState'] },
      { name: 'Intersection', fields: ['- id: String', '- lights: List<TrafficLight>', '- controller: SignalController'], methods: ['+ getLights(): List<TrafficLight>', '+ startCycle(): void'] },
      { name: 'SignalController', fields: ['- intersections: Map<String, Intersection>', '- activePattern: String'], methods: ['+ controlIntersection(id): void', '+ handleEmergency(id): void', '+ setTimings(green, yellow, red): void'] },
      { name: 'Timer', fields: ['- duration: int', '- remaining: int'], methods: ['+ start(): void', '+ tick(): void', '+ reset(): void', '+ isExpired(): boolean'] },
      { name: 'LightState', stereotype: 'enum', fields: ['RED', 'YELLOW', 'GREEN'], methods: [] },
    ],
    relationships: [
      { from: 'TrafficLight', to: 'LightState', label: 'has state' },
      { from: 'TrafficLight', to: 'Timer', label: 'has timer' },
      { from: 'Intersection', to: 'TrafficLight', label: 'contains' },
      { from: 'Intersection', to: 'SignalController', label: 'controlled by' },
      { from: 'SignalController', to: 'Intersection', label: 'monitors' },
    ]
  },

  taskManagement: {
    title: 'Task Management — Class Diagram',
    classes: [
      { name: 'Task', fields: ['- id: String', '- title: String', '- description: String', '- status: TaskStatus', '- priority: Priority', '- assignee: User', '- dueDate: LocalDate'], methods: ['+ updateStatus(status): void', '+ setPriority(priority): void', '+ assignTo(user): void'] },
      { name: 'User', fields: ['- id: String', '- name: String', '- email: String', '- boards: List<Board>'], methods: ['+ createBoard(name): Board', '+ getAssignedTasks(): List<Task>'] },
      { name: 'Board', fields: ['- id: String', '- title: String', '- lists: List<TaskList>'], methods: ['+ addList(name): TaskList', '+ removeList(list): void'] },
      { name: 'TaskList', fields: ['- id: String', '- name: String', '- tasks: List<Task>', '- board: Board'], methods: ['+ addTask(task): void', '+ removeTask(task): void', '+ reorderTasks(order): void'] },
      { name: 'TaskStatus', stereotype: 'enum', fields: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], methods: [] },
      { name: 'Priority', stereotype: 'enum', fields: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], methods: [] },
    ],
    relationships: [
      { from: 'Board', to: 'TaskList', label: 'contains' },
      { from: 'TaskList', to: 'Task', label: 'contains' },
      { from: 'Task', to: 'User', label: 'assigned to' },
      { from: 'Task', to: 'TaskStatus', label: 'has state' },
      { from: 'Task', to: 'Priority', label: 'has priority' },
      { from: 'User', to: 'Board', label: 'owns' },
    ]
  },

  linkedin: {
    title: 'LinkedIn — Class Diagram',
    classes: [
      { name: 'User', fields: ['- id: String', '- name: String', '- headline: String', '- connections: List<Connection>', '- posts: List<Post>'], methods: ['+ sendConnectionRequest(to): void', '+ acceptConnection(from): void', '+ createPost(content): Post', '+ getFeed(): List<Post>'] },
      { name: 'Profile', fields: ['- user: User', '- summary: String', '- experience: List<Experience>', '- education: List<Education>', '- skills: List<String>'], methods: ['+ addExperience(exp): void', '+ addSkill(skill): void'] },
      { name: 'Connection', fields: ['- fromUser: User', '- toUser: User', '- status: String', '- createdAt: LocalDateTime'], methods: [] },
      { name: 'Post', fields: ['- id: String', '- author: User', '- content: String', '- likes: int', '- comments: List<Comment>', '- createdAt: LocalDateTime'], methods: ['+ like(): void', '+ addComment(comment): void'] },
      { name: 'Notification', fields: ['- id: String', '- user: User', '- type: String', '- message: String', '- isRead: boolean'], methods: ['+ markRead(): void'] },
      { name: 'FeedService', fields: ['- users: Map<String, User>'], methods: ['+ generateFeed(user): List<Post>', '+ getConnectionUpdates(user): List<Post>'] },
    ],
    relationships: [
      { from: 'User', to: 'Profile', label: 'has' },
      { from: 'User', to: 'Connection', label: 'has many' },
      { from: 'User', to: 'Post', label: 'creates' },
      { from: 'Connection', to: 'User', label: 'links (from/to)' },
      { from: 'FeedService', to: 'User', label: 'reads' },
      { from: 'User', to: 'Notification', label: 'receives' },
    ]
  },

  lruCache: {
    title: 'LRU Cache — Class Diagram',
    classes: [
      { name: 'Cache', stereotype: 'interface', fields: [], methods: ['+ get(key): V', '+ put(key, value): void', '+ evict(): void', '+ size(): int'] },
      { name: 'LRUCacheImpl', fields: ['- capacity: int', '- cache: Map<K, Node<K,V>>', '- list: DoublyLinkedList<K,V>'], methods: ['+ get(key): V', '+ put(key, value): void', '+ evict(): void'] },
      { name: 'Node', fields: ['- key: K', '- value: V', '- prev: Node', '- next: Node'], methods: [] },
      { name: 'DoublyLinkedList', fields: ['- head: Node', '- tail: Node'], methods: ['+ addToFront(node): void', '+ removeNode(node): void', '+ moveToFront(node): void', '+ removeLast(): Node'] },
      { name: 'EvictionStrategy', stereotype: 'interface', fields: [], methods: ['+ evict(list, cache): void'] },
    ],
    relationships: [
      { from: 'LRUCacheImpl', to: 'Cache', label: 'implements', dashed: true },
      { from: 'LRUCacheImpl', to: 'DoublyLinkedList', label: 'uses' },
      { from: 'DoublyLinkedList', to: 'Node', label: 'contains' },
      { from: 'LRUCacheImpl', to: 'Node', label: 'references' },
      { from: 'LRUCacheImpl', to: 'EvictionStrategy', label: 'uses' },
    ]
  },

  pubSub: {
    title: 'Pub-Sub System — Class Diagram',
    classes: [
      { name: 'Broker', stereotype: 'singleton', fields: ['- instance: Broker', '- topics: Map<String, Topic>', '- executor: ExecutorService'], methods: ['+ getInstance(): Broker', '+ createTopic(name): Topic', '+ subscribe(topic, subscriber): void', '+ unsubscribe(topic, subscriber): void', '+ publish(topic, message): void'] },
      { name: 'Topic', fields: ['- name: String', '- subscribers: List<Subscriber>', '- messages: List<Message>'], methods: ['+ addSubscriber(sub): void', '+ removeSubscriber(sub): void', '+ publish(msg): void'] },
      { name: 'Publisher', fields: ['- id: String', '- topics: List<Topic>'], methods: ['+ publish(topic, content): void'] },
      { name: 'Subscriber', stereotype: 'interface', fields: [], methods: ['+ onMessage(topic, message): void', '+ getId(): String'] },
      { name: 'Message', fields: ['- id: String', '- content: String', '- timestamp: LocalDateTime', '- publisherId: String'], methods: [] },
    ],
    relationships: [
      { from: 'Broker', to: 'Topic', label: 'manages' },
      { from: 'Topic', to: 'Subscriber', label: 'notifies' },
      { from: 'Publisher', to: 'Topic', label: 'publishes to' },
      { from: 'Topic', to: 'Message', label: 'contains' },
      { from: 'Broker', to: 'Publisher', label: 'registers' },
    ]
  },

  carRental: {
    title: 'Car Rental — Class Diagram',
    classes: [
      { name: 'Vehicle', fields: ['- id: String', '- make: String', '- model: String', '- year: int', '- type: VehicleType', '- licensePlate: String', '- hourlyRate: double', '- available: boolean'], methods: ['+ setAvailable(avail): void', '+ getRate(): double'] },
      { name: 'Customer', fields: ['- id: String', '- name: String', '- licenseNo: String', '- phone: String', '- reservations: List<Reservation>'], methods: ['+ makeReservation(vehicle, hours): Reservation', '+ cancelReservation(id): void'] },
      { name: 'Reservation', fields: ['- id: String', '- customer: Customer', '- vehicle: Vehicle', '- startTime: LocalDateTime', '- endTime: LocalDateTime', '- totalAmount: double', '- status: String'], methods: ['+ calculateAmount(): double', '+ complete(): void'] },
      { name: 'RentalBranch', fields: ['- id: String', '- name: String', '- location: String', '- vehicles: List<Vehicle>'], methods: ['+ addVehicle(vehicle): void', '+ getAvailableVehicles(type): List<Vehicle>'] },
      { name: 'Payment', fields: ['- id: String', '- reservation: Reservation', '- amount: double', '- method: String', '- status: String', '- timestamp: LocalDateTime'], methods: ['+ process(): boolean', '+ refund(): void'] },
      { name: 'VehicleType', stereotype: 'enum', fields: ['SEDAN', 'SUV', 'HATCHBACK', 'TRUCK', 'VAN'], methods: [] },
    ],
    relationships: [
      { from: 'Customer', to: 'Reservation', label: 'makes' },
      { from: 'Reservation', to: 'Vehicle', label: 'books' },
      { from: 'Reservation', to: 'Payment', label: 'has' },
      { from: 'RentalBranch', to: 'Vehicle', label: 'contains' },
      { from: 'Vehicle', to: 'VehicleType', label: 'has type' },
      { from: 'Customer', to: 'RentalBranch', label: 'visits' },
    ]
  },

  auction: {
    title: 'Auction System — Class Diagram',
    classes: [
      { name: 'Auction', fields: ['- id: String', '- item: Item', '- startingBid: double', '- currentBid: Bid', '- status: AuctionStatus', '- bids: List<Bid>', '- auctioneer: Auctioneer', '- startTime: LocalDateTime', '- endTime: LocalDateTime'], methods: ['+ placeBid(bidder, amount): boolean', '+ close(): Bid', '+ getWinner(): Bidder'] },
      { name: 'Item', fields: ['- id: String', '- name: String', '- description: String', '- reservePrice: double', '- seller: Bidder'], methods: [] },
      { name: 'Bidder', fields: ['- id: String', '- name: String', '- email: String', '- bids: List<Bid>', '- notifications: List<String>'], methods: ['+ placeBid(auction, amount): Bid', '+ getWonAuctions(): List<Auction>'] },
      { name: 'Bid', fields: ['- id: String', '- bidder: Bidder', '- auction: Auction', '- amount: double', '- timestamp: LocalDateTime'], methods: [] },
      { name: 'Auctioneer', fields: ['- id: String', '- name: String', '- auctions: List<Auction>'], methods: ['+ createAuction(item, startBid, duration): Auction', '+ startAuction(auctionId): void', '+ endAuction(auctionId): void'] },
      { name: 'AuctionStatus', stereotype: 'enum', fields: ['PENDING', 'ACTIVE', 'SOLD', 'UNSOLD', 'CANCELLED'], methods: [] },
    ],
    relationships: [
      { from: 'Auction', to: 'Item', label: 'sells' },
      { from: 'Auction', to: 'Bid', label: 'contains' },
      { from: 'Auction', to: 'Bidder', label: 'has winner' },
      { from: 'Auction', to: 'Auctioneer', label: 'managed by' },
      { from: 'Auction', to: 'AuctionStatus', label: 'has state' },
      { from: 'Bid', to: 'Bidder', label: 'placed by' },
    ]
  },

  restaurant: {
    title: 'Restaurant — Class Diagram',
    classes: [
      { name: 'Restaurant', fields: ['- id: String', '- name: String', '- location: String', '- menu: Menu'], methods: ['+ open(): void', '+ close(): void', '+ addMenuItem(item): void'] },
      { name: 'Menu', fields: ['- items: List<MenuItem>', '- categories: List<String>'], methods: ['+ addItem(item): void', '+ getItemsByCategory(cat): List<MenuItem>'] },
      { name: 'Order', fields: ['- id: String', '- items: List<MenuItem>', '- tableNo: int', '- status: OrderStatus', '- chef: Chef', '- waiter: Waiter', '- totalAmount: double'], methods: ['+ addItem(item): void', '+ nextStatus(): void', '+ calculateTotal(): double'] },
      { name: 'Chef', fields: ['- id: String', '- name: String', '- specialization: String', '- orders: List<Order>'], methods: ['+ prepareOrder(order): void', '+ completeOrder(order): void'] },
      { name: 'Waiter', fields: ['- id: String', '- name: String', '- assignedTables: List<Integer>'], methods: ['+ takeOrder(table, items): Order', '+ serveOrder(order): void'] },
      { name: 'Payment', fields: ['- id: String', '- order: Order', '- amount: double', '- method: String', '- tip: double', '- timestamp: LocalDateTime'], methods: ['+ process(): boolean', '+ split(numPeople): List<Double>'] },
      { name: 'OrderStatus', stereotype: 'enum', fields: ['PLACED', 'PREPARING', 'READY', 'SERVED', 'PAID'], methods: [] },
    ],
    relationships: [
      { from: 'Restaurant', to: 'Menu', label: 'has' },
      { from: 'Order', to: 'Menu', label: 'references' },
      { from: 'Order', to: 'Chef', label: 'assigned to' },
      { from: 'Order', to: 'Waiter', label: 'served by' },
      { from: 'Order', to: 'OrderStatus', label: 'has state' },
      { from: 'Order', to: 'Payment', label: 'generates' },
    ]
  },

  socialNetwork: {
    title: 'Social Network — Class Diagram',
    classes: [
      { name: 'User', fields: ['- id: String', '- name: String', '- email: String', '- friends: List<User>', '- posts: List<Post>', '- pendingRequests: List<FriendRequest>'], methods: ['+ sendFriendRequest(to): void', '+ acceptRequest(from): void', '+ createPost(content): Post', '+ getNewsFeed(): List<Post>'] },
      { name: 'Post', fields: ['- id: String', '- author: User', '- content: String', '- likes: Set<String>', '- comments: List<Comment>', '- timestamp: LocalDateTime'], methods: ['+ like(userId): void', '+ addComment(comment): void'] },
      { name: 'FriendRequest', fields: ['- from: User', '- to: User', '- status: FriendRequestStatus', '- timestamp: LocalDateTime'], methods: ['+ accept(): void', '+ reject(): void'] },
      { name: 'NewsFeed', fields: ['- user: User', '- posts: List<Post>'], methods: ['+ generate(user): NewsFeed', '+ refresh(): void'] },
      { name: 'Notification', fields: ['- id: String', '- user: User', '- type: String (LIKE/COMMENT/REQUEST)', '- message: String', '- isRead: boolean'], methods: ['+ markRead(): void'] },
      { name: 'FriendRequestStatus', stereotype: 'enum', fields: ['PENDING', 'ACCEPTED', 'REJECTED'], methods: [] },
    ],
    relationships: [
      { from: 'User', to: 'User', label: 'friends with' },
      { from: 'User', to: 'Post', label: 'creates' },
      { from: 'User', to: 'FriendRequest', label: 'sends/receives' },
      { from: 'FriendRequest', to: 'FriendRequestStatus', label: 'has status' },
      { from: 'User', to: 'NewsFeed', label: 'has' },
      { from: 'User', to: 'Notification', label: 'receives' },
    ]
  },

  concertTicket: {
    title: 'Concert Ticket Booking — Class Diagram',
    classes: [
      { name: 'Event', fields: ['- id: String', '- name: String', '- artist: String', '- date: LocalDateTime', '- venue: Venue', '- seats: Map<SeatType, List<Seat>>'], methods: ['+ getAvailableSeats(type): List<Seat>', '+ bookSeats(user, seats): Booking', '+ cancelSeats(booking): void'] },
      { name: 'Venue', fields: ['- id: String', '- name: String', '- location: String', '- capacity: int', '- seatLayout: Map<SeatType, Integer>'], methods: ['+ getSeatMap(): Map'] },
      { name: 'Seat', fields: ['- id: String', '- row: String', '- number: int', '- type: SeatType', '- price: double', '- isBooked: boolean'], methods: ['+ book(): void', '+ release(): void'] },
      { name: 'Booking', fields: ['- id: String', '- user: User', '- event: Event', '- seats: List<Seat>', '- totalAmount: double', '- status: BookingStatus', '- timestamp: LocalDateTime'], methods: ['+ confirm(): void', '+ cancel(): void', '+ calculateTotal(): double'] },
      { name: 'User', fields: ['- id: String', '- name: String', '- email: String', '- bookings: List<Booking>'], methods: ['+ bookEvent(event, seats): Booking', '+ cancelBooking(id): void', '+ getBookingHistory(): List<Booking>'] },
      { name: 'BookingStatus', stereotype: 'enum', fields: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED'], methods: [] },
      { name: 'SeatType', stereotype: 'enum', fields: ['VIP', 'GOLD', 'SILVER', 'GENERAL'], methods: [] },
    ],
    relationships: [
      { from: 'Event', to: 'Venue', label: 'hosted at' },
      { from: 'Event', to: 'Seat', label: 'has' },
      { from: 'Seat', to: 'SeatType', label: 'has type' },
      { from: 'Booking', to: 'Event', label: 'references' },
      { from: 'Booking', to: 'User', label: 'belongs to' },
      { from: 'Booking', to: 'Seat', label: 'contains' },
      { from: 'Booking', to: 'BookingStatus', label: 'has state' },
    ]
  },

  cricinfo: {
    title: 'CricInfo — Class Diagram',
    classes: [
      { name: 'Match', fields: ['- id: String', '- teams: Team[2]', '- venue: String', '- date: LocalDateTime', '- status: MatchStatus', '- innings: List<Inning>', '- scorecard: Scorecard'], methods: ['+ start(): void', '+ end(result): void', '+ getCurrentScore(): String'] },
      { name: 'Team', fields: ['- id: String', '- name: String', '- players: List<Player>', '- captain: Player'], methods: ['+ addPlayer(player): void', '+ selectCaptain(player): void'] },
      { name: 'Player', fields: ['- id: String', '- name: String', '- role: String (BATSMAN/BOWLER/ALLROUNDER)', '- stats: Map<String, Object>'], methods: ['+ updateStats(ball): void', '+ getAverage(): double'] },
      { name: 'Inning', fields: ['- id: String', '- battingTeam: Team', '- bowlingTeam: Team', '- balls: List<Ball>', '- totalRuns: int', '- wickets: int', '- overs: double'], methods: ['+ addBall(ball): void', '+ isComplete(): boolean'] },
      { name: 'Scorecard', fields: ['- match: Match', '- batsmanStats: Map<Player, BattingStats>', '- bowlerStats: Map<Player, BowlingStats>'], methods: ['+ updateBatsmanStats(player, ball): void', '+ updateBowlerStats(player, ball): void'] },
      { name: 'Ball', fields: ['- ballNumber: int', '- bowler: Player', '- batsman: Player', '- runs: int', '- isWicket: boolean', '- wicketType: String'], methods: [] },
      { name: 'MatchStatus', stereotype: 'enum', fields: ['NOT_STARTED', 'LIVE', 'COMPLETED', 'DRAWN', 'ABANDONED'], methods: [] },
    ],
    relationships: [
      { from: 'Match', to: 'Team', label: 'has 2' },
      { from: 'Team', to: 'Player', label: 'contains' },
      { from: 'Match', to: 'Inning', label: 'contains' },
      { from: 'Match', to: 'Scorecard', label: 'has' },
      { from: 'Inning', to: 'Ball', label: 'contains' },
      { from: 'Match', to: 'MatchStatus', label: 'has state' },
    ]
  },

  courseRegistration: {
    title: 'Course Registration — Class Diagram',
    classes: [
      { name: 'Student', fields: ['- id: String', '- name: String', '- email: String', '- enrolledCourses: List<Registration>', '- schedule: Schedule'], methods: ['+ registerForCourse(course): Registration', '+ dropCourse(registration): void', '+ viewSchedule(): Schedule'] },
      { name: 'Course', fields: ['- id: String', '- code: String', '- title: String', '- credits: int', '- capacity: int', '- enrolledCount: int', '- professor: Professor', '- schedule: Schedule'], methods: ['+ isFull(): boolean', '+ incrementEnrollment(): void', '+ decrementEnrollment(): void'] },
      { name: 'Professor', fields: ['- id: String', '- name: String', '- email: String', '- department: String', '- courses: List<Course>'], methods: ['+ assignCourse(course): void', '+ getCourseList(): List<Course>'] },
      { name: 'Schedule', fields: ['- slots: List<TimeSlot>', '- semester: String'], methods: ['+ addSlot(day, start, end): void', '+ conflictsWith(other): boolean'] },
      { name: 'Registration', fields: ['- id: String', '- student: Student', '- course: Course', '- status: RegistrationStatus', '- grade: String', '- timestamp: LocalDateTime'], methods: ['+ confirm(): void', '+ cancel(): void', '+ assignGrade(grade): void'] },
      { name: 'RegistrationStatus', stereotype: 'enum', fields: ['PENDING', 'ENROLLED', 'DROPPED', 'COMPLETED'], methods: [] },
    ],
    relationships: [
      { from: 'Student', to: 'Registration', label: 'has' },
      { from: 'Registration', to: 'Course', label: 'enrolls in' },
      { from: 'Course', to: 'Professor', label: 'taught by' },
      { from: 'Course', to: 'Schedule', label: 'has' },
      { from: 'Student', to: 'Schedule', label: 'has' },
      { from: 'Registration', to: 'RegistrationStatus', label: 'has state' },
    ]
  },

  stockBrokerage: {
    title: 'Stock Brokerage — Class Diagram',
    classes: [
      { name: 'Account', fields: ['- id: String', '- username: String', '- email: String', '- balance: double', '- portfolio: Portfolio', '- orders: List<Order>'], methods: ['+ deposit(amount): void', '+ withdraw(amount): void', '+ placeOrder(stock, qty, type): Order'] },
      { name: 'Stock', fields: ['- symbol: String', '- name: String', '- currentPrice: double', '- market: String'], methods: ['+ updatePrice(newPrice): void'] },
      { name: 'Order', fields: ['- id: String', '- account: Account', '- stock: Stock', '- quantity: int', '- price: double', '- type: OrderType', '- status: OrderStatus', '- timestamp: LocalDateTime'], methods: ['+ execute(): void', '+ cancel(): void', '+ getTotalValue(): double'] },
      { name: 'Portfolio', fields: ['- account: Account', '- holdings: Map<Stock, Integer>', '- totalValue: double'], methods: ['+ addStock(stock, qty): void', '+ removeStock(stock, qty): void', '+ getNetWorth(): double'] },
      { name: 'MarketData', stereotype: 'singleton', fields: ['- stocks: Map<String, Stock>', '- priceHistory: Map<String, List<Double>>'], methods: ['+ getPrice(symbol): double', '+ updatePrice(symbol, price): void', '+ getHistory(symbol): List<Double>'] },
      { name: 'OrderType', stereotype: 'enum', fields: ['BUY', 'SELL', 'LIMIT_BUY', 'LIMIT_SELL', 'STOP_LOSS'], methods: [] },
      { name: 'OrderStatus', stereotype: 'enum', fields: ['PENDING', 'EXECUTED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'], methods: [] },
    ],
    relationships: [
      { from: 'Account', to: 'Portfolio', label: 'has' },
      { from: 'Account', to: 'Order', label: 'places' },
      { from: 'Order', to: 'Stock', label: 'trades' },
      { from: 'Order', to: 'OrderType', label: 'has type' },
      { from: 'Order', to: 'OrderStatus', label: 'has status' },
      { from: 'Portfolio', to: 'Stock', label: 'holds' },
      { from: 'MarketData', to: 'Stock', label: 'tracks' },
    ]
  },

  musicStreaming: {
    title: 'Music Streaming — Class Diagram',
    classes: [
      { name: 'Song', fields: ['- id: String', '- title: String', '- duration: int', '- album: Album', '- artists: List<Artist>', '- genre: String', '- playCount: int'], methods: ['+ play(): void', '+ addToPlaylist(playlist): void'] },
      { name: 'Album', fields: ['- id: String', '- title: String', '- artist: Artist', '- releaseYear: int', '- songs: List<Song>', '- coverArt: String'], methods: ['+ addSong(song): void', '+ getDuration(): int'] },
      { name: 'Artist', fields: ['- id: String', '- name: String', '- bio: String', '- albums: List<Album>', '- monthlyListeners: int'], methods: ['+ releaseAlbum(title, songs): Album', '+ getTopSongs(n): List<Song>'] },
      { name: 'Playlist', fields: ['- id: String', '- name: String', '- owner: User', '- songs: List<Song>', '- isPublic: boolean'], methods: ['+ addSong(song): void', '+ removeSong(song): void', '+ shuffle(): void'] },
      { name: 'User', fields: ['- id: String', '- name: String', '- email: String', '- subscription: Subscription', '- playlists: List<Playlist>', '- likedSongs: List<Song>'], methods: ['+ createPlaylist(name): Playlist', '+ likeSong(song): void', '+ getRecommendedSongs(): List<Song>'] },
      { name: 'Subscription', fields: ['- id: String', '- user: User', '- plan: SubscriptionPlan', '- startDate: LocalDate', '- renewalDate: LocalDate', '- isActive: boolean'], methods: ['+ activate(): void', '+ cancel(): void', '+ upgrade(newPlan): void'] },
      { name: 'SubscriptionPlan', stereotype: 'enum', fields: ['FREE', 'PREMIUM', 'FAMILY', 'STUDENT'], methods: [] },
    ],
    relationships: [
      { from: 'Album', to: 'Song', label: 'contains' },
      { from: 'Album', to: 'Artist', label: 'by' },
      { from: 'Song', to: 'Artist', label: 'performed by' },
      { from: 'Playlist', to: 'Song', label: 'contains' },
      { from: 'Playlist', to: 'User', label: 'owned by' },
      { from: 'User', to: 'Subscription', label: 'has' },
      { from: 'Subscription', to: 'SubscriptionPlan', label: 'has plan' },
    ]
  }
};

export default classDiagrams;
