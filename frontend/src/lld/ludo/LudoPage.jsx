import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  createGame, getGame, rollDice, moveToken,
  simReset, simGetGame, simGetLog, simRoll, simMove,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import SequenceDiagram from '../../components/SequenceDiagram';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ludo-page { max-width: 760px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); min-height: 100vh; }
.ludo-header { text-align: center; margin-bottom: 16px; }
.ludo-header h1 { font-size: 28px; color: var(--text-primary); margin-bottom: 4px; }
.ludo-header p { color: var(--text-secondary); font-size: 13px; }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: var(--accent); color: #fff; }
.ludo-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.ludo-nav button { padding: 6px 14px; border: 2px solid var(--border-primary); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s; }
.ludo-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.ludo-main { background: var(--bg-secondary); border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-primary); }

.ludo-setup { max-width: 320px; margin: 0 auto; text-align: center; }
.ludo-setup h2 { margin-bottom: 16px; color: var(--text-primary); font-size: 18px; }
.ludo-form-group { margin-bottom: 12px; text-align: left; }
.ludo-form-group label { display: block; margin-bottom: 4px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.ludo-form-group input { width: 100%; padding: 9px 12px; border: 2px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-primary); color: var(--text-primary); }
.ludo-form-group input:focus { outline: none; border-color: var(--accent); }
.ludo-btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; color: #fff; background: var(--accent); }
.ludo-btn:hover { opacity: 0.92; }
.ludo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ludo-btn-outline { padding: 8px 16px; border: 2px solid var(--border-primary); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: transparent; color: var(--text-primary); }
.ludo-btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.ludo-error { text-align: center; padding: 8px 12px; margin: 8px 0; font-size: 13px; color: #fff; background: #d64545; border-radius: 6px; }

.ludo-topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.ludo-turn { padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; color: #fff; }
.ludo-dice-wrap { display: flex; align-items: center; gap: 10px; }
.ludo-dice { width: 46px; height: 46px; border-radius: 10px; background: #fff; color: #222; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; box-shadow: 0 3px 10px rgba(0,0,0,0.35); border: 2px solid #333; }
.ludo-dice.rolling { animation: ludoShake 0.35s ease-in-out 3; }
@keyframes ludoShake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }

.ludo-board-wrap { position: relative; width: 100%; max-width: 476px; margin: 0 auto 16px; }
.ludo-board { display: grid; grid-template-columns: repeat(14, 1fr); grid-template-rows: repeat(14, 1fr); gap: 1px; aspect-ratio: 1; background: var(--border-primary); border-radius: 8px; overflow: hidden; }
.ludo-track-cell { background: var(--cell-bg, var(--bg-primary)); position: relative; display: flex; align-items: center; justify-content: center; font-size: 8px; }
.ludo-track-cell.start-RED { background: rgba(239,68,68,0.55); }
.ludo-track-cell.start-GREEN { background: rgba(34,197,94,0.55); }
.ludo-track-cell.start-BLUE { background: rgba(59,130,246,0.55); }
.ludo-track-cell.start-YELLOW { background: rgba(234,179,8,0.55); }
.ludo-track-cell.safe-star { color: #f59e0b; font-size: 11px; }
.ludo-yard { border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px; }
.ludo-yard.RED { background: rgba(239,68,68,0.16); border: 2px solid rgba(239,68,68,0.5); }
.ludo-yard.GREEN { background: rgba(34,197,94,0.16); border: 2px solid rgba(34,197,94,0.5); }
.ludo-yard.BLUE { background: rgba(59,130,246,0.16); border: 2px solid rgba(59,130,246,0.5); }
.ludo-yard.YELLOW { background: rgba(234,179,8,0.16); border: 2px solid rgba(234,179,8,0.5); }
.ludo-yard-label { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; opacity: 0.85; }
.ludo-yard-tokens { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.ludo-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 30%; height: 30%; background: var(--bg-secondary); border: 2px solid var(--accent); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); padding: 4px; z-index: 5; }
.ludo-center .cur-name { font-size: 11px; font-weight: 800; }
.ludo-center .cur-dice { font-size: 20px; margin: 2px 0; }
.ludo-center .cur-hint { font-size: 8px; opacity: 0.7; }

.ludo-token { border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.85); box-shadow: 0 1px 3px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; cursor: default; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.ludo-token.RED { background: #ef4444; }
.ludo-token.GREEN { background: #22c55e; }
.ludo-token.BLUE { background: #3b82f6; }
.ludo-token.YELLOW { background: #eab308; color: #3b2a00; }
.ludo-token.clickable { cursor: pointer; }
.ludo-token.clickable:hover { transform: scale(1.18); box-shadow: 0 0 0 3px rgba(255,255,255,0.6); }
.ludo-token.finished { opacity: 0.4; }
.ludo-on-track { position: absolute; width: 5.6%; height: 5.6%; font-size: 8px; }

.ludo-players { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 14px 0; }
.ludo-pcard { padding: 8px 12px; border-radius: 10px; border: 2px solid var(--border-primary); background: var(--bg-primary); min-width: 128px; text-align: center; transition: all 0.2s; }
.ludo-pcard.active { box-shadow: 0 0 0 2px var(--accent); }
.ludo-pcard-name { font-weight: 800; font-size: 13px; }
.ludo-pcard-stats { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.ludo-pcard-tokens { display: flex; gap: 4px; justify-content: center; margin-top: 6px; }
.ludo-mini-token { width: 16px; height: 16px; border-radius: 50%; cursor: default; border: 1px solid rgba(0,0,0,0.35); opacity: 0.55; }
.ludo-mini-token.selectable { opacity: 1; cursor: pointer; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
.ludo-mini-token.finished { opacity: 0.25; }
.ludo-mini-token.RED { background: #ef4444; }
.ludo-mini-token.GREEN { background: #22c55e; }
.ludo-mini-token.BLUE { background: #3b82f6; }
.ludo-mini-token.YELLOW { background: #eab308; }

.ludo-winner { text-align: center; padding: 14px; background: #14532d; color: #d1fae5; border-radius: 10px; margin-top: 14px; font-weight: 800; font-size: 16px; }
.ludo-actions { display: flex; gap: 8px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
.ludo-game-id { text-align: center; font-size: 11px; color: var(--text-secondary); margin-top: 8px; }

.ludo-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 12px 0; }
.ludo-hud-tile { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; text-align: center; }
.ludo-hud-tile .v { font-size: 16px; font-weight: 800; color: var(--text-primary); }
.ludo-hud-tile .l { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.ludo-log { max-height: 160px; overflow-y: auto; background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px; padding: 8px 10px; font-size: 12px; margin-top: 10px; }
.ludo-log-row { padding: 4px 0; border-bottom: 1px dashed var(--border-primary); color: var(--text-secondary); }
.ludo-log-row:last-child { border-bottom: none; color: var(--text-primary); font-weight: 600; }
.ludo-step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.ludo-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.ludo-step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.ludo-step-dot.done { background: #3fb950; }
.ludo-alert { text-align: center; padding: 32px; color: var(--text-secondary); font-size: 15px; }
`;

const COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'];
const COLOR_HEX = { RED: '#ef4444', GREEN: '#22c55e', BLUE: '#3b82f6', YELLOW: '#eab308' };
const START_POS = [0, 13, 26, 39];
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// Ring-track geometry: the shared 52-cell circular track is laid out as the BORDER of a 14x14
// grid (perimeter of a 14x14 square = 4*14-4 = 52 cells exactly), so every one of the backend's
// track positions 0-51 maps onto a real board cell with no approximation. The four corners are
// the four start squares (0, 13, 26, 39) — matching Game.START_POSITIONS exactly.
function ringCellRC(idx) {
  const i = ((idx % 52) + 52) % 52;
  if (i <= 13) return { row: 0, col: i };
  if (i <= 25) return { row: i - 13, col: 13 };
  if (i <= 39) return { row: 13, col: 13 - (i - 26) };
  return { row: 12 - (i - 40), col: 0 };
}

function startColorForIndex(idx) {
  const pi = START_POS.indexOf(idx);
  return pi >= 0 ? COLORS[pi] : null;
}

/**
 * Shared board visualization for both the live Game tab and the isolated Simulation tab — a real
 * 14x14 ring rendering every one of the backend's 52 track cells at its true position, four
 * colored yards for HOME tokens, and a center HUD panel for whose turn / last roll / winner.
 */
function LudoBoard({ game, onTokenClick, selectable }) {
  if (!game) return null;
  const tokens = game.tokens || [];
  const currentPlayer = game.players?.[game.currentPlayerIndex];
  const isOver = game.status === 'FINISHED';

  const trackCells = [];
  for (let i = 0; i < 52; i++) {
    const { row, col } = ringCellRC(i);
    const startColor = startColorForIndex(i);
    const isSafe = SAFE_SPOTS.includes(i) && !startColor;
    trackCells.push(
      <div
        key={`t${i}`}
        className={`ludo-track-cell ${startColor ? `start-${startColor}` : ''} ${isSafe ? 'safe-star' : ''}`}
        style={{ gridRow: row + 1, gridColumn: col + 1 }}
        title={`Cell ${i}${startColor ? ` — ${startColor} start` : ''}${isSafe ? ' — safe' : ''}`}
      >
        {isSafe ? '★' : ''}
      </div>
    );
  }

  const yardSpans = {
    RED: { gridRow: '2 / 8', gridColumn: '2 / 8' },
    GREEN: { gridRow: '2 / 8', gridColumn: '8 / 14' },
    BLUE: { gridRow: '8 / 14', gridColumn: '8 / 14' },
    YELLOW: { gridRow: '8 / 14', gridColumn: '2 / 8' },
  };

  const yards = COLORS.map((color, pi) => {
    const playerTokens = tokens[pi] || [];
    const homeTokens = playerTokens.filter((t) => t.status === 'HOME');
    const isActive = !isOver && game.currentPlayerIndex === pi;
    return (
      <div key={color} className={`ludo-yard ${color}`} style={{ ...yardSpans[color], boxShadow: isActive ? `0 0 0 3px ${COLOR_HEX[color]}` : 'none' }}>
        <div className="ludo-yard-label" style={{ color: COLOR_HEX[color] }}>{game.players?.[pi]?.name || color}</div>
        <div className="ludo-yard-tokens">
          {playerTokens.map((t, ti) => {
            if (t.status !== 'HOME') return <div key={ti} />;
            const canClick = selectable && isActive && game.diceValue === 6;
            return (
              <div
                key={ti}
                className={`ludo-token ${color} ${canClick ? 'clickable' : ''}`}
                style={{ width: 18, height: 18, fontSize: 8 }}
                onClick={() => canClick && onTokenClick?.(pi, ti)}
                title={`${game.players?.[pi]?.name} token ${ti + 1} — HOME${canClick ? ' (click to leave home)' : ''}`}
              >
                {ti + 1}
              </div>
            );
          })}
          {homeTokens.length === 0 && <div style={{ fontSize: 9, opacity: 0.5, gridColumn: '1 / 3' }}>—</div>}
        </div>
      </div>
    );
  });

  const onTrackTokens = [];
  tokens.forEach((playerTokens, pi) => {
    const color = COLORS[pi];
    const byCell = {};
    playerTokens.forEach((t, ti) => {
      if (t.status !== 'ACTIVE') return;
      (byCell[t.position] = byCell[t.position] || []).push(ti);
    });
    Object.entries(byCell).forEach(([cellStr, tokenIdxs]) => {
      const cell = Number(cellStr);
      const { row, col } = ringCellRC(cell);
      tokenIdxs.forEach((ti, stackI) => {
        const isActivePlayer = !isOver && game.currentPlayerIndex === pi;
        const canClick = selectable && isActivePlayer && game.diceValue > 0;
        const offset = tokenIdxs.length > 1 ? (stackI - (tokenIdxs.length - 1) / 2) * 30 : 0;
        onTrackTokens.push(
          <div
            key={`${pi}-${ti}`}
            className={`ludo-token ludo-on-track ${color} ${canClick ? 'clickable' : ''}`}
            style={{
              top: `calc(${(row + 0.5) / 14 * 100}% - 2.8%)`,
              left: `calc(${(col + 0.5) / 14 * 100}% - 2.8% + ${offset}%)`,
            }}
            onClick={() => canClick && onTokenClick?.(pi, ti)}
            title={`${game.players?.[pi]?.name} token ${ti + 1} — cell ${cell}${canClick ? ' (click to move)' : ''}`}
          >
            {ti + 1}
          </div>
        );
      });
    });
  });

  return (
    <div className="ludo-board-wrap">
      <div className="ludo-board">
        {trackCells}
        {yards}
      </div>
      {onTrackTokens}
      <div className="ludo-center">
        {isOver ? (
          <>
            <div className="cur-dice">🏆</div>
            <div className="cur-name">{game.winner} wins!</div>
          </>
        ) : (
          <>
            <div className="cur-name" style={{ color: COLOR_HEX[currentPlayer?.color] }}>{currentPlayer?.name}</div>
            <div className="cur-dice">{game.diceValue > 0 ? DICE_FACES[game.diceValue - 1] : '🎲'}</div>
            <div className="cur-hint">{game.diceValue > 0 ? 'pick a token' : "roll's up"}</div>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerPanel({ game, onTokenClick, selectable }) {
  const tokens = game.tokens || [];
  const isOver = game.status === 'FINISHED';
  return (
    <div className="ludo-players">
      {game.players?.map((p, pi) => {
        const playerTokens = tokens[pi] || [];
        const home = playerTokens.filter((t) => t.status === 'HOME').length;
        const active = playerTokens.filter((t) => t.status === 'ACTIVE').length;
        const finished = playerTokens.filter((t) => t.status === 'FINISHED').length;
        const isActive = !isOver && game.currentPlayerIndex === pi;
        return (
          <div key={p.color} className={`ludo-pcard ${isActive ? 'active' : ''}`} style={{ borderColor: isActive ? COLOR_HEX[p.color] : undefined }}>
            <div className="ludo-pcard-name" style={{ color: COLOR_HEX[p.color] }}>{p.name}</div>
            <div className="ludo-pcard-stats">🏠 {home} · 🎯 {active} · 🏁 {finished}</div>
            <div className="ludo-pcard-tokens">
              {playerTokens.map((t, ti) => {
                const canClick = selectable && isActive && game.diceValue > 0 && t.status !== 'FINISHED' && (t.status === 'ACTIVE' || game.diceValue === 6);
                return (
                  <div
                    key={ti}
                    className={`ludo-mini-token ${p.color} ${canClick ? 'selectable' : ''} ${t.status === 'FINISHED' ? 'finished' : ''}`}
                    onClick={() => canClick && onTokenClick?.(pi, ti)}
                    title={`Token ${ti + 1}: ${t.status}${t.status === 'ACTIVE' ? ` @ ${t.position}` : ''}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GameTab() {
  const [gameId, setGameId] = useState(null);
  const [names, setNames] = useState(['Alice', 'Bob', 'Charlie', 'Diana']);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    const data = await getGame(gameId);
    if (!data.error) setGame(data);
  }, [gameId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStart = async () => {
    setError('');
    const data = await createGame(names);
    if (data.error) setError(data.error);
    else { setGameId(data.id); setGame(data); }
  };

  const handleRoll = async () => {
    if (rolling || !game || game.status === 'FINISHED') return;
    setRolling(true);
    setError('');
    await new Promise((r) => setTimeout(r, 350));
    const data = await rollDice(gameId);
    setRolling(false);
    if (data.error) setError(data.error);
    else setGame(data);
  };

  const handleTokenClick = async (playerIndex, tokenIndex) => {
    setError('');
    const data = await moveToken(gameId, playerIndex, tokenIndex);
    if (data.error) setError(data.error);
    else setGame(data);
  };

  if (!gameId) {
    return (
      <div className="ludo-setup">
        <h2>New Game</h2>
        {names.map((n, i) => (
          <div key={i} className="ludo-form-group">
            <label style={{ color: COLOR_HEX[COLORS[i]] }}>{COLORS[i]}</label>
            <input value={n} onChange={(e) => { const next = [...names]; next[i] = e.target.value; setNames(next); }} />
          </div>
        ))}
        {error && <div className="ludo-error">{error}</div>}
        <button className="ludo-btn" style={{ width: '100%', marginTop: 6 }} onClick={handleStart}>Start Game</button>
      </div>
    );
  }

  if (!game) return <div className="ludo-alert">Loading...</div>;

  const currentPlayer = game.players?.[game.currentPlayerIndex];

  return (
    <div>
      <div className="ludo-topbar">
        {game.status !== 'FINISHED' ? (
          <div className="ludo-turn" style={{ background: COLOR_HEX[currentPlayer?.color] }}>
            {currentPlayer?.name}'s turn
          </div>
        ) : <div />}
        <div className="ludo-dice-wrap">
          <div className={`ludo-dice ${rolling ? 'rolling' : ''}`}>{game.diceValue > 0 ? DICE_FACES[game.diceValue - 1] : '🎲'}</div>
          <button className="ludo-btn" onClick={handleRoll} disabled={rolling || game.status === 'FINISHED' || game.diceValue > 0}>
            {rolling ? 'Rolling…' : 'Roll Dice'}
          </button>
        </div>
      </div>

      {error && <div className="ludo-error">{error}</div>}

      <LudoBoard game={game} onTokenClick={handleTokenClick} selectable />
      <PlayerPanel game={game} onTokenClick={handleTokenClick} selectable />

      {game.status === 'FINISHED' && <div className="ludo-winner">🏆 {game.winner} wins the game!</div>}

      <div className="ludo-actions">
        <button className="ludo-btn-outline" onClick={() => { setGameId(null); setGame(null); setError(''); }}>New Game</button>
      </div>
      <div className="ludo-game-id">Game #{game.id}</div>
    </div>
  );
}

const SIM_STEPS = [
  'Reset sandbox',
  'View seeded board',
  'Roll & leave home',
  'Roll & advance',
  'Trigger a capture',
  'Approach home (exact-count)',
  'Race an extra turn on 6',
  'Review the event log',
];

function SimulationTab() {
  const [game, setGame] = useState(null);
  const [log, setLog] = useState([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const pullLog = async () => {
    const l = await simGetLog();
    if (!l.error && mountedRef.current) setLog(l);
  };

  const doReset = async () => {
    setBusy(true); setError('');
    try {
      const g = await simReset();
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      await pullLog();
      setStep(1);
    } finally { if (mountedRef.current) setBusy(false); }
  };

  const doRoll = async () => {
    setBusy(true); setRolling(true); setError('');
    await new Promise((r) => setTimeout(r, 300));
    try {
      const g = await simRoll();
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      await pullLog();
    } finally { if (mountedRef.current) { setBusy(false); setRolling(false); } }
  };

  const doMove = async (playerIndex, tokenIndex) => {
    setBusy(true); setError('');
    try {
      const g = await simMove(playerIndex, tokenIndex);
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      await pullLog();
      setStep((s) => Math.min(s + 1, SIM_STEPS.length - 1));
    } finally { if (mountedRef.current) setBusy(false); }
  };

  const autoAct = async () => {
    if (!game || busy) return;
    if (game.diceValue === 0) { await doRoll(); return; }
    const pi = game.currentPlayerIndex;
    const playerTokens = game.tokens?.[pi] || [];
    let targetIdx = playerTokens.findIndex((t) => t.status === 'ACTIVE');
    if (targetIdx === -1 && game.diceValue === 6) {
      targetIdx = playerTokens.findIndex((t) => t.status === 'HOME');
    }
    if (targetIdx === -1) { await doRoll(); return; }
    await doMove(pi, targetIdx);
  };

  const reset = () => { setGame(null); setLog([]); setStep(0); setError(''); };

  const finishedCounts = (game?.tokens || []).map((pt) => pt.filter((t) => t.status === 'FINISHED').length);
  const totalCaptures = log.filter((e) => e.description?.includes('captured')).length;

  return (
    <div>
      <div className="ludo-step-indicator">
        {SIM_STEPS.map((s, i) => (
          <div key={s} className={`ludo-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>{SIM_STEPS[step]}</span>
      </div>

      {error && <div className="ludo-error">{error}</div>}

      {!game ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: 13 }}>
            Runs entirely against the isolated <code>/api/ludo/sim/*</code> sandbox — Alice, Bob, Charlie
            and Diana, all four tokens HOME — so nothing here can ever touch a real game.
          </p>
          <button className="ludo-btn" onClick={doReset} disabled={busy}>▶ Reset Sandbox</button>
        </div>
      ) : (
        <>
          <div className="ludo-hud">
            <div className="ludo-hud-tile"><div className="v" style={{ color: COLOR_HEX[game.players?.[game.currentPlayerIndex]?.color] }}>{game.players?.[game.currentPlayerIndex]?.name}</div><div className="l">Turn</div></div>
            <div className="ludo-hud-tile"><div className="v">{game.diceValue > 0 ? `${DICE_FACES[game.diceValue - 1]} ${game.diceValue}` : '—'}</div><div className="l">Last Roll</div></div>
            <div className="ludo-hud-tile"><div className="v">{finishedCounts.join(' / ')}</div><div className="l">Finished (R/G/B/Y)</div></div>
            <div className="ludo-hud-tile"><div className="v">{totalCaptures}</div><div className="l">Captures</div></div>
            <div className="ludo-hud-tile"><div className="v">{game.status}</div><div className="l">Status</div></div>
          </div>

          <LudoBoard game={game} onTokenClick={doMove} selectable={!busy} />
          <PlayerPanel game={game} onTokenClick={doMove} selectable={!busy} />

          {game.status === 'FINISHED' && <div className="ludo-winner">🏆 {game.winner} wins the simulation!</div>}

          <div className="ludo-actions">
            {game.status !== 'FINISHED' && (
              <button className="ludo-btn" onClick={autoAct} disabled={busy}>
                {busy ? 'Working…' : game.diceValue === 0 ? '🎲 Roll' : '➡️ Auto-move'}
              </button>
            )}
            <button className="ludo-btn-outline" onClick={doReset} disabled={busy}>↺ Reset</button>
          </div>

          <div className="ludo-log">
            {log.slice().reverse().map((e) => (
              <div key={e.id} className="ludo-log-row">
                <strong>{e.actor}</strong>: {e.description}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LudoPage() {
  const [tab, setTab] = useState('game');
  const tabs = ['game', 'simulation', 'diagram', 'sequence', 'design'];
  const tabLabels = { game: 'Game', simulation: 'Simulation', diagram: 'Class Diagram', sequence: 'Sequence Diagram', design: 'Design Details' };

  return (
    <div className="ludo-page">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <div className="ludo-header">
        <h1>🎲 Ludo</h1>
        <p>Low-Level Design</p>
      </div>
      <div className="ludo-nav">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{tabLabels[t]}</button>
        ))}
      </div>
      <div className="ludo-main">
        {tab === 'game' && <GameTab />}
        {tab === 'simulation' && <SimulationTab />}
        {tab === 'diagram' && <ClassDiagram module="ludo" />}
        {tab === 'sequence' && <SequenceDiagram module="ludo" />}
        {tab === 'design' && <DesignDetails module="ludo" />}
      </div>
    </div>
  );
}
