// designDetails — cricinfo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.
//
// Rewritten from scratch (2026-08-31, RCA-044) — the previous version invented a 3-service
// architecture (MatchService / ScoringService / CommentaryService) and put behavior directly on
// Match/Innings/Ball/Player (startInnings(), addBall(), updateCareerStats(), getBattingAverage()
// on Player) that doesn't exist in the real source — Innings/Ball/Player are plain Lombok models
// with no methods at all (career-average math lives on CareerStats, not Player). None of this
// module's own — already-accurate — class diagram was consulted while writing it: the real
// architecture is one facade (CricinfoService) delegating ball recording to BallRecordingEngine,
// which publishes each ball through MatchPublisher to four BallEventObserver implementations
// (ScorecardProjectionObserver, PlayerCareerStatsObserver, CommentaryObserver,
// BallEventAuditObserver) — Observer, not three invented services.

export default {
  title: 'CricInfo — Design Details',
  requirements: [
    'Match management — create matches between two teams with venue, date, and match type (ODI, T20, Test)',
    'Team management — teams have a squad of players with roles (batsman, bowler, all-rounder, wicketkeeper)',
    'Live scoring — track each ball: runs scored, extras, wickets, boundaries, overs',
    'Innings management — each match has 1 or 2 innings per team; track batting order, fall of wickets, extras',
    'Scorecard generation — batting stats (runs, balls, 4s, 6s, SR) and bowling stats (overs, maidens, runs, wickets, economy)',
    'Commentary — ball-by-ball text commentary describing each delivery',
    'Match states: UPCOMING, LIVE, INNINGS_BREAK, COMPLETED, ABANDONED',
    'Statistics — player career stats (batting/bowling average, strike rate, economy) updated after each ball, not just at match end'
  ],
  entities: [
    {
      name: 'CricinfoService',
      description: 'Facade the controller delegates to wholesale. Owns match/team lookups and lifecycle transitions (toss, start, abandon, innings advancement) directly; ball recording itself is delegated entirely to BallRecordingEngine.',
      fields: [
        {
          name: 'repository',
          type: 'CricinfoRepository',
          description: 'Team/match storage'
        },
        {
          name: 'publisher',
          type: 'MatchPublisher',
          description: 'The Observer subject every BallEventObserver subscribes to'
        },
        {
          name: 'engine',
          type: 'BallRecordingEngine',
          description: 'Owns the per-match lock around recording a ball — the service never appends to Innings.balls directly'
        }
      ],
      methods: [
        {
          name: 'createMatch(teamAId, teamBId, venue, format, date)',
          returns: 'Match',
          description: 'Creates a new match in UPCOMING state'
        },
        {
          name: 'performToss(matchId, winnerTeamId, choice)',
          returns: 'Match',
          description: 'Records the toss result and choice'
        },
        {
          name: 'startMatch(matchId)',
          returns: 'Match',
          description: 'Transitions to LIVE, begins the first innings'
        },
        {
          name: 'recordBall(matchId, request)',
          returns: 'Ball',
          description: 'Thin delegate to BallRecordingEngine.recordBall(); also runs innings/match completion bookkeeping afterward'
        },
        {
          name: 'startNextInnings(matchId)',
          returns: 'Innings',
          description: 'Begins the second innings, carrying the target score forward for a run-chase'
        },
        {
          name: 'getScorecard(matchId)',
          returns: 'Scorecard',
          description: 'Reads the live projection ScorecardProjectionObserver has been folding the ball stream into — not recomputed from Innings on every call'
        }
      ]
    },
    {
      name: 'BallRecordingEngine',
      description: 'Owns the one compound operation this module\'s thread safety hinges on: "append this ball to the innings, then fold it into the live scorecard" must be atomic per match. A per-match ReentrantLock (looked up via matchId, same shape as zomato\'s per-agent lock / uber\'s per-driver lock) serializes numbering the ball, appending it, and publishing to every observer — different matches never contend with each other.',
      fields: [
        {
          name: 'matchLocks',
          type: 'Map<String, ReentrantLock>',
          description: 'One lock per matchId, created lazily via computeIfAbsent'
        },
        {
          name: 'publisher',
          type: 'MatchPublisher',
          description: 'Fan-out target for every recorded ball'
        }
      ],
      methods: [
        {
          name: 'recordBall(matchId, request)',
          returns: 'Ball',
          description: 'Under the match\'s lock: validates the delivery, appends it to the current Innings, publishes a BallEvent to every subscribed observer'
        }
      ]
    },
    {
      name: 'MatchPublisher',
      description: 'The Observer subject. A CopyOnWriteArrayList of observers (same choice as logging\'s Logger / pubsub\'s Topic) so publish() always sees a stable snapshot — a concurrent subscribe/unsubscribe never throws or is missed mid-fan-out.',
      fields: [
        {
          name: 'observers',
          type: 'List<BallEventObserver>',
          description: 'Every subscribed observer, shared across all matches — BallEvent itself carries the match, so one publisher instance is enough'
        }
      ],
      methods: [
        {
          name: 'subscribe(observer) / unsubscribe(observer)',
          returns: 'void',
          description: 'Toggle a view on/off at runtime, e.g. muting commentary without touching scoring'
        },
        {
          name: 'publish(event)',
          returns: 'void',
          description: 'Notifies every subscribed observer\'s onBallBowled(event) in turn'
        }
      ]
    },
    {
      name: 'BallEventObserver (+ 4 implementations)',
      description: 'ScorecardProjectionObserver folds each ball into Innings totals and the live Scorecard read-model. PlayerCareerStatsObserver independently updates Player.careerStats from the same stream. CommentaryObserver derives ball-by-ball text. BallEventAuditObserver appends every ball to a sequence-numbered event log for the /sim telemetry HUD. None of the four know about each other — the publisher fans one BallEvent out to all of them.',
      fields: [],
      methods: [
        {
          name: 'onBallBowled(event)',
          returns: 'void',
          description: 'Each implementation folds the same raw ball into its own derived view'
        },
        {
          name: 'getObserverName()',
          returns: 'String',
          description: 'Stable name used by the toggle API and the /sim telemetry HUD'
        }
      ]
    },
    {
      name: 'Match / Team / Player / Innings / Ball / CareerStats',
      description: 'Plain Lombok models — Innings, Ball and Player carry no business methods at all; every mutation happens externally under BallRecordingEngine\'s lock or inside an observer. Match is the one model with a little real behavior (currentInnings(), teamTotalRuns()) since those are pure reads with no concurrency concern. Batting/bowling-average and economy math lives on CareerStats, not Player.',
      fields: [],
      methods: [
        {
          name: 'Match.currentInnings() / Match.teamTotalRuns(teamId)',
          returns: 'Innings / int',
          description: 'The only two real methods on any of these models'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'MatchPublisher is the subject; ScorecardProjectionObserver, PlayerCareerStatsObserver, CommentaryObserver and BallEventAuditObserver each fold the same BallEvent stream into a different derived view, independently of each other and without BallRecordingEngine knowing which views exist.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'CricinfoService, MatchPublisher and every BallEventObserver are Spring-managed singleton beans, so a ball recorded through the real controller is always seen by the same set of observers.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'MatchStatus (UPCOMING → LIVE → INNINGS_BREAK → LIVE → COMPLETED, or → ABANDONED) has a declared transition table checked before every lifecycle mutation — not a bare enum field anyone can overwrite.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Different match formats could use a FormatStrategy defining max overs, follow-on rules, and draw conditions. Match would delegate to the strategy instead of an if-else on format type.'
    },
    {
      name: 'Command',
      used: false,
      explanation: 'Each ball could be a Command object encapsulating delivery data. Would enable undo (score correction), replay, and a DRS-style review system by reverting and reapplying balls.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'BallRecordingEngine only owns atomically appending a ball and publishing it. MatchPublisher only owns fan-out. Each BallEventObserver owns exactly one derived view. CricinfoService only orchestrates match-lifecycle calls.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'A new derived view (e.g. a win-probability model) is a new BallEventObserver subscribed to MatchPublisher — BallRecordingEngine and every existing observer are untouched. New match formats add an enum constant.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'MatchPublisher depends on the BallEventObserver abstraction, not on any of its four concrete implementations — it can fan out to any number of observers registered at construction time without knowing what they do.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Batting/bowling-average and economy math is centralized once on CareerStats, not duplicated per caller. Per-match locking logic is centralized once in BallRecordingEngine, not repeated at every call site that touches an Innings.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Cricket scoring: a ball goes to BallRecordingEngine, gets appended, gets published. Every downstream view is a passive subscriber reacting to that one stream — no view pulls or polls another.'
    }
  ],
  oopConcepts: [
    {
      name: 'Composition over Inheritance',
      description: 'Match has-a List<Innings> and two Teams. Team has-a List<Player>. Player has-a CareerStats. Nothing in this module uses class inheritance for the domain model.',
      alternative: 'Could create a MatchWithInnings subclass per format. Matches vary in innings count (limited-overs = 2, Test = up to 4), making fixed inheritance impractical — composition handles any count.'
    },
    {
      name: 'Encapsulation — One Lock Owns the Write Path',
      description: 'Every mutation of an Innings\' balls/stats happens inside BallRecordingEngine\'s per-match lock. No other class writes to Innings directly, which is what makes "never lose or double-count a ball" provable rather than assumed.',
      alternative: 'Could let CricinfoService or the controller mutate Innings directly. Funneling every write through one lock-owning class is what CricinfoConcurrencyTest actually verifies.'
    },
    {
      name: 'Polymorphism — Observer Fan-Out',
      description: 'MatchPublisher.publish() calls onBallBowled() on every subscribed BallEventObserver without knowing which concrete view (scorecard, stats, commentary, audit) it\'s talking to.',
      alternative: 'Could hardcode four separate calls (updateScorecard(), updateStats(), addCommentary(), audit()) inside BallRecordingEngine. Observer keeps the engine ignorant of how many views exist or what they do.'
    }
  ],
  extensibility: [
    {
      area: 'New Match Format',
      description: 'Add a format constant (e.g. THE_HUNDRED) and its max-balls-per-innings rule. The existing Innings/Ball models and BallRecordingEngine handle any format unchanged.',
      difficulty: 'Easy'
    },
    {
      area: 'Live Score WebSocket',
      description: 'Add a WebSocketPushObserver implementing BallEventObserver, subscribed to MatchPublisher alongside the existing four — MatchPublisher.publish()\'s fan-out loop needs no change.',
      difficulty: 'Medium'
    },
    {
      area: 'Points Table / Series',
      description: 'Add a Series entity grouping matches between teams, with a points table computed from Match.result after each COMPLETED transition.',
      difficulty: 'Medium'
    },
    {
      area: 'DRS / Review System',
      description: 'Add a Review entity for umpire reviews. Reverting/reapplying a ball would need BallRecordingEngine to support an explicit undo of the last recorded Ball under the same per-match lock.',
      difficulty: 'Hard'
    }
  ]
};
