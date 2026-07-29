import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createGame, getGame, rollDice } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); color: #eee; min-height: 100vh; }
.app { max-width: 700px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 20px; }
header h1 { font-size: 32px; color: #4ecdc4; text-shadow: 0 0 20px rgba(78,205,196,0.3); }
header p { color: #888; font-size: 14px; }
main { background: rgba(22, 33, 62, 0.95); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05); backdrop-filter: blur(10px); }
.setup { max-width: 300px; margin: 0 auto; }
.setup h2 { margin-bottom: 16px; color: #4ecdc4; font-size: 22px; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }
.form-group input { width: 100%; padding: 12px 14px; border: 2px solid #2a2a4a; border-radius: 10px; font-size: 14px; background: #1a1a3e; color: #eee; transition: border-color 0.3s; }
.form-group input:focus { outline: none; border-color: #4ecdc4; box-shadow: 0 0 0 3px rgba(78,205,196,0.15); }
.btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, #4ecdc4, #44b09e); color: #1a1a2e; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; letter-spacing: 0.5px; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(78,205,196,0.3); }
.game-header { text-align: center; margin-bottom: 16px; }
.game-header h2 { font-size: 24px; background: linear-gradient(135deg, #4ecdc4, #ff6b6b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.game-top-bar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.player-status { display: flex; gap: 10px; flex-wrap: wrap; flex: 1; }
.player-card { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(26, 26, 46, 0.8); border-radius: 10px; border: 2px solid transparent; transition: all 0.3s; min-width: 130px; }
.player-card.active { border-color: #4ecdc4; box-shadow: 0 0 15px rgba(78,205,196,0.2); animation: pulse-glow 1.5s ease-in-out infinite; }
@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 10px rgba(78,205,196,0.2); } 50% { box-shadow: 0 0 20px rgba(78,205,196,0.4); } }
.player-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.player-card .name { font-weight: 700; font-size: 13px; }
.player-card .pos { font-size: 11px; color: #888; margin-top: 2px; }
.dice-section { display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
.dice-btn { padding: 10px 24px; font-size: 15px; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; transition: all 0.3s; letter-spacing: 0.5px; }
.dice-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,107,0.3); }
.dice-btn:disabled { background: #555; cursor: not-allowed; opacity: 0.6; }
.dice-rolling { animation: dice-spin 0.1s linear infinite; }
@keyframes dice-spin { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(90deg) scale(1.1); } 50% { transform: rotate(180deg) scale(1); } 75% { transform: rotate(270deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
.message { text-align: center; padding: 14px 18px; background: rgba(26, 26, 46, 0.9); border-radius: 10px; margin-bottom: 16px; font-size: 14px; border: 1px solid #2a2a4a; animation: fade-slide 0.3s ease-out; }
.message.win { background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,107,0.15)); border-color: #ffd700; font-weight: 700; font-size: 16px; }
@keyframes fade-slide { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.board-wrapper { position: relative; width: 540px; height: 540px; margin: 0 auto 16px; }
.board { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
.board-svg { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 2; }
.cell { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; border-radius: 4px; background: rgba(26, 26, 46, 0.6); border: 1px solid rgba(51, 51, 85, 0.5); position: relative; transition: all 0.2s; cursor: default; }
.cell:hover { background: rgba(26, 26, 46, 0.9); border-color: #4ecdc4; }
.cell.snake { background: rgba(74, 26, 26, 0.5); border-color: rgba(255,107,107,0.3); }
.cell.ladder { background: rgba(26, 60, 26, 0.5); border-color: rgba(78,205,196,0.3); }
.cell.finish { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2)); border-color: #ffd700; }
.cell .label { font-size: 9px; color: rgba(255,255,255,0.5); position: absolute; top: 2px; left: 4px; z-index: 1; }
.cell .cell-bg-num { font-size: 18px; color: rgba(255,255,255,0.05); font-weight: 900; }
.cell .player-indicators { display: flex; gap: 2px; position: absolute; bottom: 2px; right: 2px; z-index: 3; }
.cell .player-dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.8); box-shadow: 0 0 4px rgba(0,0,0,0.5); }
.player-token { position: absolute; z-index: 10; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; color: white; box-shadow: 0 3px 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.2); transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55); pointer-events: none; border: 2px solid rgba(255,255,255,0.6); }
.player-token::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; background: inherit; opacity: 0.3; animation: token-pulse 2s ease-in-out infinite; }
@keyframes token-pulse { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.5); opacity: 0.1; } }
.game-over { text-align: center; padding: 20px; background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,107,0.1)); border-radius: 12px; margin-bottom: 16px; border: 2px solid #ffd700; }
.game-over h3 { font-size: 28px; color: #ffd700; }
.game-actions { display: flex; gap: 8px; margin-top: 16px; }
.game-actions button { flex: 1; padding: 12px; border: 2px solid #4ecdc4; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; background: transparent; color: #4ecdc4; transition: all 0.3s; }
.game-actions button:hover { background: rgba(78,205,196,0.1); transform: translateY(-1px); }
.game-actions .btn-primary { border: none; }
.game-id { text-align: center; font-size: 12px; color: #555; margin-top: 8px; }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #4ecdc4; border-radius: 6px; color: #4ecdc4; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #4ecdc4; color: #1a1a2e; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #3a3a5a; transition: all 0.3s; }
.step-dot.active { background: #667eea; box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: #3fb950; }
.sl-scene { width: 100%; min-height: 400px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 16px; margin-bottom: 12px; overflow: hidden; }
.sl-dice-area { text-align: center; padding: 20px; }
.sl-dice { font-size: 64px; display: inline-block; transition: transform 0.1s; }
.sl-dice.rolling { animation: diceRoll 0.8s ease-out; }
@keyframes diceRoll { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(90deg) scale(1.2); } 50% { transform: rotate(180deg) scale(1); } 75% { transform: rotate(270deg) scale(1.2); } 100% { transform: rotate(360deg) scale(1); } }
.sl-mini-board { display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; max-width: 380px; margin: 0 auto; }
.sl-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 10px; background: rgba(128,128,128,0.05); border: 1px solid rgba(128,128,128,0.2); border-radius: 2px; position: relative; font-weight: 600; color: var(--text-muted); }
.sl-cell.snake { background: rgba(255,107,107,0.15); border-color: #ff6b6b; color: #ff6b6b; }
.sl-cell.ladder { background: rgba(78,205,196,0.15); border-color: #4ecdc4; color: #4ecdc4; }
.sl-cell.goal { background: rgba(255,215,0,0.2); border-color: gold; color: gold; }
.sl-player-token { position: absolute; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); font-size: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.sl-player-card { display: flex; gap: 12px; justify-content: center; margin: 12px 0; flex-wrap: wrap; }
.sl-player-stat { padding: 8px 14px; border-radius: 8px; background: var(--bg-card); border: 2px solid var(--border-primary); font-size: 12px; text-align: center; transition: all 0.3s; min-width: 80px; }
.sl-player-stat.active { border-color: #667eea; box-shadow: 0 0 12px rgba(102,126,234,0.3); }
.sl-msg { text-align: center; font-size: 14px; color: var(--text-secondary); margin: 8px 0; font-weight: 500; }
`;

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
const BOARD_SIZE = 540;
const GAP = 3;
const CELL_SIZE = (BOARD_SIZE - GAP * 9) / 10;

const SNAKE_COLORS = ['#e74c3c', '#c0392b', '#d35400'];
const LADDER_COLORS = ['#27ae60', '#2ecc71', '#1abc9c'];

const SNAKE_PAIRS = [
  { head: 99, tail: 54 }, { head: 95, tail: 75 }, { head: 89, tail: 25 },
  { head: 62, tail: 19 }, { head: 46, tail: 5 }, { head: 34, tail: 1 },
];

const LADDER_PAIRS = [
  { bottom: 2, top: 38 }, { bottom: 7, top: 14 }, { bottom: 8, top: 31 },
  { bottom: 15, top: 26 }, { bottom: 21, top: 42 }, { bottom: 28, top: 84 },
  { bottom: 36, top: 44 }, { bottom: 51, top: 67 }, { bottom: 71, top: 91 },
  { bottom: 78, top: 98 }, { bottom: 87, top: 94 },
];

function getCellCenter(num) {
  const cellRow = Math.floor((num - 1) / 10);
  const displayRow = 9 - cellRow;
  const colInRow = cellRow % 2 === 0 ? (num - 1) % 10 : 9 - (num - 1) % 10;
  return { x: colInRow * (CELL_SIZE + GAP) + CELL_SIZE / 2, y: displayRow * (CELL_SIZE + GAP) + CELL_SIZE / 2 };
}

function DiceFace({ value, rolling }) {
  const dotPositions = {
    1: [[1, 1]], 2: [[0.5, 0.5], [1.5, 1.5]], 3: [[0.5, 0.5], [1, 1], [1.5, 1.5]],
    4: [[0.5, 0.5], [1.5, 0.5], [0.5, 1.5], [1.5, 1.5]],
    5: [[0.5, 0.5], [1.5, 0.5], [1, 1], [0.5, 1.5], [1.5, 1.5]],
    6: [[0.5, 0.5], [1.5, 0.5], [0.5, 1], [1.5, 1], [0.5, 1.5], [1.5, 1.5]],
  };
  const dots = dotPositions[value] || dotPositions[1];
  return (
    <svg width="70" height="70" viewBox="0 0 2 2" className={rolling ? 'dice-rolling' : ''}>
      <rect x="0" y="0" width="2" height="2" rx="0.3" fill="white" stroke="#333" strokeWidth="0.08" />
      {dots.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="0.18" fill="#1a1a2e" />)}
    </svg>
  );
}

function PlayerToken({ name, color, position, boardLeft, boardTop }) {
  const center = position > 0 ? getCellCenter(position) : { x: -20, y: -20 };
  return (
    <div className="player-token" style={{ background: color, left: boardLeft + center.x - 10, top: boardTop + center.y - 10 }} title={name}>
      {name[0]}
    </div>
  );
}

function GameBoard({ gameId, playerNames, onNewGame }) {
  const [game, setGame] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(0);
  const [displayDice, setDisplayDice] = useState(0);
  const [message, setMessage] = useState('');
  const [animPositions, setAnimPositions] = useState({});
  const boardRef = useRef(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    const data = await getGame(gameId);
    if (!data.error) {
      setGame(data);
      if (data.lastMessage) setMessage(data.lastMessage);
      data.players?.forEach((p) => { setAnimPositions((prev) => ({ ...prev, [p.name]: p.position })); });
    }
  }, [gameId]);

  useEffect(() => {
    refresh();
    const i = setInterval(() => { getGame(gameId).then((data) => { if (!data.error) setGame(data); }); }, 3000);
    return () => clearInterval(i);
  }, [gameId, refresh]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const handleRoll = async () => {
    if (rolling || game?.state === 'FINISHED') return;
    setRolling(true);
    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setDisplayDice(Math.floor(Math.random() * 6) + 1);
      if (count >= 12) clearInterval(intervalRef.current);
    }, 80);

    const data = await rollDice(gameId);
    if (!data.error) {
      const val = data.lastDiceValue;
      setDiceValue(val);
      setTimeout(() => { setDisplayDice(val); }, 1000);
      setTimeout(() => {
        setRolling(false);
        setGame(data);
        setMessage(data.lastMessage || '');
        if (data.lastDiceValue > 0) {
          data.players?.forEach((p) => { setAnimPositions((prev) => ({ ...prev, [p.name]: p.position })); });
        }
      }, 1400);
    } else {
      clearInterval(intervalRef.current);
      setRolling(false);
    }
  };

  if (!game) return <div className="alert">Loading...</div>;

  const isOver = game.state === 'FINISHED';
  const cells = [];
  for (let row = 9; row >= 0; row--) {
    const start = row * 10 + 1;
    const nums = [];
    for (let i = 0; i < 10; i++) { nums.push(row % 2 === 0 ? start + i : start + 9 - i); }
    for (const num of nums) {
      const isSnake = SNAKE_PAIRS.some((s) => s.head === num || s.tail === num);
      const isLadder = LADDER_PAIRS.some((l) => l.bottom === num || l.top === num);
      const playersHere = game.players?.filter((p) => animPositions[p.name] === num) || [];
      cells.push(
        <div key={num} className={`cell ${isSnake ? 'snake' : isLadder ? 'ladder' : ''} ${num === 100 ? 'finish' : ''}`}>
          <span className="label">{num}</span>
          {num % 5 === 0 && num !== 100 && <span className="cell-bg-num">{num}</span>}
          <div className="player-indicators">
            {playersHere.map((p) => (
              <div key={p.name} className="player-dot" style={{ background: p.color || COLORS[playerNames.indexOf(p.name) % COLORS.length] }} />
            ))}
          </div>
        </div>
      );
    }
  }

  const snakePaths = SNAKE_PAIRS.map((s) => {
    const from = getCellCenter(s.head);
    const to = getCellCenter(s.tail);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cpX = midX - dy * 0.3;
    const cpY = midY + dx * 0.3;
    return { from, to, path: `M${from.x},${from.y} Q${cpX},${cpY} ${to.x},${to.y}` };
  });

  const ladderPaths = LADDER_PAIRS.map((l) => {
    const bottom = getCellCenter(l.bottom);
    const top = getCellCenter(l.top);
    const angle = Math.atan2(top.y - bottom.y, top.x - bottom.x);
    const spread = 4;
    const perpX = -Math.sin(angle) * spread;
    const perpY = Math.cos(angle) * spread;
    const b1 = { x: bottom.x + perpX, y: bottom.y + perpY };
    const b2 = { x: bottom.x - perpX, y: bottom.y - perpY };
    const t1 = { x: top.x + perpX, y: top.y + perpY };
    const t2 = { x: top.x - perpX, y: top.y - perpY };
    const rungs = 4;
    const rungLines = [];
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      rungLines.push(`M${b1.x + (t1.x - b1.x) * t},${b1.y + (t1.y - b1.y) * t} L${b2.x + (t2.x - b2.x) * t},${b2.y + (t2.y - b2.y) * t}`);
    }
    return { rail1: `M${b1.x},${b1.y} L${t1.x},${t1.y}`, rail2: `M${b2.x},${b2.y} L${t2.x},${t2.y}`, rungs: rungLines.join(' ') };
  });

  const winner = game.winner;

  return (
    <div>
      <div className="game-header"><h2>Snake & Ladders</h2></div>
      <div className="game-top-bar">
        <div className="player-status">
          {game.players?.map((p, i) => (
            <div key={p.name} className={`player-card ${game.currentPlayerIndex === i && !isOver ? 'active' : ''}`}>
              <div className="player-avatar" style={{ background: p.color || COLORS[i] }}>{p.name[0]}</div>
              <div><div className="name">{p.name}</div><div className="pos">Cell {animPositions[p.name] || 0}</div></div>
            </div>
          ))}
        </div>
        <div className="dice-section">
          <DiceFace value={displayDice || 1} rolling={rolling} />
          <button className="dice-btn" onClick={handleRoll} disabled={rolling || isOver}>{rolling ? '...' : isOver ? 'Done' : 'Roll'}</button>
        </div>
      </div>
      {message && <div className={`message ${isOver ? 'win' : ''}`}>{message}</div>}
      <div className="board-wrapper" ref={boardRef}>
        <div className="board">{cells}</div>
        <svg className="board-svg" width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}>
          {ladderPaths.map((lp, i) => (
            <g key={`ladder-${i}`}>
              <path d={lp.rail1} stroke={LADDER_COLORS[i % LADDER_COLORS.length]} strokeWidth="3" fill="none" opacity="0.7" />
              <path d={lp.rail2} stroke={LADDER_COLORS[i % LADDER_COLORS.length]} strokeWidth="3" fill="none" opacity="0.7" />
              {lp.rungs && <path d={lp.rungs} stroke={LADDER_COLORS[i % LADDER_COLORS.length]} strokeWidth="2" fill="none" opacity="0.6" />}
            </g>
          ))}
          {snakePaths.map((sp, i) => (
            <g key={`snake-${i}`}>
              <path d={sp.path} stroke={SNAKE_COLORS[i % SNAKE_COLORS.length]} strokeWidth="4" fill="none" opacity="0.8" strokeDasharray="6,3" />
              <circle cx={sp.to.x} cy={sp.to.y} r="5" fill={SNAKE_COLORS[i % SNAKE_COLORS.length]} opacity="0.8" />
            </g>
          ))}
        </svg>
        {game.players?.map((p) => (
          <PlayerToken key={p.name} name={p.name} color={p.color || COLORS[playerNames.indexOf(p.name) % COLORS.length]} position={animPositions[p.name] || 0} boardLeft={0} boardTop={0} />
        ))}
      </div>
      {isOver && (
        <div className="game-over"><h3>🏆 {winner?.name} Wins!</h3></div>
      )}
      <div className="game-actions">
        <button className="btn-primary" onClick={onNewGame}>New Game</button>
      </div>
      <div className="game-id">Game: {gameId}</div>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [game, setGame] = useState(null);
  const [diceValue, setDiceValue] = useState(null);
  const [msg, setMsg] = useState('');
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa502'];
  const steps = ['Start', 'Play', 'Win'];

  const snakeCells = [99, 95, 89, 62, 46, 34];
  const ladderCells = [2, 7, 8, 15, 21, 28, 36, 51, 71, 78, 87];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setGame(null); setDiceValue(null); setMsg(''); setError(''); setRolling(false); };

  const startSim = async () => {
    setError(''); setStep(1);
    try {
      const g = await createGame(['Player 1', 'Player 2']);
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g); setMsg('Game started! 🎲');
      
      let currentGame = g;
      while (currentGame.state !== 'FINISHED' && currentGame.state !== 'COMPLETED') {
        await new Promise(r => setTimeout(r, 1800));
        if (!mountedRef.current) return;
        setRolling(true);
        await new Promise(r => setTimeout(r, 600));
        if (!mountedRef.current) return;
        const rolled = await rollDice(currentGame.id);
        if (!mountedRef.current) return;
        if (rolled.error) { setError(rolled.error); return; }
        setRolling(false);
        setDiceValue(rolled.lastDiceValue);
        currentGame = rolled;
        setGame(rolled);
        const prevIdx = (rolled.currentPlayerIndex - 1 + rolled.players.length) % rolled.players.length;
        const playerName = rolled.players[prevIdx]?.name || '';
        setMsg(`${playerName} rolled a ${rolled.lastDiceValue}!`);
        if (rolled.winner) { setMsg(`🎉 ${rolled.winner?.name || rolled.winner} wins!`); break; }
      }
      if (!mountedRef.current) return;
      setStep(2);
    } catch { if (mountedRef.current) { setError('Simulation failed'); } }
  };

  const players = game?.players || [];
  const winner = game?.winner;
  const diceFace = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  const cellNum = (idx) => {
    const row = Math.floor(idx / 10);
    const col = idx % 10;
    return row % 2 === 0 ? (row * 10) + col + 1 : (row * 10) + (9 - col) + 1;
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="sl-scene">
        <div className="sl-dice-area">
          <div className={`sl-dice ${rolling ? 'rolling' : ''}`}>
            {diceValue ? diceFace[diceValue - 1] : '🎲'}
          </div>
        </div>

        <div className="sl-msg">{msg}</div>

        <div className="sl-mini-board">
          {Array.from({ length: 100 }).map((_, i) => {
            const num = cellNum(i);
            let cls = 'sl-cell';
            if (snakeCells.includes(num)) cls += ' snake';
            if (ladderCells.includes(num)) cls += ' ladder';
            if (num === 100) cls += ' goal';
            return (
              <div key={num} className={cls}>
                {num}
                {players.map((p, pi) => (p.position || p.currentCell) === num && (
                  <div key={p.name} className="sl-player-token" style={{ background: colors[pi % colors.length], bottom: pi * 14 + 2, right: 2, fontSize: 7 }}>
                    {p.name[0]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="sl-player-card">
          {players.map((p, i) => (
            <div key={p.name} className={`sl-player-stat ${game?.players?.[game?.currentPlayerIndex]?.name === p.name ? 'active' : ''}`}>
              <div style={{ color: colors[i % colors.length], fontWeight: 700 }}>{p.name}</div>
              <div>Cell: {p.position || p.currentCell || 1}</div>
            </div>
          ))}
        </div>

        {step === 2 && winner && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#667eea' }}>{winner?.name || winner} Wins!</div>
            <button onClick={reset} style={{ marginTop: 10, padding: '8px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🔄 New Game</button>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#f85149', fontSize: 14, textAlign: 'center', margin: '8px 0' }}>{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}

      {step === 0 && <button onClick={startSim} style={{ display: 'block', margin: '12px auto', padding: '12px 32px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Auto-Play Game</button>}
    </div>
  );
}

export default function SnakeLaddersPage() {
  const [gameId, setGameId] = useState(null);
  const [players, setPlayers] = useState(['Player 1', 'Player 2']);
  const [tab, setTab] = useState('setup');

  const tabs = ['setup', 'simulation', 'diagram', 'design'];
  const tabLabels = { setup: 'Game', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header>
        <h1>Snake & Ladders</h1>
        <p>Low-Level Design</p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', border: `1px solid ${tab === t ? '#4ecdc4' : '#2a2a4a'}`, borderRadius: 6, background: tab === t ? 'rgba(78,205,196,0.15)' : 'transparent', color: tab === t ? '#4ecdc4' : '#888', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </header>
      <main>
        {tab === 'setup' && (
          !gameId ? (
            <div className="setup">
              <h2>New Game</h2>
              {players.map((p, i) => (
                <div key={i} className="form-group">
                  <label>Player {i + 1}</label>
                  <input value={p} onChange={(e) => { const next = [...players]; next[i] = e.target.value; setPlayers(next); }} />
                </div>
              ))}
              <button className="btn-primary" onClick={async () => { const data = await createGame(players); if (!data.error) setGameId(data.id); }}>Start Game</button>
            </div>
          ) : (
            <GameBoard gameId={gameId} playerNames={players} onNewGame={() => setGameId(null)} />
          )
        )}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="snakeladders" />}
        {tab === 'design' && <DesignDetails module="snakeladders" />}
      </main>
    </div>
  );
}
