// classDiagrams — cricinfo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'CricInfo — Class Diagram',
  classes: [
    {
      name: 'Match',
      fields: [
        '- id: String',
        '- teamA: Team',
        '- teamB: Team',
        '- venue: String',
        '- format: MatchFormat',
        '- status: MatchStatus',
        '- innings: List<Innings>',
        '- currentInningsIndex: int',
        '- result: MatchResult'
      ],
      methods: [
        '+ currentInnings(): Innings',
        '+ teamTotalRuns(teamId): int'
      ]
    },
    {
      name: 'Team',
      fields: [
        '- id: String',
        '- name: String',
        '- players: List<Player>',
        '- captainId: String'
      ],
      methods: []
    },
    {
      name: 'Player',
      fields: [
        '- id: String',
        '- name: String',
        '- role: PlayerRole',
        '- careerStats: CareerStats'
      ],
      methods: []
    },
    {
      name: 'Innings',
      fields: [
        '- index: int',
        '- battingTeamId / bowlingTeamId: String',
        '- totalRuns, wickets, legalBallsBowled: int',
        '- balls: List<Ball>',
        '- battingStats: Map<String, BattingStat>',
        '- bowlingStats: Map<String, BowlingStat>',
        '- fallOfWickets: List<FallOfWicket>',
        '- strikerId / nonStrikerId / currentBowlerId: String',
        '- targetRuns: Integer'
      ],
      methods: [
        '+ oversDisplay(): String',
        '+ runRate(): double'
      ]
    },
    {
      name: 'Ball',
      fields: [
        '- overNumber: int',
        '- ballInOver: int',
        '- legalDelivery: boolean',
        '- strikerId / nonStrikerId / bowlerId: String',
        '- runsOffBat: int',
        '- extraType: ExtraType',
        '- extraRuns: int',
        '- wicket: boolean',
        '- wicketType: WicketType'
      ],
      methods: [
        '+ totalRuns(): int'
      ]
    },
    {
      name: 'Scorecard',
      fields: [
        '- matchId, inningsIndex',
        '- totalRuns, wickets, oversDisplay, runRate',
        '- strikerName/strikerRuns/strikerBalls, currentBowlerName/currentBowlerFigures',
        '- recentBalls: List<String>',
        '- fallOfWickets, battingStats, bowlingStats'
      ],
      methods: [],
      description: 'The live scorecard projection — read-model folded from the ball stream by ScorecardProjectionObserver.'
    },
    {
      name: 'MatchStatus',
      stereotype: 'enum',
      fields: [
        'UPCOMING',
        'LIVE',
        'INNINGS_BREAK',
        'COMPLETED',
        'ABANDONED'
      ],
      methods: [
        '+ canTransitionTo(next): boolean'
      ]
    },
    {
      name: 'BallEventObserver',
      stereotype: 'interface',
      fields: [],
      methods: [
        '+ onBallBowled(event: BallEvent): void',
        '+ getObserverName(): String'
      ]
    },
    {
      name: 'MatchPublisher',
      description: 'Subject — CopyOnWriteArrayList of observers so publish() never races a concurrent subscribe/unsubscribe.',
      fields: [
        '- observers: CopyOnWriteArrayList<BallEventObserver>'
      ],
      methods: [
        '+ subscribe(observer): void',
        '+ unsubscribe(observer): void',
        '+ publish(event: BallEvent): void'
      ]
    },
    {
      name: 'ScorecardProjectionObserver',
      description: 'Folds each Ball into Innings totals/stats and rebuilds the Scorecard projection.',
      fields: [
        '- scorecards: Map<String, Scorecard>'
      ],
      methods: [
        '+ onBallBowled(event): void',
        '+ getScorecard(matchId): Scorecard'
      ]
    },
    {
      name: 'PlayerCareerStatsObserver',
      description: 'Independently updates Player.careerStats from the same ball stream.',
      fields: [],
      methods: [
        '+ onBallBowled(event): void'
      ]
    },
    {
      name: 'CommentaryObserver',
      description: 'Derives ball-by-ball text commentary; can be unsubscribed at runtime without touching scoring.',
      fields: [
        '- commentaryByMatch: Map<String, List<CommentaryEntry>>'
      ],
      methods: [
        '+ onBallBowled(event): void',
        '+ getCommentary(matchId): List<CommentaryEntry>'
      ]
    },
    {
      name: 'BallEventAuditObserver',
      description: 'Appends every ball to a sequence-numbered audit/event log for the /sim telemetry stream.',
      fields: [
        '- events: List<CricinfoEvent>'
      ],
      methods: [
        '+ onBallBowled(event): void'
      ]
    },
    {
      name: 'BallRecordingEngine',
      description: 'Per-match ReentrantLock keeps "append ball + fold into scorecard" atomic per match.',
      fields: [
        '- matchLocks: Map<String, ReentrantLock>'
      ],
      methods: [
        '+ recordBall(matchId, request): Ball'
      ]
    },
    {
      name: 'CricinfoService',
      stereotype: 'facade',
      fields: [],
      methods: [
        '+ createMatch(...): Match',
        '+ performToss(...): Match',
        '+ startMatch(matchId): Match',
        '+ recordBall(matchId, request): Ball',
        '+ startNextInnings(matchId): Innings',
        '+ getScorecard(matchId): Scorecard'
      ]
    }
  ],
  relationships: [
    { from: 'Match', to: 'Team', label: 'has 2' },
    { from: 'Team', to: 'Player', label: 'contains' },
    { from: 'Match', to: 'Innings', label: 'contains' },
    { from: 'Innings', to: 'Ball', label: 'raw event stream' },
    { from: 'Match', to: 'MatchStatus', label: 'has state' },
    { from: 'CricinfoService', to: 'BallRecordingEngine', label: 'delegates ball recording to' },
    { from: 'BallRecordingEngine', to: 'Innings', label: 'appends Ball to (per-match lock)' },
    { from: 'BallRecordingEngine', to: 'MatchPublisher', label: 'publishes BallEvent via' },
    { from: 'MatchPublisher', to: 'BallEventObserver', label: 'notifies (subscribe/unsubscribe)' },
    { from: 'ScorecardProjectionObserver', to: 'BallEventObserver', label: 'implements' },
    { from: 'PlayerCareerStatsObserver', to: 'BallEventObserver', label: 'implements' },
    { from: 'CommentaryObserver', to: 'BallEventObserver', label: 'implements' },
    { from: 'BallEventAuditObserver', to: 'BallEventObserver', label: 'implements' },
    { from: 'ScorecardProjectionObserver', to: 'Scorecard', label: 'produces' },
    { from: 'PlayerCareerStatsObserver', to: 'Player', label: 'updates careerStats' }
  ]
};
