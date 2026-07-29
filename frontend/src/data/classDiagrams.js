const classDiagrams = {
  parking: {
    title: 'Parking Lot — Class Diagram',
    classes: [
      { name: 'ParkingLotService', stereotype: 'singleton', fields: ['- repository: ParkingLotRepository', '- lock: ReentrantLock'], methods: ['+ vehicleEntry(gateId, vNum, vType): Ticket', '+ vehicleExit(gateId, tktNo): Receipt', '+ getAvailableSpots(type): List<Spot>'] },
      { name: 'Ticket', fields: ['- ticketNumber: String', '- vehicleNumber: String', '- vehicleType: VehicleType', '- spotId: String', '- entryTime: LocalDateTime'], methods: ['+ calculateAmount(exitTime): double'] },
      { name: 'ParkingSpot', fields: ['- id: String', '- floorNumber: int', '- vehicleType: VehicleType', '- occupied: boolean'], methods: ['+ occupy(): void', '+ vacate(): void'] },
      { name: 'Floor', fields: ['- floorNumber: int', '- spots: List<ParkingSpot>'], methods: ['+ getAvailableSpots(type): List<ParkingSpot>'] },
      { name: 'Gate', fields: ['- id: String', '- type: GateType (ENTRY/EXIT)'], methods: [] },
      { name: 'VehicleType', stereotype: 'enum', fields: ['CAR', 'BIKE', 'TRUCK'], methods: [] },
      { name: 'ParkingLotRepository', fields: ['- floors: Map<Integer, Floor>', '- gates: Map<String, Gate>', '- tickets: Map<String, Ticket>'], methods: ['+ findAvailableSpot(type): ParkingSpot', '+ saveTicket(ticket): void', '+ getActiveTickets(): List<Ticket>'] },
    ],
    relationships: [
      { from: 'ParkingLotService', to: 'ParkingLotRepository', label: 'uses' },
      { from: 'ParkingLotService', to: 'Ticket', label: 'creates' },
      { from: 'ParkingLotRepository', to: 'Floor', label: 'contains' },
      { from: 'Floor', to: 'ParkingSpot', label: 'contains' },
      { from: 'Ticket', to: 'ParkingSpot', label: 'references' },
      { from: 'Ticket', to: 'VehicleType', label: 'uses' },
      { from: 'ParkingSpot', to: 'VehicleType', label: 'uses' },
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
    title: 'Uber — Class Diagram',
    classes: [
      { name: 'UberService', methods: ['+ estimateFare(pickup, drop, type): FareEstimate', '+ requestRide(user, pickup, drop, type): Ride', '+ updateRideStatus(rideId, status): Ride'] },
      { name: 'Ride', fields: ['- id: String', '- status: RideStatus', '- pickup: Location', '- drop: Location', '- fare: double'], methods: ['+ assignDriver(driver): void', '+ nextStatus(): void'] },
      { name: 'RideStatus', stereotype: 'enum', fields: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED'], methods: [] },
      { name: 'Driver', fields: ['- id: String', '- name: String', '- location: Location', '- vehicleType: VehicleType', '- available: boolean'], methods: ['+ calculateDistance(to): double'] },
      { name: 'Location', fields: ['- latitude: double', '- longitude: double'], methods: ['+ distanceTo(other): double (Haversine)'] },
      { name: 'VehicleType', stereotype: 'enum', fields: ['GO', 'XL', 'PREMIUM'], methods: [] },
    ],
    relationships: [
      { from: 'UberService', to: 'Ride', label: 'manages' },
      { from: 'Ride', to: 'RideStatus', label: 'has state' },
      { from: 'Ride', to: 'Location', label: 'uses' },
      { from: 'Ride', to: 'Driver', label: 'assigned to' },
      { from: 'Driver', to: 'VehicleType', label: 'has type' },
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
  }
};

export default classDiagrams;
