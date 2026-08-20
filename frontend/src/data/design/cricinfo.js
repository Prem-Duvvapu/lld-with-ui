// designDetails — cricinfo
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'CricInfo — Design Details',
  requirements: [
    'Match management — create matches between two teams with venue, date, and match type (ODI, T20, Test)',
    'Team management — teams have a squad of players with roles (batsman, bowler, all-rounder, wicketkeeper)',
    'Live scoring — track each ball: runs scored, extras, wickets, boundaries, overs',
    'Innings management — each match has 1 or 2 innings per team; track batting order, fall of wickets, extras',
    'Scorecard generation — batting stats (runs, balls, 4s, 6s, SR) and bowling stats (overs, maidens, runs, wickets, economy)',
    'Commentary — ball-by-ball text commentary describing each delivery with over summary',
    'Match states: UPCOMING, LIVE, INNINGS_BREAK, COMPLETED, ABANDONED',
    'Statistics and rankings — player career stats, series standings, team rankings updated after each match'
  ],
  entities: [
    {
      name: 'MatchService',
      description: 'Core orchestrator managing match lifecycle — creation, scoring, innings transitions, and result determination.',
      fields: [
        {
          name: 'matchRepo',
          type: 'Repository<Match>',
          description: 'Data store for all matches'
        },
        {
          name: 'scoringService',
          type: 'ScoringService',
          description: 'Handles ball-by-ball scoring logic'
        },
        {
          name: 'commentaryService',
          type: 'CommentaryService',
          description: 'Manages ball-by-ball commentary'
        }
      ],
      methods: [
        {
          name: 'createMatch(teamA, teamB, venue, date, format)',
          returns: 'Match',
          description: 'Creates a new match in UPCOMING state'
        },
        {
          name: 'startMatch(matchId)',
          returns: 'void',
          description: 'Transitions match to LIVE, begins first innings'
        },
        {
          name: 'recordBall(matchId, ballData)',
          returns: 'Ball',
          description: 'Records a ball — runs, wicket, extras. Updates score and commentary.'
        },
        {
          name: 'endInnings(matchId)',
          returns: 'void',
          description: 'Ends current innings, transitions to INNINGS_BREAK or starts second innings'
        },
        {
          name: 'completeMatch(matchId)',
          returns: 'MatchResult',
          description: 'Determines winner based on scores, updates stats'
        }
      ]
    },
    {
      name: 'Match',
      description: 'A cricket match between two teams. Manages innings, current score, match state, and result.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique match identifier'
        },
        {
          name: 'teams',
          type: 'List<Team>',
          description: 'Two competing teams'
        },
        {
          name: 'venue',
          type: 'String',
          description: 'Stadium/city where match is played'
        },
        {
          name: 'format',
          type: 'MatchFormat',
          description: 'ODI (50 overs), T20 (20 overs), TEST (unlimited)'
        },
        {
          name: 'status',
          type: 'MatchStatus',
          description: 'UPCOMING, LIVE, INNINGS_BREAK, COMPLETED, ABANDONED'
        },
        {
          name: 'innings',
          type: 'List<Innings>',
          description: 'Completed and current innings'
        },
        {
          name: 'currentInnings',
          type: 'Innings',
          description: 'Innings currently in progress (null during breaks)'
        },
        {
          name: 'tossWinner',
          type: 'Team',
          description: 'Team that won the toss'
        },
        {
          name: 'tossChoice',
          type: 'String',
          description: 'BAT or FIELD — elected by toss winner'
        }
      ],
      methods: [
        {
          name: 'startInnings(battingTeam, bowlingTeam)',
          returns: 'Innings',
          description: 'Begins a new innings'
        },
        {
          name: 'addBall(ball)',
          returns: 'void',
          description: 'Records a ball in the current innings'
        },
        {
          name: 'getCurrentScore()',
          returns: 'Score',
          description: 'Returns current match score summary'
        }
      ]
    },
    {
      name: 'Innings',
      description: 'One team\'s batting innings. Tracks runs, wickets, overs, extras, batting/bowling stats, and fall of wickets.',
      fields: [
        {
          name: 'battingTeam',
          type: 'Team',
          description: 'Team currently batting'
        },
        {
          name: 'bowlingTeam',
          type: 'Team',
          description: 'Team currently bowling'
        },
        {
          name: 'totalRuns',
          type: 'int',
          description: 'Total runs scored in this innings'
        },
        {
          name: 'wicketsLost',
          type: 'int',
          description: 'Number of wickets fallen'
        },
        {
          name: 'totalOvers',
          type: 'double',
          description: 'Overs bowled (e.g., 47.3 = 47 overs + 3 balls)'
        },
        {
          name: 'balls',
          type: 'List<Ball>',
          description: 'All balls bowled in this innings'
        },
        {
          name: 'battingStats',
          type: 'Map<Player, BattingStat>',
          description: 'Batting statistics per player'
        },
        {
          name: 'bowlingStats',
          type: 'Map<Player, BowlingStat>',
          description: 'Bowling statistics per player'
        },
        {
          name: 'extras',
          type: 'Extras',
          description: 'Byes, leg byes, wides, no balls, penalties'
        },
        {
          name: 'fallOfWickets',
          type: 'List<Wicket>',
          description: 'Each wicket with score, over, and dismissal type'
        }
      ],
      methods: [
        {
          name: 'addBall(ball)',
          returns: 'void',
          description: 'Records a ball and updates all stats'
        },
        {
          name: 'isInningsComplete()',
          returns: 'boolean',
          description: 'Checks if innings is over (all out or overs exhausted)'
        }
      ]
    },
    {
      name: 'Ball',
      description: 'A single delivery bowled. Records runs, wicket type (if any), extras, and which batsman faced it.',
      fields: [
        {
          name: 'overNumber',
          type: 'int',
          description: 'Over number (1-indexed)'
        },
        {
          name: 'ballNumber',
          type: 'int',
          description: 'Ball number within the over (1-6)'
        },
        {
          name: 'bowler',
          type: 'Player',
          description: 'Player who bowled this delivery'
        },
        {
          name: 'batsman',
          type: 'Player',
          description: 'Player who faced this delivery'
        },
        {
          name: 'runs',
          type: 'int',
          description: 'Runs scored off the bat (0-6)'
        },
        {
          name: 'extras',
          type: 'ExtraType',
          description: 'WIDE, NO_BALL, BYE, LEG_BYE, PENALTY — null if none'
        },
        {
          name: 'wicket',
          type: 'WicketType',
          description: 'BOWLED, CAUGHT, LBW, RUN_OUT, STUMPED — null if no wicket'
        },
        {
          name: 'isFour',
          type: 'boolean',
          description: 'True if the ball was hit for 4 runs'
        },
        {
          name: 'isSix',
          type: 'boolean',
          description: 'True if the ball was hit for 6 runs'
        }
      ],
      methods: []
    },
    {
      name: 'Player',
      description: 'Cricket player with personal info and roles. Accumulates career statistics across all matches.',
      fields: [
        {
          name: 'id',
          type: 'String',
          description: 'Unique player identifier'
        },
        {
          name: 'name',
          type: 'String',
          description: 'Full name'
        },
        {
          name: 'role',
          type: 'PlayerRole',
          description: 'BATSMAN, BOWLER, ALL_ROUNDER, WICKETKEEPER'
        },
        {
          name: 'battingStyle',
          type: 'String',
          description: 'RIGHT_HANDED or LEFT_HANDED'
        },
        {
          name: 'bowlingStyle',
          type: 'String',
          description: 'FAST, MEDIUM, SPIN'
        },
        {
          name: 'careerStats',
          type: 'CareerStats',
          description: 'Aggregate batting and bowling stats across all matches'
        }
      ],
      methods: [
        {
          name: 'updateCareerStats(matchStats)',
          returns: 'void',
          description: 'Updates career aggregates with match performance'
        },
        {
          name: 'getBattingAverage()',
          returns: 'double',
          description: 'Returns career batting average (runs / dismissals)'
        },
        {
          name: 'getBowlingAverage()',
          returns: 'double',
          description: 'Returns career bowling average (runs conceded / wickets)'
        }
      ]
    },
    {
      name: 'CommentaryService',
      description: 'Generates and manages ball-by-ball text commentary. Provides over summaries and key event highlights.',
      fields: [
        {
          name: 'comments',
          type: 'Map<String, List<Comment>>',
          description: 'Commentary entries grouped by match and innings'
        }
      ],
      methods: [
        {
          name: 'addComment(matchId, ball, text)',
          returns: 'void',
          description: 'Adds commentary text for a specific ball'
        },
        {
          name: 'getOverSummary(matchId, overNumber)',
          returns: 'String',
          description: 'Returns summary text for a completed over'
        },
        {
          name: 'getBallByBall(matchId)',
          returns: 'List<Comment>',
          description: 'Returns full ball-by-ball commentary for the match'
        }
      ]
    }
  ],
  designPatterns: [
    {
      name: 'Observer',
      used: true,
      explanation: 'ScoringService observes Ball events. When a ball is bowled, it updates Innings stats, player stats, and triggers commentary. Multiple observers update different views without Ball knowing about them.'
    },
    {
      name: 'Singleton',
      used: true,
      explanation: 'MatchService and ScoringService are singletons ensuring single source of truth for live match state. Prevents conflicting score updates.'
    },
    {
      name: 'State',
      used: true,
      explanation: 'MatchStatus enum (UPCOMING to LIVE to INNINGS_BREAK to LIVE to COMPLETED) implements State pattern. State determines valid operations for each match phase.'
    },
    {
      name: 'Strategy',
      used: false,
      explanation: 'Different match formats could use FormatStrategy defining max overs, follow-on rules, and draw conditions. Match would delegate to strategy instead of if-else on format type.'
    },
    {
      name: 'Command',
      used: false,
      explanation: 'Each ball could be a Command object encapsulating delivery data. Enables undo (score correction), replay, and DRS (review system) by reverting and reapplying balls.'
    }
  ],
  principles: [
    {
      name: 'Single Responsibility (SRP)',
      description: 'Match manages match-level state. Innings tracks one team\'s batting. Ball records a single delivery. Player has career stats. CommentaryService generates text.'
    },
    {
      name: 'Open/Closed (OCP)',
      description: 'New match formats add a constant. New ball event types extend Ball model. New statistics computed from existing data. Core scoring and match flow unchanged.'
    },
    {
      name: 'Dependency Inversion (DIP)',
      description: 'MatchService depends on ScoringService and CommentaryService abstractions. Match depends on Innings. Innings depends on Ball. Workflow doesn\'t depend on stat computation details.'
    },
    {
      name: 'DRY (Don\'t Repeat Yourself)',
      description: 'Stat computation (batting average, economy, strike rate) centralized in Player and Innings. Commentary follows templates — not hand-written per ball.'
    },
    {
      name: 'KISS (Keep It Simple)',
      description: 'Cricket scoring: balls to runs/wickets to innings total to match result. Model follows natural flow. Each entity maps to real cricket concept.'
    }
  ],
  oopConcepts: [
    {
      name: 'Composition over Inheritance',
      description: 'Match has-a List of Innings, List of Team. Innings has-a List of Ball, Map of stats. Player has-a CareerStats. Cricket domain is a natural composition hierarchy.',
      alternative: 'Could create MatchWithInnings extending Match. Matches can have varying innings (ODI=2, Test=4), making fixed inheritance impractical.'
    },
    {
      name: 'Encapsulation — Stat Updates',
      description: 'Innings.addBall() encapsulates all stat updates — runs, wickets, batting/bowling stats, fall of wickets, extras, overs. External code just submits a Ball.',
      alternative: 'Could let external services update each stat separately. Encapsulation guarantees consistency — every ball updates ALL relevant stats atomically.'
    },
    {
      name: 'Polymorphism — Dismissal Types',
      description: 'WicketType enum drives different match events. Bowled affects bowler stats, Caught affects fielder, RunOut affects multiple fielders. Each has polymorphic behavior for stat updates.',
      alternative: 'Could use string field with if-else. Enum-based polymorphism captures distinct rules per dismissal type.'
    }
  ],
  extensibility: [
    {
      area: 'New Match Format',
      description: 'Add TheHundred (100-ball) as format constant. Define max balls per innings. Existing Innings and Ball models handle all formats.',
      difficulty: 'Easy'
    },
    {
      area: 'Live Score WebSocket',
      description: 'Push ball-by-ball updates to clients via WebSocket. CommentaryService publishes events for WebSocketHandler. Frontend updates in real-time without polling.',
      difficulty: 'Medium'
    },
    {
      area: 'Points Table / Series',
      description: 'Add Series entity with matches between teams. Points table with wins, losses, net run rate. Match results update series standings automatically.',
      difficulty: 'Medium'
    },
    {
      area: 'DRS / Review System',
      description: 'Add Review entity for umpire reviews. Each ball can have review with type, ball tracking data, outcome. Command pattern for balls enables reverting reviews.',
      difficulty: 'Hard'
    }
  ]
};
