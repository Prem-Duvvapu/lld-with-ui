import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.cric-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.cric-scoreboard { background: var(--bg-primary); border: 2px solid var(--accent); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }

.over-balls { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.ball-dot { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-card); border: 1px solid var(--border-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.ball-dot.four { background: var(--info-bg); color: var(--info); border-color: var(--info); }
.ball-dot.six { background: var(--success-bg); color: var(--success); border-color: var(--success); }
.ball-dot.wicket { background: var(--danger-bg); color: var(--danger); border-color: var(--danger); }
`;

function AnimatedFlow() {
  const [runs, setRuns] = useState(182);
  const [wickets, setWickets] = useState(3);
  const [overs, setOvers] = useState(18.4);
  const [recentBalls, setRecentBalls] = useState(['1', '4', '0', '6']);
  const [commentary, setCommentary] = useState([]);

  const playBall = (outcome) => {
    let addRuns = 0;
    let addWicket = 0;

    if (outcome === 'W') addWicket = 1;
    else addRuns = parseInt(outcome, 10);

    const newRuns = runs + addRuns;
    const newWickets = wickets + addWicket;
    const newOvers = parseFloat((overs + 0.1).toFixed(1));

    setRuns(newRuns);
    setWickets(newWickets);
    setOvers(newOvers);
    setRecentBalls(prev => [...prev.slice(-5), outcome]);

    const msg = outcome === 'W'
      ? `🔴 WICKET! Batter caught at long-on! Score: ${newRuns}/${newWickets} (${newOvers} ov)`
      : outcome === '6'
      ? `💥 SIX! Massive hit over deep mid-wicket! Score: ${newRuns}/${newWickets}`
      : outcome === '4'
      ? `✨ FOUR! Beautiful cover drive to the fence! Score: ${newRuns}/${newWickets}`
      : `🏏 ${addRuns} run(s) taken. Score: ${newRuns}/${newWickets}`;

    setCommentary(prev => [msg, ...prev.slice(0, 4)]);
  };

  return (
    <div className="cric-container">
      <style>{CSS}</style>

      <div className="cric-scoreboard">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>T20 WORLD CUP FINAL — LIVE MATCH TRACKER</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0' }}>
          🇮🇳 INDIA vs 🇦🇺 AUSTRALIA
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)' }}>
          {runs} / {wickets} <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>({overs} Overs)</span>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          Batter: <strong>Virat (74*)</strong> · Bowler: <strong>Starc (3.4-0-32-1)</strong>
        </div>

        <div className="over-balls">
          {recentBalls.map((b, idx) => (
            <div key={idx} className={`ball-dot ${b === '4' ? 'four' : b === '6' ? 'six' : b === 'W' ? 'wicket' : ''}`}>
              {b}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justify: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => playBall('1')} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}>+1 Run</button>
        <button onClick={() => playBall('2')} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}>+2 Runs</button>
        <button onClick={() => playBall('4')} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--info)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✨ FOUR (4)</button>
        <button onClick={() => playBall('6')} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>💥 SIX (6)</button>
        <button onClick={() => playBall('W')} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>🔴 WICKET (W)</button>
      </div>

      <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Live Observer Pattern Commentary Stream:</div>
        {commentary.map((c, idx) => (
          <div key={idx} style={{ color: idx === 0 ? 'var(--info)' : 'var(--text-muted)', margin: '3px 0' }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

export default function CricInfoPage() {
  return (
    <LldPage module="cricinfo" title="CricInfo Scoreboard System" icon="🏏" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
