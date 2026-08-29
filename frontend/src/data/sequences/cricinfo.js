// Sequence diagram content for cricinfo (ESPNCricinfo / Live Cricket Scorecard).
// Grounded directly in CricInfoService, Match engine ball-by-ball updates,
// and Live Scorecard Observer notifications.
export default {
  title: 'CricInfo — Ball-by-Ball Event Processing & Live Scorecard Broadcast',
  description:
    'How CricInfoService processes live cricket deliveries. When a ball outcome (runs, wicket, extra) is recorded, the match engine updates batsman and bowler figures atomically, checks innings completion, and broadcasts scorecard snapshots to subscribed UI clients.',
  flows: [
    {
      id: 'ball-update-broadcast-flow',
      label: 'Ball delivery recorded → Stats updated → Live Scorecard broadcast',
      description:
        'Umpire records a 6-run hit off bowler B1 by batsman A1. CricInfoService validates current over state, increments team runs and batsman boundary counts, updates bowler economy, and notifies live observers.',
      participants: [
        { id: 'scorer', name: 'Official Scorer', kind: 'actor' },
        { id: 'controller', name: 'CricInfo\nController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CricInfo\nService', kind: 'component', stereotype: 'facade' },
        { id: 'engine', name: 'MatchEngine', kind: 'component' },
        { id: 'match', name: 'Match / Scorecard\n(IND vs AUS)', kind: 'store' },
        { id: 'notifier', name: 'ScorecardNotifier', kind: 'component', stereotype: 'observer' },
      ],
      steps: [
        { from: 'scorer', to: 'controller', text: 'POST /api/cricinfo/matches/101/ball {batsmanId: "A1", bowlerId: "B1", runs: 6, isWicket: false}' },
        { from: 'controller', to: 'service', text: 'recordBall(101, "A1", "B1", 6, false)', activate: 'service' },
        { from: 'service', to: 'engine', text: 'applyDelivery(match, delivery)', activate: 'engine' },
        { from: 'engine', to: 'match', text: 'updateScore(runs=6) → teamScore becomes 184/3 (18.4 ov)' },
        { from: 'engine', to: 'match', text: 'updateBatsman("A1", +6 runs, +1 six) → 82* (44b)' },
        { from: 'engine', to: 'match', text: 'updateBowler("B1", +6 runs conceded) → 3.4-0-38-1' },
        { from: 'engine', to: 'service', text: 'Updated Match snapshot', type: 'return', deactivate: 'engine' },
        { from: 'service', to: 'notifier', text: 'notifyScoreUpdate(MatchSnapshot)', activate: 'notifier' },
        { from: 'notifier', to: 'notifier', text: 'pushToLiveClients: "SIX! A1 smashes over long-on (184/3)"' },
        { from: 'notifier', to: 'service', text: 'Broadcast sent ✓', type: 'return', deactivate: 'notifier' },
        { from: 'service', to: 'controller', text: 'return MatchResponse {score: "184/3", over: "18.4", lastBall: "SIX"}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'scorer', text: '200 OK — Ball 18.4 recorded: 6 runs', type: 'return' },
      ],
    },
  ],
};
