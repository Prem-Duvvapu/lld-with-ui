// classDiagrams — ludo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Ludo — Class Diagram',
  classes: [
    {
      name: 'LudoService',
      stereotype: 'singleton',
      fields: [
        '- repository: LudoRepository',
        '- diceRoller: DiceRoller',
        '- gameLocks: ConcurrentHashMap<Long, ReentrantLock>',
        '- simRepository: LudoRepository',
        '- simEventLog: List<SimEvent>'
      ],
      methods: [
        '+ createGame(playerNames): Game',
        '+ getGame(id): Game',
        '+ rollDice(id): Game',
        '+ moveToken(id, playerIndex, tokenIndex): Game',
        '+ simReset(): Game',
        '+ simRoll(): Game',
        '+ simMove(playerIndex, tokenIndex): Game'
      ]
    },
    {
      name: 'LudoController',
      fields: [],
      methods: [
        '+ createGame(body): Game',
        '+ rollDice(id): Game',
        '+ moveToken(id, body): Game',
        '+ simRoll(): Game'
      ]
    },
    {
      name: 'Game',
      fields: [
        '- id: long',
        '- players: List<Player>',
        '- tokens: List<List<Token>>',
        '- currentPlayerIndex: int',
        '- diceValue: int',
        '- status: GameStatus',
        '- winner: String'
      ],
      methods: [
        '+ {static} newGame(id, playerNames): Game',
        '+ {static} endPosition(playerIndex): int'
      ]
    },
    {
      name: 'Player',
      fields: [
        '- index: int',
        '- name: String',
        '- color: String'
      ],
      methods: []
    },
    {
      name: 'Token',
      fields: [
        '- id: int',
        '- color: String',
        '- position: int',
        '- status: TokenStatus'
      ],
      methods: [
        '+ transitionTo(target: TokenStatus): void'
      ]
    },
    {
      name: 'TokenStatus',
      stereotype: 'enum',
      fields: ['HOME', 'ACTIVE', 'FINISHED'],
      methods: []
    },
    {
      name: 'GameStatus',
      stereotype: 'enum',
      fields: ['WAITING', 'PLAYING', 'FINISHED'],
      methods: []
    },
    {
      name: 'TokenState',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ getStatus(): TokenStatus',
        '+ allowedNext(): Set<TokenStatus>',
        '+ isTerminal(): boolean',
        '+ canTransitionTo(target): boolean'
      ]
    },
    {
      name: 'HomeState',
      stereotype: 'singleton',
      fields: ['+ {static} INSTANCE: HomeState'],
      methods: ['+ allowedNext(): Set<TokenStatus>']
    },
    {
      name: 'ActiveState',
      stereotype: 'singleton',
      fields: ['+ {static} INSTANCE: ActiveState'],
      methods: ['+ allowedNext(): Set<TokenStatus>']
    },
    {
      name: 'FinishedState',
      stereotype: 'singleton',
      fields: ['+ {static} INSTANCE: FinishedState'],
      methods: ['+ allowedNext(): Set<TokenStatus>']
    },
    {
      name: 'TokenStates',
      fields: ['- {static} BY_STATUS: EnumMap<TokenStatus, TokenState>'],
      methods: ['+ {static} of(status): TokenState']
    },
    {
      name: 'DiceRoller',
      stereotype: 'interface',
      fields: [],
      methods: ['+ roll(): int']
    },
    {
      name: 'RandomDiceRoller',
      fields: ['- random: Random'],
      methods: ['+ roll(): int']
    },
    {
      name: 'FixedDiceRoller',
      fields: ['- sequence: int[]', '- index: int'],
      methods: ['+ roll(): int']
    },
    {
      name: 'LudoRepository',
      fields: [
        '- games: ConcurrentHashMap<Long, Game>',
        '- idGen: AtomicLong'
      ],
      methods: [
        '+ nextId(): long',
        '+ save(game): void',
        '+ get(id): Game'
      ]
    },
    {
      name: 'LudoException',
      stereotype: 'abstract',
      fields: [],
      methods: []
    },
    {
      name: 'InvalidMoveException',
      fields: [],
      methods: []
    },
    {
      name: 'NotYourTurnException',
      fields: [],
      methods: []
    },
    {
      name: 'GameOverException',
      fields: [],
      methods: []
    },
    {
      name: 'GameNotFoundException',
      fields: [],
      methods: []
    },
    {
      name: 'SimEvent',
      fields: [
        '- id: long',
        '- actor: String',
        '- description: String',
        '- diceValue: int',
        '- tokensSnapshot: List<List<Token>>',
        '- status: GameStatus'
      ],
      methods: []
    }
  ],
  relationships: [
    { from: 'LudoController', to: 'LudoService', label: 'delegates to' },
    { from: 'LudoService', to: 'LudoRepository', label: 'uses (live)' },
    { from: 'LudoService', to: 'LudoRepository', label: 'uses (sim sandbox)' },
    { from: 'LudoService', to: 'DiceRoller', label: 'rolls via' },
    { from: 'LudoService', to: 'SimEvent', label: 'logs' },
    { from: 'RandomDiceRoller', to: 'DiceRoller', label: 'implements', dashed: true },
    { from: 'FixedDiceRoller', to: 'DiceRoller', label: 'implements', dashed: true },
    { from: 'LudoService', to: 'Game', label: 'manages' },
    { from: 'Game', to: 'Player', label: 'has 4' },
    { from: 'Game', to: 'Token', label: 'has 16 (4x4)' },
    { from: 'Game', to: 'GameStatus', label: 'has state' },
    { from: 'Token', to: 'TokenStatus', label: 'has state' },
    { from: 'Token', to: 'TokenState', label: 'delegates legality to' },
    { from: 'HomeState', to: 'TokenState', label: 'implements', dashed: true },
    { from: 'ActiveState', to: 'TokenState', label: 'implements', dashed: true },
    { from: 'FinishedState', to: 'TokenState', label: 'implements', dashed: true },
    { from: 'TokenStates', to: 'TokenState', label: 'resolves' },
    { from: 'InvalidMoveException', to: 'LudoException', label: 'extends', dashed: true },
    { from: 'NotYourTurnException', to: 'LudoException', label: 'extends', dashed: true },
    { from: 'GameOverException', to: 'LudoException', label: 'extends', dashed: true },
    { from: 'GameNotFoundException', to: 'LudoException', label: 'extends', dashed: true }
  ]
};
