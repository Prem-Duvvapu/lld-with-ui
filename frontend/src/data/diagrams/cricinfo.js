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
        '- teams: Team[2]',
        '- venue: String',
        '- date: LocalDateTime',
        '- status: MatchStatus',
        '- innings: List<Inning>',
        '- scorecard: Scorecard'
      ],
      methods: [
        '+ start(): void',
        '+ end(result): void',
        '+ getCurrentScore(): String'
      ]
    },
    {
      name: 'Team',
      fields: [
        '- id: String',
        '- name: String',
        '- players: List<Player>',
        '- captain: Player'
      ],
      methods: [
        '+ addPlayer(player): void',
        '+ selectCaptain(player): void'
      ]
    },
    {
      name: 'Player',
      fields: [
        '- id: String',
        '- name: String',
        '- role: String (BATSMAN/BOWLER/ALLROUNDER)',
        '- stats: Map<String, Object>'
      ],
      methods: [
        '+ updateStats(ball): void',
        '+ getAverage(): double'
      ]
    },
    {
      name: 'Inning',
      fields: [
        '- id: String',
        '- battingTeam: Team',
        '- bowlingTeam: Team',
        '- balls: List<Ball>',
        '- totalRuns: int',
        '- wickets: int',
        '- overs: double'
      ],
      methods: [
        '+ addBall(ball): void',
        '+ isComplete(): boolean'
      ]
    },
    {
      name: 'Scorecard',
      fields: [
        '- match: Match',
        '- batsmanStats: Map<Player, BattingStats>',
        '- bowlerStats: Map<Player, BowlingStats>'
      ],
      methods: [
        '+ updateBatsmanStats(player, ball): void',
        '+ updateBowlerStats(player, ball): void'
      ]
    },
    {
      name: 'Ball',
      fields: [
        '- ballNumber: int',
        '- bowler: Player',
        '- batsman: Player',
        '- runs: int',
        '- isWicket: boolean',
        '- wicketType: String'
      ],
      methods: []
    },
    {
      name: 'MatchStatus',
      stereotype: 'enum',
      fields: [
        'NOT_STARTED',
        'LIVE',
        'COMPLETED',
        'DRAWN',
        'ABANDONED'
      ],
      methods: []
    }
  ],
  relationships: [
    {
      from: 'Match',
      to: 'Team',
      label: 'has 2'
    },
    {
      from: 'Team',
      to: 'Player',
      label: 'contains'
    },
    {
      from: 'Match',
      to: 'Inning',
      label: 'contains'
    },
    {
      from: 'Match',
      to: 'Scorecard',
      label: 'has'
    },
    {
      from: 'Inning',
      to: 'Ball',
      label: 'contains'
    },
    {
      from: 'Match',
      to: 'MatchStatus',
      label: 'has state'
    }
  ]
};
