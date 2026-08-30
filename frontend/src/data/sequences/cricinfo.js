// Sequence diagram content for cricinfo (ESPNCricinfo / Live Cricket Scorecard).
// Grounded directly in CricinfoService#recordBall, BallRecordingEngine, and the real
// Observer publisher — corrected after an earlier version invented a "MatchEngine" class
// (the real class is BallRecordingEngine) and a POST /api/cricinfo/matches/{id}/ball
// endpoint with a {batsmanId, bowlerId, runs, isWicket} body (the real endpoint is
// POST /api/cricinfo/matches/{id}/balls — plural — with a much richer BallDto).
export default {
  title: 'CricInfo — Ball-by-Ball Event Processing & Observer Broadcast',
  description:
    'How CricinfoService#recordBall delegates to BallRecordingEngine, which applies the delivery to the match/innings state, then how the resulting Ball is published to every subscribed ball-event observer (commentary, scorecard projection, career stats, audit) independently.',
  flows: [
    {
      id: 'ball-update-broadcast-flow',
      label: 'Ball delivery recorded → Innings state updated → Observers fan out',
      description:
        'The scorer records a 6-run delivery off bowler B1 faced by striker A1. CricinfoController#recordBall converts the request body into a BallRequest and calls CricinfoService#recordBall, which delegates to BallRecordingEngine to apply the delivery against the current innings (runs, strike rotation, over completion) — the engine itself publishes the resulting BallEvent once so every registered BallEventObserver (commentary, scorecard projection, career stats, audit) reacts independently, before control returns to the service (CricinfoServiceTest / BallRecordingEngineTest cover the state update; observer fan-out is covered by the *ObserverTest suite).',
      participants: [
        { id: 'scorer', name: 'Official Scorer', kind: 'actor' },
        { id: 'controller', name: 'CricinfoController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'CricinfoService', kind: 'component', stereotype: 'facade' },
        { id: 'engine', name: 'BallRecordingEngine', kind: 'component' },
        { id: 'publisher', name: 'MatchPublisher', kind: 'component', stereotype: 'observer' },
        { id: 'scorecardObs', name: 'ScorecardProjectionObserver', kind: 'component', stereotype: 'observer' },
        { id: 'commentaryObs', name: 'CommentaryObserver', kind: 'component', stereotype: 'observer' },
      ],
      steps: [
        { from: 'scorer', to: 'controller', text: 'POST /api/cricinfo/matches/M1/balls {strikerId:"A1", nonStrikerId:"A2", bowlerId:"B1", runsOffBat:6, wicket:false}' },
        { from: 'controller', to: 'service', text: 'recordBall("M1", ballRequest)', activate: 'service' },
        { from: 'service', to: 'engine', text: 'engine.recordBall("M1", request)', activate: 'engine' },
        { from: 'engine', to: 'engine', text: 'apply delivery: teamScore += 6, striker runs += 6 (+1 six), bowler runsConceded += 6, rotate strike if odd runs; append Ball to Innings.balls' },
        { from: 'engine', to: 'publisher', text: 'publisher.publish(new BallEvent(match, innings, ball))', activate: 'publisher' },
        { from: 'publisher', to: 'scorecardObs', text: 'onBallBowled(event) — recompute Scorecard projection' },
        { from: 'publisher', to: 'commentaryObs', text: 'onBallBowled(event) — append CommentaryEntry ("SIX! A1 finds the gap")' },
        { type: 'note', over: ['scorecardObs', 'commentaryObs'], text: 'Each observer reacts independently and neither knows the other exists — the same fan-out shape as PlayerCareerStatsObserver and BallEventAuditObserver, both also registered on the same CopyOnWriteArrayList-backed MatchPublisher.' },
        { from: 'publisher', to: 'engine', text: 'all observers notified', type: 'return', deactivate: 'publisher' },
        { from: 'engine', to: 'service', text: 'return recorded Ball', type: 'return', deactivate: 'engine' },
        { from: 'service', to: 'service', text: 'advanceIfInningsComplete(match, repository) — checks overs/wickets/target, may start next innings' },
        { from: 'service', to: 'controller', text: 'return Ball {runsOffBat: 6, ...}', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'scorer', text: '200 OK — Ball recorded', type: 'return' },
      ],
    },
  ],
};
