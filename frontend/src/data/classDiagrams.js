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
  }
};

export default classDiagrams;
