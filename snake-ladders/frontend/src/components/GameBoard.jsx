import { useState, useEffect, useCallback, useRef } from 'react';
import { getGame, rollDice } from '../api';

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
const BOARD_SIZE = 540;
const GAP = 3;
const CELL_SIZE = (BOARD_SIZE - GAP * 9) / 10;

const SNAKE_COLORS = ['#e74c3c', '#c0392b', '#d35400'];
const LADDER_COLORS = ['#27ae60', '#2ecc71', '#1abc9c'];

function getCellCenter(num) {
  const cellRow = Math.floor((num - 1) / 10);
  const displayRow = 9 - cellRow;
  const colInRow = cellRow % 2 === 0 ? (num - 1) % 10 : 9 - (num - 1) % 10;
  return {
    x: colInRow * (CELL_SIZE + GAP) + CELL_SIZE / 2,
    y: displayRow * (CELL_SIZE + GAP) + CELL_SIZE / 2,
  };
}

function getCellLabel(num) {
  return num;
}

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

function DiceFace({ value, rolling }) {
  const dotPositions = {
    1: [[1, 1]],
    2: [[0.5, 0.5], [1.5, 1.5]],
    3: [[0.5, 0.5], [1, 1], [1.5, 1.5]],
    4: [[0.5, 0.5], [1.5, 0.5], [0.5, 1.5], [1.5, 1.5]],
    5: [[0.5, 0.5], [1.5, 0.5], [1, 1], [0.5, 1.5], [1.5, 1.5]],
    6: [[0.5, 0.5], [1.5, 0.5], [0.5, 1], [1.5, 1], [0.5, 1.5], [1.5, 1.5]],
  };
  const dots = dotPositions[value] || dotPositions[1];

  return (
    <svg width="70" height="70" viewBox="0 0 2 2" className={rolling ? 'dice-rolling' : ''}>
      <rect x="0" y="0" width="2" height="2" rx="0.3" fill="white" stroke="#333" strokeWidth="0.08" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="0.18" fill="#1a1a2e" />
      ))}
    </svg>
  );
}

function PlayerToken({ name, color, position, boardLeft, boardTop }) {
  const center = position > 0 ? getCellCenter(position) : { x: -20, y: -20 };
  return (
    <div
      className="player-token"
      style={{
        background: color,
        left: boardLeft + center.x - 10,
        top: boardTop + center.y - 10,
      }}
      title={name}
    >
      {name[0]}
    </div>
  );
}

export default function GameBoard({ gameId, playerNames, onNewGame }) {
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
      data.players?.forEach((p) => {
        setAnimPositions((prev) => ({ ...prev, [p.name]: p.position }));
      });
    }
  }, [gameId]);

  useEffect(() => {
    refresh();
    const i = setInterval(() => {
      getGame(gameId).then((data) => {
        if (!data.error) setGame(data);
      });
    }, 3000);
    return () => clearInterval(i);
  }, [gameId, refresh]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleRoll = async () => {
    if (rolling || game?.state === 'FINISHED') return;
    setRolling(true);

    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setDisplayDice(Math.floor(Math.random() * 6) + 1);
      if (count >= 12) {
        clearInterval(intervalRef.current);
      }
    }, 80);

    const data = await rollDice(gameId);
    if (!data.error) {
      const val = data.lastDiceValue;
      setDiceValue(val);

      setTimeout(() => {
        setDisplayDice(val);
      }, 1000);

      setTimeout(() => {
        setRolling(false);
        setGame(data);
        setMessage(data.lastMessage || '');

        if (data.lastDiceValue > 0) {
          data.players?.forEach((p) => {
            setAnimPositions((prev) => ({ ...prev, [p.name]: p.position }));
          });
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
    for (let i = 0; i < 10; i++) {
      nums.push(row % 2 === 0 ? start + i : start + 9 - i);
    }
    for (const num of nums) {
      const isSnake = SNAKE_PAIRS.some((s) => s.head === num || s.tail === num);
      const isLadder = LADDER_PAIRS.some((l) => l.bottom === num || l.top === num);
      const playersHere = game.players?.filter((p) => animPositions[p.name] === num) || [];

      cells.push(
        <div key={num}
             className={`cell ${isSnake ? 'snake' : isLadder ? 'ladder' : ''} ${num === 100 ? 'finish' : ''}`}>
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
      const rx1 = b1.x + (t1.x - b1.x) * t;
      const ry1 = b1.y + (t1.y - b1.y) * t;
      const rx2 = b2.x + (t2.x - b2.x) * t;
      const ry2 = b2.y + (t2.y - b2.y) * t;
      rungLines.push(`M${rx1},${ry1} L${rx2},${ry2}`);
    }

    return {
      rail1: `M${b1.x},${b1.y} L${t1.x},${t1.y}`,
      rail2: `M${b2.x},${b2.y} L${t2.x},${t2.y}`,
      rungs: rungLines.join(' '),
    };
  });

  const winner = game.winner;

  return (
    <div>
      <div className="game-header">
        <h2>Snake & Ladders</h2>
      </div>

      <div className="game-top-bar">
        <div className="player-status">
          {game.players?.map((p, i) => (
            <div key={p.name} className={`player-card ${game.currentPlayerIndex === i && !isOver ? 'active' : ''}`}>
              <div className="player-avatar" style={{ background: p.color || COLORS[i] }}>
                {p.name[0]}
              </div>
              <div>
                <div className="name">{p.name}</div>
                <div className="pos">Cell {animPositions[p.name] || 0}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="dice-section">
          <DiceFace value={displayDice || 1} rolling={rolling} />
          <button className="dice-btn" onClick={handleRoll} disabled={rolling || isOver}>
            {rolling ? '...' : isOver ? 'Done' : 'Roll'}
          </button>
        </div>
      </div>

      {message && <div className={`message ${isOver ? 'win' : ''}`}>{message}</div>}

      <div className="board-wrapper" ref={boardRef}>
        <div className="board">
          {cells}
        </div>

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
              <path d={sp.path} stroke={SNAKE_COLORS[i % SNAKE_COLORS.length]} strokeWidth="4" fill="none" opacity="0.8"
                    strokeDasharray="6,3" />
              <circle cx={sp.to.x} cy={sp.to.y} r="5" fill={SNAKE_COLORS[i % SNAKE_COLORS.length]} opacity="0.8" />
            </g>
          ))}
        </svg>

        {game.players?.map((p) => (
          <PlayerToken
            key={p.name}
            name={p.name}
            color={p.color || COLORS[playerNames.indexOf(p.name) % COLORS.length]}
            position={animPositions[p.name] || 0}
            boardLeft={0}
            boardTop={0}
          />
        ))}
      </div>

      {isOver && (
        <div className="game-over">
          <h3>🏆 {winner?.name} Wins!</h3>
        </div>
      )}

      <div className="game-actions">
        <button className="btn-primary" onClick={onNewGame}>New Game</button>
      </div>

      <div className="game-id">Game: {gameId}</div>
    </div>
  );
}
