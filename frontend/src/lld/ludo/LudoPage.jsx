import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createGame, getGame, rollDice, moveToken } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const s = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; }
.app { max-width: 560px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 20px; }
header h1 { font-size: 28px; color: #f0f0f0; }
header p { color: #888; font-size: 14px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #666; border-radius: 6px; color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
.back-home:hover { background: #333; color: #fff; }
nav { display: flex; gap: 8px; margin-bottom: 20px; justify-content: center; }
nav button { padding: 8px 20px; border: 2px solid #555; border-radius: 8px; background: #2a2a3e; color: #ccc; cursor: pointer; font-weight: 600; font-size: 13px; }
nav button.active { background: #4a4a6e; color: #fff; border-color: #f59e0b; }
main { background: #2a2a3e; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.setup { max-width: 320px; margin: 0 auto; }
.setup h2 { margin-bottom: 16px; color: #e0e0e0; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; color: #aaa; }
.form-group input { width: 100%; padding: 10px; border: 2px solid #444; border-radius: 6px; font-size: 14px; background: #1e1e30; color: #e0e0e0; }
.form-group input:focus { outline: none; border-color: #f59e0b; }
.btn-primary { width: 100%; padding: 12px; background: #f59e0b; color: #1a1a2e; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; }
.btn-primary:hover { background: #d97706; }
.game-header { text-align: center; margin-bottom: 12px; }
.game-header h2 { font-size: 18px; margin-bottom: 4px; }
.turn-indicator { padding: 6px 14px; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px; margin: 4px 0; }
.dice-area { text-align: center; margin: 12px 0; }
.dice { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #fff; color: #333; border-radius: 12px; font-size: 32px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid #555; transition: transform 0.15s; }
.dice.rolling { animation: shake 0.3s ease-in-out 3; }
@keyframes shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
.dice-value { font-size: 24px; }
.ludo-board { display: grid; grid-template-columns: repeat(8, 1fr); max-width: 360px; margin: 0 auto 12px; gap: 2px; }
.ludo-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 4px; font-size: 9px; color: #888; cursor: default; background: #333; border: 1px solid #555; }
.ludo-cell.red-zone { background: rgba(239,68,68,0.25); }
.ludo-cell.green-zone { background: rgba(34,197,94,0.25); }
.ludo-cell.blue-zone { background: rgba(59,130,246,0.25); }
.ludo-cell.yellow-zone { background: rgba(234,179,8,0.25); }
.ludo-cell.start-red { background: #ef4444; }
.ludo-cell.start-green { background: #22c55e; }
.ludo-cell.start-blue { background: #3b82f6; }
.ludo-cell.start-yellow { background: #eab308; }
.ludo-cell.safe { border: 2px solid #fff; }
.ludo-token { position: absolute; width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.3); box-shadow: 0 1px 3px rgba(0,0,0,0.4); font-size: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.ludo-token.RED { background: #ef4444; }
.ludo-token.GREEN { background: #22c55e; }
.ludo-token.BLUE { background: #3b82f6; }
.ludo-token.YELLOW { background: #eab308; color: #333; }
.player-area { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 12px 0; }
.player-card { padding: 8px 12px; border-radius: 8px; border: 2px solid #555; background: #1e1e30; min-width: 100px; text-align: center; transition: all 0.2s; }
.player-card.active-red { border-color: #ef4444; background: rgba(239,68,68,0.1); }
.player-card.active-green { border-color: #22c55e; background: rgba(34,197,94,0.1); }
.player-card.active-blue { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
.player-card.active-yellow { border-color: #eab308; background: rgba(234,179,8,0.1); }
.player-card-name { font-weight: 700; font-size: 13px; }
.player-card-tokens { font-size: 11px; color: #888; margin-top: 2px; }
.player-tokens { display: flex; gap: 4px; justify-content: center; margin-top: 4px; }
.mini-token { width: 14px; height: 14px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.3); opacity: 0.6; transition: all 0.15s; }
.mini-token.active { opacity: 1; box-shadow: 0 0 6px rgba(255,255,255,0.4); }
.mini-token.finished { opacity: 0.3; cursor: default; }
.mini-token.RED { background: #ef4444; }
.mini-token.GREEN { background: #22c55e; }
.mini-token.BLUE { background: #3b82f6; }
.mini-token.YELLOW { background: #eab308; }
.game-winner { text-align: center; padding: 12px; background: #065f46; border-radius: 8px; margin-top: 12px; font-weight: 700; font-size: 16px; }
.game-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.game-actions button { padding: 8px 16px; border: 1px solid #555; border-radius: 6px; background: #333; color: #ccc; cursor: pointer; font-weight: 600; }
.game-actions button:hover { background: #444; }
.game-id { text-align: center; font-size: 12px; color: #666; margin-top: 8px; }
.alert { text-align: center; padding: 32px; color: #888; font-size: 16px; }
.error { margin-top: 12px; padding: 10px; background: #5a1a1a; color: #ff6b6b; border-radius: 6px; font-size: 13px; text-align: center; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #444; transition: all 0.3s; }
.step-dot.active { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.step-dot.done { background: #3fb950; }
.scene { background: #1e1e30; border-radius: 12px; padding: 20px; border: 1px solid #444; margin-bottom: 16px; }
.flow-board { display: grid; grid-template-columns: repeat(8, 38px); gap: 1px; justify-content: center; margin: 12px auto; }
.flow-cell-sm { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 3px; position: relative; font-size: 8px; color: #666; background: #333; border: 1px solid #555; }
.flow-token { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.3); position: absolute; font-size: 6px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.flow-token.RED { background: #ef4444; }
.flow-token.GREEN { background: #22c55e; }
.flow-token.BLUE { background: #3b82f6; }
.flow-token.YELLOW { background: #eab308; color: #333; }
.popup { background: #2a2a3e; border: 1px solid #f59e0b; border-radius: 12px; padding: 20px 28px; text-align: center; margin: 16px auto; max-width: 300px; }
.popup-icon { font-size: 36px; margin-bottom: 6px; }
.popup-text { font-size: 16px; font-weight: 700; color: #e0e0e0; }
`;

const COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
const COLOR_HEX = { RED: '#ef4444', GREEN: '#22c55e', BLUE: '#3b82f6', YELLOW: '#eab308' };
const START_POS = [0, 13, 26, 39];
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function trackPosition(index) {
  const positions = [];
  for (let i = 0; i < 52; i++) positions.push(i);
  return positions;
}

function getCellStyle(pos, startPos, colorIdx) {
  if (pos === startPos) return `start-${COLORS[colorIdx].toLowerCase()}`;
  const zoneSize = 4;
  const zoneStart = colorIdx * 13 - zoneSize;
  const zoneEnd = colorIdx * 13 + zoneSize;
  if (pos >= (zoneStart + 52) % 52 && pos <= zoneEnd) {
    return `${COLORS[colorIdx].toLowerCase()}-zone`;
  }
  return '';
}

function cellLabel(pos) {
  if (SAFE_SPOTS.includes(pos)) return '⭐';
  return '';
}

function GameBoard({ gameId, playerNames, onNewGame }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);
  const [diceFace, setDiceFace] = useState(null);

  const refresh = useCallback(async () => {
    const data = await getGame(gameId);
    if (!data.error) setGame(data);
  }, [gameId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRoll = async () => {
    if (rolling || game?.status === 'FINISHED') return;
    setRolling(true);
    setDiceFace('🎲');
    await new Promise(r => setTimeout(r, 400));
    const data = await rollDice(gameId);
    if (!data.error) {
      setGame(data);
      setDiceFace(DICE_FACES[data.diceValue - 1] || '🎲');
    } else {
      setError(data.error);
    }
    setRolling(false);
  };

  const handleTokenClick = async (tokenIndex) => {
    if (!game || game.status === 'FINISHED' || game.diceValue === 0) return;
    const pi = game.currentPlayerIndex;
    const data = await moveToken(gameId, pi, tokenIndex);
    if (data.error) {
      setError(data.error);
    } else {
      setGame(data);
      setDiceFace(null);
      setError('');
    }
  };

  if (!game) return <div className="alert">Loading...</div>;
  if (game.error) return <div className="alert">Error: {game.error}</div>;

  const tokens = game.tokens || [];
  const currentPlayer = game.players?.[game.currentPlayerIndex];

  return (
    <div>
      <div className="game-header">
        <h2>🎲 Ludo Royale</h2>
        {game.status !== 'FINISHED' && (
          <div className="turn-indicator" style={{ background: COLOR_HEX[currentPlayer?.color] || '#555', color: currentPlayer?.color === 'YELLOW' ? '#333' : '#fff' }}>
            {currentPlayer?.name}'s turn ({currentPlayer?.color})
          </div>
        )}
      </div>

      <div className="dice-area">
        <div className={`dice ${rolling ? 'rolling' : ''}`}>
          {diceFace ? <span className="dice-value">{diceFace}</span> : '🎲'}
        </div>
        {game.diceValue > 0 && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Rolled: {game.diceValue}</div>}
      </div>

      <div className="player-area">
        {game.players?.map((p, i) => {
          const playerTokens = tokens[i] || [];
          const homeCount = playerTokens.filter(t => t.home).length;
          const activeCount = playerTokens.filter(t => !t.home && !t.finished).length;
          const finishedCount = playerTokens.filter(t => t.finished).length;
          const isActive = game.currentPlayerIndex === i && game.status !== 'FINISHED';
          return (
            <div key={p.color} className={`player-card ${isActive ? `active-${p.color.toLowerCase()}` : ''}`}>
              <div className="player-card-name" style={{ color: COLOR_HEX[p.color] }}>{p.name}</div>
              <div className="player-card-tokens">🏠{homeCount} 🎯{activeCount} ✅{finishedCount}</div>
              <div className="player-tokens">
                {playerTokens.map((t, ti) => (
                  <div key={ti} className={`mini-token ${p.color} ${!t.home && !t.finished ? 'active' : ''} ${t.finished ? 'finished' : ''}`}
                    onClick={() => isActive && game.diceValue > 0 && !t.home && !t.finished && handleTokenClick(ti)}
                    title={`Token ${ti + 1}: ${t.home ? 'Home' : t.finished ? 'Finished' : `Position ${t.position}`}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {game.status === 'FINISHED' && (
        <div className="game-winner">🏆 {game.winner} Wins!</div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="game-actions">
        {game.status !== 'FINISHED' && (
          <button onClick={handleRoll} disabled={rolling} style={{ background: COLOR_HEX[currentPlayer?.color] || '#555', color: currentPlayer?.color === 'YELLOW' ? '#333' : '#fff', fontWeight: 700 }}>
            🎲 Roll Dice {rolling ? '...' : ''}
          </button>
        )}
        <button onClick={onNewGame}>New Game</button>
      </div>
      <div className="game-id">Game: {game.id}</div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [game, setGame] = useState(null);
  const [diceVal, setDiceVal] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);
  const [tokenPositions, setTokenPositions] = useState({});
  const mountedRef = useRef(true);
  const steps = ['Create', 'Roll 1', 'Roll 2', 'Roll 3', 'Win'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setGame(null); setDiceVal(null); setMsg(''); setError(''); setRolling(false); setTokenPositions({}); };

  const createGameAction = async () => {
    setError(''); setLoading(true);
    try {
      const g = await createGame(['Alice', 'Bob', 'Charlie', 'Diana']);
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      const pos = {};
      g.tokens?.forEach((tokens, pi) => {
        tokens.forEach((t, ti) => { pos[`${pi}-${ti}`] = t.home ? -1 : t.position; });
      });
      setTokenPositions(pos);
      setStep(1); setMsg('Game started! 🎲');
    } catch { if (mountedRef.current) setError('Failed to create game'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const rollAction = async () => {
    if (!game || rolling) return;
    setRolling(true); setError('');
    await new Promise(r => setTimeout(r, 400));
    if (!mountedRef.current) return;
    const data = await rollDice(game.id);
    if (!mountedRef.current) return;
    if (data.error) { setError(data.error); setRolling(false); return; }
    setGame(data); setDiceVal(data.diceValue);
    const pi = data.currentPlayerIndex;
    if (data.diceValue === 6) {
      const firstHome = data.tokens?.[pi]?.findIndex(t => t.home);
      if (firstHome !== -1) {
        const moved = await moveToken(data.id, pi, firstHome);
        if (!mountedRef.current) return;
        if (!moved.error) {
          setGame(moved);
          setMsg(`${data.players?.[pi]?.name} rolled a 6 and moved out!`);
        }
      } else {
        setMsg(`${data.players?.[pi]?.name} rolled a ${data.diceValue}`);
      }
    } else {
      const firstMovable = data.tokens?.[pi]?.findIndex(t => !t.home && !t.finished);
      if (firstMovable !== -1) {
        const moved = await moveToken(data.id, pi, firstMovable);
        if (!mountedRef.current) return;
        if (!moved.error) {
          setGame(moved);
          setMsg(`${data.players?.[pi]?.name} moved token ${firstMovable + 1}`);
        }
      } else {
        setMsg(`${data.players?.[pi]?.name} rolled ${data.diceValue} — no move`);
      }
    }
    setRolling(false);
    if (data.status === 'FINISHED' || data.winner) {
      setMsg(`🏆 ${data.winner} wins!`);
      setStep(4);
    } else if (step < 3) {
      setStep(s => Math.min(s + 1, 3));
    }
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step]}</span>
      </div>
      {error && <div className="error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#444', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#ccc' }}>↺ Reset</button></div>}
      <div className="scene">
        {game && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: '#aaa' }}>
                {game.players?.map((p, i) => (
                  <span key={p.color} style={{ margin: '0 8px', color: game.currentPlayerIndex === i ? COLOR_HEX[p.color] : '#666' }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <div className={`dice ${rolling ? 'rolling' : ''}`} style={{ width: 48, height: 48, fontSize: 24 }}>
                {diceVal ? DICE_FACES[diceVal - 1] || diceVal : '🎲'}
              </div>
            </div>
            {msg && <div style={{ textAlign: 'center', fontSize: 13, color: '#ccc', margin: '6px 0', padding: '6px', background: '#2a2a3e', borderRadius: 6 }}>{msg}</div>}
          </>
        )}
      </div>
      {step === 0 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => setStep(-1)} style={{ padding: '12px 32px', background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>▶ Start Simulation</button>
        </div>
      )}
      {step === -1 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={createGameAction} disabled={loading} style={{ padding: '8px 20px', background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🎲 Create Game {loading ? '...' : ''}
          </button>
        </div>
      )}
      {step >= 1 && step < 4 && game && game.status !== 'FINISHED' && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={rollAction} disabled={rolling} style={{ padding: '8px 20px', background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            🎲 Roll Dice {loading || rolling ? '...' : ''}
          </button>
        </div>
      )}
      {step === 4 && game?.winner && (
        <div className="popup">
          <div className="popup-icon">🏆</div>
          <div className="popup-text">{game.winner} Wins! 🎉</div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setStep(5)} style={{ padding: '8px 20px', background: '#3fb950', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✅ Done</button>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="popup">
          <div className="popup-icon">✅</div>
          <div className="popup-text">Simulation Complete!</div>
          <div style={{ marginTop: 10 }}>
            <button onClick={reset} style={{ padding: '8px 20px', background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>🔄 New Simulation</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LudoPage() {
  const [page, setPage] = useState('game');
  const [gameId, setGameId] = useState(null);
  const [names, setNames] = useState(['Alice', 'Bob', 'Charlie', 'Diana']);

  return (
    <div className="app">
      <style>{s}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header>
        <h1>🎲 Ludo</h1>
        <p>Low-Level Design</p>
      </header>
      <nav>
        <button className={page === 'game' ? 'active' : ''} onClick={() => setPage('game')}>Game</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'game' && (
          !gameId ? (
            <div className="setup">
              <h2>New Game</h2>
              {names.map((n, i) => (
                <div key={i} className="form-group">
                  <label style={{ color: Object.values(COLOR_HEX)[i] }}>Player {i + 1} ({COLORS[i]})</label>
                  <input value={n} onChange={(e) => { const next = [...names]; next[i] = e.target.value; setNames(next); }} />
                </div>
              ))}
              <button className="btn-primary" onClick={async () => {
                const data = await createGame(names);
                if (!data.error) setGameId(data.id);
              }}>Start Game</button>
            </div>
          ) : (
            <GameBoard gameId={gameId} playerNames={names} onNewGame={() => setGameId(null)} />
          )
        )}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="ludo" />}
        {page === 'design' && <DesignDetails module="ludo" />}
      </main>
    </div>
  );
}