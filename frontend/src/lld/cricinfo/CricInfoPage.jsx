import { useState, useEffect, useCallback, Fragment } from 'react';
import LldPage from '../../components/LldPage';
import * as api from './api';
import { usePolling } from '../../hooks/usePolling';

const CSS = `
.cric-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.cric-scoreboard { background: var(--bg-primary); border: 2px solid var(--accent); border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 18px; }
.cric-scoreboard .teams { font-size: 20px; font-weight: 900; color: var(--text-primary); margin: 6px 0; }
.cric-scoreboard .score { font-size: 30px; font-weight: 900; color: var(--accent); }
.cric-scoreboard .sub { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

.over-balls { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.ball-dot { min-width: 30px; height: 30px; padding: 0 4px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: var(--text-primary); }
.ball-dot.four { background: var(--info-bg); color: var(--info); border-color: var(--info); }
.ball-dot.six { background: var(--success-bg); color: var(--success); border-color: var(--success); }
.ball-dot.wicket { background: var(--danger-bg); color: var(--danger); border-color: var(--danger); }
.ball-dot.extra { background: var(--warning-bg, rgba(255,204,0,0.12)); color: var(--warning); border-color: var(--warning); }

.cric-btn-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 12px 0; }
.cric-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-weight: 700; font-size: 13px; transition: opacity .15s; }
.cric-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cric-btn.four { background: var(--info); color: #fff; border: none; }
.cric-btn.six { background: var(--success); color: #fff; border: none; }
.cric-btn.wicket { background: var(--danger); color: #fff; border: none; }
.cric-btn.primary { background: var(--accent-gradient); color: #fff; border: none; }

.cric-log { margin-top: 14px; background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-primary); font-size: 12px; color: var(--info); text-align: center; font-weight: 600; }
.cric-log.bad { color: var(--danger); }

.cric-panel { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
.cric-panel h4 { margin: 0 0 10px; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }

.cric-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cric-table th, .cric-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border-primary); color: var(--text-secondary); }
.cric-table th { color: var(--text-muted); font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
.cric-table td.out { color: var(--text-primary); font-weight: 700; }

.cric-commentary { max-height: 220px; overflow-y: auto; font-size: 12px; }
.cric-commentary .entry { padding: 5px 0; border-bottom: 1px solid var(--border-primary); color: var(--text-secondary); }
.cric-commentary .entry:first-child { color: var(--text-primary); font-weight: 600; }

.match-card { border: 1px solid var(--border-primary); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; background: var(--bg-primary); }
.match-card .mc-title { font-weight: 700; color: var(--text-primary); font-size: 13px; }
.match-card .mc-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.status-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.status-pill.LIVE { background: var(--danger-bg); color: var(--danger); }
.status-pill.UPCOMING { background: var(--info-bg); color: var(--info); }
.status-pill.INNINGS_BREAK { background: var(--warning-bg, rgba(255,204,0,0.12)); color: var(--warning); }
.status-pill.COMPLETED { background: var(--success-bg); color: var(--success); }
.status-pill.ABANDONED { background: var(--bg-tertiary); color: var(--text-muted); }

.observer-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border-primary); font-size: 12px; }
.observer-row:last-child { border-bottom: none; }
.observer-toggle { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-primary); cursor: pointer; font-size: 11px; font-weight: 700; background: var(--bg-tertiary); color: var(--text-primary); }
.observer-toggle.on { background: var(--success-bg); color: var(--success); border-color: var(--success); }
.observer-toggle.protected { opacity: 0.6; cursor: not-allowed; }

.sim-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: var(--border-primary); border: 1px solid var(--border-primary); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.sim-hud-cell { background: var(--bg-primary); padding: 10px 12px; }
.sim-hud-cell dt { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 4px; font-weight: 700; }
.sim-hud-cell dd { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; line-height: 1.2; }
.sim-hud-cell dd.ok { color: var(--success); }
.sim-hud-cell dd.warn { color: var(--warning); }
.sim-hud-cell dd.idle { color: var(--text-muted); font-weight: 600; }

.step-indicator { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.step-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-primary); background: var(--bg-primary); color: var(--text-muted); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all .25s ease; }
.step-dot.done { border-color: var(--success); background: var(--success-bg); color: var(--success); }
.step-dot.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; transform: scale(1.15); }
.step-rule { flex: 0 0 14px; height: 2px; background: var(--border-primary); }
.step-rule.done { background: var(--success); }

.sim-events { margin-top: 16px; max-height: 200px; overflow-y: auto; background: var(--bg-primary); border-radius: 8px; border: 1px solid var(--border-primary); padding: 12px; }
.sim-event { padding: 4px 0; font-size: 11px; color: var(--text-secondary); border-bottom: 1px solid var(--border-primary); }
.sim-event:last-child { border-bottom: none; }
`;

function ballLabel(ball) {
  if (!ball) return '';
  if (ball.wicket) return 'W';
  if (ball.extraType === 'WIDE') return `wd${ball.extraRuns > 1 ? ball.extraRuns : ''}`;
  if (ball.extraType === 'NO_BALL') return `nb${ball.runsOffBat > 0 ? '+' + ball.runsOffBat : ''}`;
  if (ball.extraType === 'BYE') return `b${ball.extraRuns}`;
  if (ball.extraType === 'LEG_BYE') return `lb${ball.extraRuns}`;
  return String(ball.runsOffBat);
}

function ballClass(label) {
  if (label === 'W') return 'wicket';
  if (label === '4') return 'four';
  if (label === '6') return 'six';
  if (label.startsWith('wd') || label.startsWith('nb') || label.startsWith('b') || label.startsWith('lb')) return 'extra';
  return '';
}

function Scoreboard({ scorecard, match }) {
  if (!scorecard) return null;
  return (
    <div className="cric-scoreboard">
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
        {match?.venue?.toUpperCase() || 'LIVE MATCH TRACKER'}
      </div>
      <div className="teams">{scorecard.battingTeamName} vs {scorecard.bowlingTeamName}</div>
      <div className="score">
        {scorecard.totalRuns} / {scorecard.wickets}{' '}
        <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>
          ({scorecard.oversDisplay}{scorecard.oversLimit ? ` / ${scorecard.oversLimit}` : ''} ov)
        </span>
      </div>
      <div className="sub">
        {scorecard.strikerName ? <>Striker: <strong>{scorecard.strikerName} ({scorecard.strikerRuns}*, {scorecard.strikerBalls}b)</strong> · </> : null}
        {scorecard.currentBowlerName ? <>Bowler: <strong>{scorecard.currentBowlerName} ({scorecard.currentBowlerFigures})</strong></> : null}
      </div>
      {scorecard.target != null && (
        <div className="sub">Target: {scorecard.target} · RRR: {scorecard.requiredRunRate ?? '—'}</div>
      )}
      <div className="over-balls">
        {(scorecard.recentBalls || []).map((b, i) => (
          <div key={i} className={`ball-dot ${ballClass(b)}`}>{b}</div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 *  Live Scoring — drives the real /api/cricinfo/* endpoints
 * ============================================================ */
function LiveScoringTab() {
  const [matches, setMatches] = useState([]);
  const [liveMatch, setLiveMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [log, setLog] = useState('Loading live match…');
  const [logBad, setLogBad] = useState(false);
  const [wicketType, setWicketType] = useState('BOWLED');

  const say = (msg, bad = false) => { setLog(msg); setLogBad(bad); };

  const refresh = useCallback(async () => {
    try {
      const all = await api.getMatches();
      setMatches(all);
      const live = all.find(m => m.status === 'LIVE') || all.find(m => m.status === 'INNINGS_BREAK');
      setLiveMatch(live || null);
      if (live) {
        const [sc, cm] = await Promise.all([api.getScorecard(live.id), api.getCommentary(live.id)]);
        setScorecard(sc);
        setCommentary(cm.slice().reverse());
      }
    } catch (err) {
      say(`❌ ${err.message}`, true);
    }
  }, []);

  usePolling(refresh, 4000, [refresh]);

  const bowl = async (payload) => {
    if (!liveMatch) return;
    try {
      await api.recordBall(liveMatch.id, {
        strikerId: null, nonStrikerId: null, bowlerId: null,
        runsOffBat: 0, extraType: null, extraRuns: 0, wicket: false, wicketType: null,
        dismissedPlayerId: null, fielderId: null,
        ...payload,
      });
      say(`🏏 Ball recorded.`);
      await refresh();
    } catch (err) {
      say(`❌ ${err.message}`, true);
    }
  };

  // A fielder must come from the bowling side, not the batting side — resolve the current
  // innings' bowlingTeamId and pick a squad member from that team's roster.
  const pickFielderId = () => {
    const innings = liveMatch?.innings?.[liveMatch.currentInningsIndex];
    if (!innings) return undefined;
    const bowlingTeam = innings.bowlingTeamId === liveMatch.teamA.id ? liveMatch.teamA : liveMatch.teamB;
    return bowlingTeam.players.find(p => p.id !== scorecard?.currentBowlerName)?.id || bowlingTeam.players[0]?.id;
  };

  const nextInnings = async () => {
    try {
      await api.startNextInnings(liveMatch.id);
      say('🔁 Second innings underway.');
      await refresh();
    } catch (err) { say(`❌ ${err.message}`, true); }
  };

  if (!liveMatch) {
    return (
      <div className="cric-container">
        <style>{CSS}</style>
        <div className="cric-log">{log}</div>
      </div>
    );
  }

  return (
    <div className="cric-container">
      <style>{CSS}</style>
      <Scoreboard scorecard={scorecard} match={liveMatch} />

      {liveMatch.status === 'INNINGS_BREAK' ? (
        <div className="cric-btn-row">
          <button className="cric-btn primary" onClick={nextInnings}>🔁 Start Next Innings</button>
        </div>
      ) : (
        <>
          <div className="cric-btn-row">
            {[0, 1, 2, 3].map(r => (
              <button key={r} className="cric-btn" onClick={() => bowl({ runsOffBat: r })}>+{r}</button>
            ))}
            <button className="cric-btn four" onClick={() => bowl({ runsOffBat: 4 })}>FOUR</button>
            <button className="cric-btn six" onClick={() => bowl({ runsOffBat: 6 })}>SIX</button>
          </div>
          <div className="cric-btn-row">
            <button className="cric-btn" onClick={() => bowl({ extraType: 'WIDE', extraRuns: 1 })}>Wide</button>
            <button className="cric-btn" onClick={() => bowl({ extraType: 'NO_BALL', extraRuns: 1 })}>No Ball</button>
            <button className="cric-btn" onClick={() => bowl({ extraType: 'BYE', extraRuns: 1 })}>Bye</button>
            <button className="cric-btn" onClick={() => bowl({ extraType: 'LEG_BYE', extraRuns: 1 })}>Leg Bye</button>
          </div>
          <div className="cric-btn-row">
            <select value={wicketType} onChange={(e) => setWicketType(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              {['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <button className="cric-btn wicket" onClick={() => bowl({
              wicket: true, wicketType,
              fielderId: (wicketType === 'CAUGHT' || wicketType === 'STUMPED' || wicketType === 'RUN_OUT')
                ? pickFielderId()
                : undefined,
            })}>WICKET</button>
          </div>
        </>
      )}

      <div className={`cric-log ${logBad ? 'bad' : ''}`}>{log}</div>

      <div className="cric-panel">
        <h4>Batting</h4>
        <table className="cric-table">
          <thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            {(scorecard?.battingStats || []).map(b => (
              <tr key={b.playerId}>
                <td className={b.out ? 'out' : ''}>{b.playerName}{b.out ? ` (${b.dismissalDescription})` : b.playerName === scorecard.strikerName ? ' *' : ''}</td>
                <td>{b.runs}</td><td>{b.ballsFaced}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{b.strikeRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cric-panel">
        <h4>Bowling</h4>
        <table className="cric-table">
          <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
          <tbody>
            {(scorecard?.bowlingStats || []).map(b => (
              <tr key={b.playerId}>
                <td>{b.playerName}</td><td>{b.oversDisplay}</td><td>{b.runsConceded}</td><td>{b.wickets}</td><td>{b.economy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cric-panel">
        <h4>Ball-by-Ball Commentary (Observer feed)</h4>
        <div className="cric-commentary">
          {commentary.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No commentary yet.</div>}
          {commentary.map((c, i) => <div key={i} className="entry">{c.text}</div>)}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Matches & Observers — match lifecycle + dynamic subscribe toggle
 * ============================================================ */
function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [observers, setObservers] = useState([]);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [venue, setVenue] = useState('Neutral Ground');
  const [format, setFormat] = useState('T20');
  const [log, setLog] = useState('');

  const refresh = useCallback(async () => {
    const [m, t, o] = await Promise.all([api.getMatches(), api.getTeams(), api.getObservers()]);
    setMatches(m);
    setTeams(t);
    setObservers(o);
    if (!teamAId && t[0]) setTeamAId(t[0].id);
    if (!teamBId && t[1]) setTeamBId(t[1].id);
  }, [teamAId, teamBId]);

  usePolling(refresh, 6000, [refresh]);

  const create = async () => {
    try {
      const match = await api.createMatch({ teamAId, teamBId, venue, format, date: null });
      setLog(`✅ Match ${match.id} created (UPCOMING).`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const tossAndStart = async (matchId, winnerTeamId) => {
    try {
      await api.performToss(matchId, winnerTeamId, 'BAT');
      await api.startMatch(matchId);
      setLog(`🪙 Toss done and match ${matchId} started.`);
      await refresh();
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  const toggle = async (name, enabled) => {
    try {
      const status = await api.toggleObserver(name, enabled);
      setObservers(status);
      setLog(`${enabled ? '✅ Subscribed' : '🔇 Unsubscribed'} ${name} from the ball-event publisher.`);
    } catch (err) { setLog(`❌ ${err.message}`); }
  };

  return (
    <div className="cric-container">
      <style>{CSS}</style>

      <div className="cric-panel">
        <h4>Create Match</h4>
        <div className="cric-btn-row" style={{ flexWrap: 'wrap' }}>
          <select value={teamAId} onChange={e => setTeamAId(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>vs</span>
          <select value={teamBId} onChange={e => setTeamBId(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
            {['T20', 'ODI', 'TEST'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Venue"
            style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
          <button className="cric-btn primary" onClick={create}>Create</button>
        </div>
        {log && <div className="cric-log">{log}</div>}
      </div>

      <div className="cric-panel">
        <h4>Matches</h4>
        {matches.map(m => (
          <div key={m.id} className="match-card">
            <div className="mc-title">{m.teamA.name} vs {m.teamB.name} <span className={`status-pill ${m.status}`}>{m.status}</span></div>
            <div className="mc-meta">{m.venue} · {m.format} · {m.id}</div>
            {m.status === 'UPCOMING' && (
              <div className="cric-btn-row" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
                <button className="cric-btn" onClick={() => tossAndStart(m.id, m.teamA.id)}>Toss → {m.teamA.shortName} bats, Start</button>
              </div>
            )}
            {m.result && <div className="mc-meta" style={{ marginTop: 4, color: 'var(--success)' }}>{m.result.summary}</div>}
          </div>
        ))}
      </div>

      <div className="cric-panel">
        <h4>Ball-Event Observers (Subject/Observer pattern, live)</h4>
        {observers.map(o => (
          <div key={o.name} className="observer-row">
            <span>{o.name}{o.protected ? ' (core — always on)' : ''}</span>
            <button
              className={`observer-toggle ${o.subscribed ? 'on' : ''} ${o.protected ? 'protected' : ''}`}
              disabled={o.protected}
              onClick={() => toggle(o.name, !o.subscribed)}
            >
              {o.subscribed ? 'Subscribed' : 'Unsubscribed'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 *  Simulation Tab — drives /api/cricinfo/sim/* only.
 *  Each step is (almost always) exactly one ball.
 * ============================================================ */
const SIM_STEPS = [
  { label: 'Reset', detail: 'Reseed the isolated sandbox — two fictional squads, toss done, innings started.' },
  { label: 'Dot Ball', detail: 'Bowl a dot ball. ScorecardProjectionObserver folds it into the innings totals.' },
  { label: 'FOUR!', detail: 'A boundary — the same observer updates runs, balls faced and the recent-balls strip.' },
  { label: 'SIX!', detail: 'Another observer (Commentary) independently derives text from the identical event.' },
  { label: 'Wide', detail: 'An illegal delivery — credited to extras, does not count toward the over.' },
  { label: 'WICKET', detail: 'A dismissal — PlayerCareerStatsObserver credits the bowler, a new batsman is auto-promoted.' },
  { label: 'Mute Commentary', detail: 'Unsubscribe CommentaryObserver at runtime, then bowl a single — commentary stops growing.' },
  { label: 'Unmute & Final Ball', detail: 'Resubscribe CommentaryObserver, then bowl the last ball — commentary resumes.' },
];

function SimulationTab() {
  const [match, setMatch] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [events, setEvents] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState('Sandbox ready. Step through the eight stages below.');
  const [logBad, setLogBad] = useState(false);

  const say = (msg, bad = false) => { setLog(msg); setLogBad(bad); };

  const refreshSim = useCallback(async () => {
    const [m, sc, cm, ev, tel] = await Promise.all([
      api.simGetMatch(), api.simGetScorecard(), api.simGetCommentary(), api.simGetEvents(), api.simGetTelemetry(),
    ]);
    setMatch(m);
    setScorecard(sc);
    setCommentary(cm.slice().reverse());
    setEvents(ev.slice().reverse());
    setTelemetry(tel);
  }, []);

  useEffect(() => {
    api.simReset().then(refreshSim).catch(err => say(`❌ ${err.message}`, true));
  }, [refreshSim]);

  const resetAll = async () => {
    await api.simReset();
    setStep(0);
    say('🔄 Sandbox reset. Fresh match, first innings underway.');
    await refreshSim();
  };

  const runStep = async () => {
    if (busy) return;
    setBusy(true);
    try {
      switch (step) {
        case 0:
          await resetAll();
          break;
        case 1:
          await api.simBowlBall({ runsOffBat: 0 });
          say('🏏 Dot ball bowled — no run.');
          break;
        case 2:
          await api.simBowlBall({ runsOffBat: 4 });
          say('✨ FOUR! Races to the boundary.');
          break;
        case 3:
          await api.simBowlBall({ runsOffBat: 6 });
          say('💥 SIX! Into the stands.');
          break;
        case 4:
          await api.simBowlBall({ runsOffBat: 0, extraType: 'WIDE', extraRuns: 1 });
          say('↔️ Wide — 1 extra run, over does not advance.');
          break;
        case 5:
          await api.simBowlBall({ runsOffBat: 0, wicket: true, wicketType: 'BOWLED' });
          say('🔴 WICKET! Bowled. A new batsman is auto-promoted.');
          break;
        case 6: {
          await api.simToggleObserver('Commentary', false);
          const before = (await api.simGetCommentary()).length;
          await api.simBowlBall({ runsOffBat: 1 });
          const after = (await api.simGetCommentary()).length;
          say(`🔇 Commentary unsubscribed, then a single was bowled — commentary count stayed at ${after} (was ${before}).`);
          break;
        }
        case 7:
          await api.simToggleObserver('Commentary', true);
          await api.simBowlBall({ runsOffBat: 2 });
          say('✅ Commentary resubscribed and the final ball bowled — the feed resumes.');
          break;
        default:
          break;
      }
      if (step > 0) await refreshSim();
      setStep(s => Math.min(s + 1, SIM_STEPS.length));
    } catch (err) {
      say(`❌ ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  };

  const done = step >= SIM_STEPS.length;

  return (
    <div className="cric-container">
      <style>{CSS}</style>

      <div className="step-indicator">
        {SIM_STEPS.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <span className={`step-rule ${i <= step ? 'done' : ''}`} />}
            <span className={`step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`} title={`${s.label} — ${s.detail}`}>
              {i < step ? '✓' : i + 1}
            </span>
          </Fragment>
        ))}
      </div>

      <dl className="sim-hud">
        <div className="sim-hud-cell"><dt>Match</dt><dd className={match ? 'ok' : 'idle'}>{match?.status || '—'}</dd></div>
        <div className="sim-hud-cell"><dt>Score</dt><dd>{scorecard ? `${scorecard.totalRuns}/${scorecard.wickets}` : '—'}</dd></div>
        <div className="sim-hud-cell"><dt>Overs</dt><dd>{scorecard?.oversDisplay ?? '—'}</dd></div>
        <div className="sim-hud-cell"><dt>Balls Logged</dt><dd className="ok">{telemetry?.ballsBowled ?? 0}</dd></div>
        <div className="sim-hud-cell"><dt>Commentary</dt><dd>{commentary.length}</dd></div>
        <div className="sim-hud-cell"><dt>Audit Events</dt><dd>{telemetry?.totalEvents ?? 0}</dd></div>
      </dl>

      <Scoreboard scorecard={scorecard} match={match} />

      <div className="cric-btn-row">
        <button className="cric-btn wicket" onClick={resetAll} disabled={busy}>🔄 Reset</button>
        <button className="cric-btn primary" onClick={runStep} disabled={busy || done}>
          {done ? '✓ Simulation complete' : `▶ Step ${step + 1} of ${SIM_STEPS.length}: ${SIM_STEPS[step].label}`}
        </button>
      </div>
      {!done && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, maxWidth: 620, marginInline: 'auto' }}>
          {SIM_STEPS[step].detail}
        </div>
      )}

      <div className={`cric-log ${logBad ? 'bad' : ''}`}>{log}</div>

      <div className="cric-panel">
        <h4>Live Observer Fan-Out — Commentary Feed</h4>
        <div className="cric-commentary">
          {commentary.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No commentary yet.</div>}
          {commentary.map((c, i) => <div key={i} className="entry">{c.text}</div>)}
        </div>
      </div>

      {events.length > 0 && (
        <div className="sim-events">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Audit Event Log ({events.length})
          </div>
          {events.map(e => (
            <div key={e.sequence} className="sim-event">
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>[{e.type}]</span>{' '}
              {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CricInfoPage() {
  return (
    <LldPage
      module="cricinfo"
      title="CricInfo Live Scoring"
      icon="🏏"
      tabs={[
        { id: 'live', label: '🏏 Live Scoring' },
        { id: 'matches', label: '📋 Matches & Observers' },
        'simulation',
        'diagram',
        'design',
      ]}
    >
      {(activeTab) => (
        <>
          {activeTab === 'live' && <LiveScoringTab />}
          {activeTab === 'matches' && <MatchesTab />}
          {activeTab === 'simulation' && <SimulationTab />}
        </>
      )}
    </LldPage>
  );
}
