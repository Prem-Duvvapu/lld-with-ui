import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createGame, getGame, revealCell, flagCell, simReset, simReveal } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ms-page { max-width: 520px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg-primary); min-height: 100vh; }
.ms-header { text-align: center; margin-bottom: 16px; }
.ms-header h1 { font-size: 26px; color: var(--text-primary); margin-bottom: 4px; }
.ms-header p { color: var(--text-secondary); font-size: 13px; }
.ms-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
.ms-nav button { padding: 6px 14px; border: 2px solid var(--border-primary); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 600; font-size: 12px; transition: all 0.2s; }
.ms-nav button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.ms-main { background: var(--bg-secondary); border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border-primary); }
.ms-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 12px; background: var(--bg-primary); border-radius: 8px; font-size: 13px; font-weight: 600; }
.ms-info span { color: var(--text-primary); }
.ms-board { display: inline-grid; gap: 2px; margin: 0 auto; }
.ms-cell { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; border-radius: 3px; cursor: pointer; transition: all 0.1s; background: var(--cell-bg); border: 1px solid var(--border-primary); color: var(--text-primary); user-select: none; }
.ms-cell:hover { background: var(--cell-hover); }
.ms-cell.revealed { background: var(--cell-revealed); cursor: default; }
.ms-cell.mine { background: #ff4444; color: white; }
.ms-cell.flagged { background: var(--cell-flagged); }
.ms-cell.num-1 { color: #2196f3; }
.ms-cell.num-2 { color: #4caf50; }
.ms-cell.num-3 { color: #f44336; }
.ms-cell.num-4 { color: #9c27b0; }
.ms-cell.num-5 { color: #ff9800; }
.ms-cell.num-6 { color: #00bcd4; }
.ms-cell.num-7 { color: #795548; }
.ms-cell.num-8 { color: #607d8b; }
.ms-btn { padding: 8px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: var(--accent); margin: 4px; }
.ms-btn:hover { opacity: 0.9; }
.back-home { display: inline-block; margin-bottom: 12px; padding: 6px 14px; border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-primary); text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: var(--accent); color: #fff; }
.ms-setup { text-align: center; padding: 20px 0; }
.ms-setup h2 { margin-bottom: 16px; color: var(--text-primary); font-size: 18px; }
.ms-form-group { margin-bottom: 12px; }
.ms-form-group label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 13px; color: var(--text-primary); }
.ms-form-group input { width: 100%; max-width: 200px; padding: 8px 12px; border: 2px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-primary); color: var(--text-primary); }
.ms-form-group select { width: 100%; max-width: 200px; padding: 8px 12px; border: 2px solid var(--border-primary); border-radius: 6px; font-size: 14px; background: var(--bg-primary); color: var(--text-primary); }
.ms-error { color: #f44336; text-align: center; padding: 8px; margin-bottom: 8px; font-size: 13px; }
.ms-win { text-align: center; padding: 12px; background: #4caf50; color: #fff; border-radius: 8px; font-weight: 700; margin-bottom: 8px; }
.ms-lose { text-align: center; padding: 12px; background: #f44336; color: #fff; border-radius: 8px; font-weight: 700; margin-bottom: 8px; }
.ms-scene { background: var(--bg-primary); border-radius: 12px; padding: 16px; border: 1px solid var(--border-primary); margin-bottom: 12px; }
.ms-scene-title { text-align: center; font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.ms-flow-board { display: inline-grid; gap: 2px; margin: 8px auto; }
.ms-flow-cell { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; border-radius: 4px; background: var(--cell-bg); border: 1px solid var(--border-primary); color: var(--text-primary); }
.ms-flow-cell.revealed { background: var(--cell-revealed); }
.ms-flow-cell.mine { background: #ff4444; color: #fff; }
.ms-flow-cell.flagged { background: #ffc107; }
.ms-flow-cell.num-1 { color: #2196f3; }
.ms-flow-cell.num-2 { color: #4caf50; }
.ms-flow-cell.num-3 { color: #f44336; }
.ms-flow-cell.num-4 { color: #9c27b0; }
.ms-flow-cell.num-5 { color: #ff9800; }
.ms-flow-cell.num-6 { color: #00bcd4; }
.ms-flow-cell.num-7 { color: #795548; }
.ms-flow-cell.num-8 { color: #607d8b; }
.ms-step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.ms-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; }
.ms-step-dot.active { background: var(--accent); box-shadow: 0 0 8px rgba(33,150,243,0.5); }
.ms-step-dot.done { background: #4caf50; }
.ms-flow-popup { background: var(--bg-secondary); border-radius: 12px; padding: 16px 20px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.15); border: 2px solid var(--border-primary); margin: 12px auto; max-width: 300px; }
.ms-flow-popup h3 { color: var(--text-primary); margin-bottom: 4px; }
.ms-flow-popup p { color: var(--text-secondary); font-size: 12px; }
.ms-timer { font-family: monospace; font-size: 16px; color: var(--accent); }
`;

function Game({ gameId, onNewGame }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    const data = await getGame(gameId);
    if (!data.error) {
      setGame(data);
      if (data.status !== 'PLAYING') {
        setStarted(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  }, [gameId]);

  useEffect(() => {
    refresh();
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (game && game.status !== 'PLAYING' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [game?.status]);

  const handleReveal = async (row, col) => {
    if (!game || game.status !== 'PLAYING') return;
    const cell = game.board[row][col];
    if (cell.revealed || cell.flagged) return;
    if (!started) setStarted(true);
    const data = await revealCell(gameId, row, col);
    if (data.error) setError(data.error);
    else { setGame(data); setError(''); }
  };

  const handleFlag = async (e, row, col) => {
    e.preventDefault();
    if (!game || game.status !== 'PLAYING') return;
    const cell = game.board[row][col];
    if (cell.revealed) return;
    const data = await flagCell(gameId, row, col);
    if (data.error) setError(data.error);
    else { setGame(data); setError(''); }
  };

  if (!game) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Loading...</div>;

  const board = game.board;
  const minesLeft = game.totalMines - game.flagsUsed;

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="ms-info">
        <span>💣 Mines: {minesLeft}</span>
        <span className="ms-timer">⏱ {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}</span>
        <span>🚩 Flags: {game.flagsUsed}</span>
      </div>

      {game.status === 'WON' && <div className="ms-win">🎉 You Won!</div>}
      {game.status === 'LOST' && <div className="ms-lose">💥 Game Over!</div>}
      {error && <div className="ms-error">{error}</div>}

      <div className="ms-board" style={{ gridTemplateColumns: `repeat(${game.cols}, 36px)` }}>
        {board.map((row, r) => row.map((cell, c) => {
          let cls = 'ms-cell';
          let content = '';
          if (cell.revealed) {
            cls += ' revealed';
            if (cell.mine) { cls += ' mine'; content = '💣'; }
            else if (cell.adjacentMines > 0) { cls += ` num-${cell.adjacentMines}`; content = cell.adjacentMines; }
          } else if (cell.flagged) {
            cls += ' flagged';
            content = '🚩';
          }
          return (
            <div key={`${r}-${c}`} className={cls} onClick={() => handleReveal(r, c)} onContextMenu={(e) => handleFlag(e, r, c)}>
              {content}
            </div>
          );
        }))}
      </div>

      {(game.status !== 'PLAYING' || error) && (
        <div style={{ marginTop: 12 }}>
          <button className="ms-btn" onClick={async () => {
            const data = await createGame(game.rows, game.cols, game.totalMines);
            if (!data.error) { setGame(data); setTime(0); setStarted(false); setError(''); }
          }}>🔄 New Game</button>
          <button className="ms-btn" onClick={onNewGame}>← Back</button>
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revealedCells, setRevealedCells] = useState([]);
  const mountedRef = useRef(true);
  const steps = ['Create', 'Reveal', 'Reveal', 'Reveal', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setGame(null); setBoard(null); setError(''); setRevealedCells([]); };

  // Drives the isolated /api/minesweeper/sim/* engine — a completely separate in-memory game
  // from the "Game" tab (fixed 5x5 board, 3 mines, lazily placed first-click-safe), so replaying
  // the demo can never corrupt a real match.
  const createGameAction = async () => {
    setLoading(true); setError('');
    try {
      const g = await simReset();
      if (!mountedRef.current) return;
      if (g.error) { setError(g.error); return; }
      setGame(g);
      setBoard(g.board);
      setStep(1);
    } catch { if (mountedRef.current) setError('Failed to create game'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const revealAction = async () => {
    if (!game) return;
    setLoading(true); setError('');
    try {
      const boardData = board || game.board;
      let found = false;
      let g = game;
      for (let r = 0; r < 5 && !found; r++) {
        for (let c = 0; c < 5 && !found; c++) {
          const cell = boardData[r][c];
          if (!cell.revealed && !cell.flagged && !cell.mine) {
            const updated = await simReveal(r, c);
            if (!mountedRef.current) return;
            if (updated.error) { setError(updated.error); return; }
            g = updated;
            setGame(updated);
            setBoard(updated.board);
            setRevealedCells(prev => [...prev, { r, c, val: cell.adjacentMines }]);
            found = true;
          }
        }
      }
      if (!mountedRef.current) return;
      if (g.status === 'WON' || g.status === 'LOST') {
        setStep(4);
      } else {
        setStep(s => Math.min(s + 1, 3));
      }
    } catch { if (mountedRef.current) setError('Failed to reveal'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const totalRevealed = game ? game.revealedCount : 0;
  const totalCells = game ? game.rows * game.cols : 25;

  return (
    <div>
      <div className="ms-step-indicator">
        {steps.map((s, i) => (
          <div key={i} className={`ms-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>
          {step === 0 ? 'Start' : step === 4 ? 'Game Over' : `Reveal ${totalRevealed}/${totalCells - (game?.totalMines || 0)}`}
        </span>
      </div>

      {error && <div className="ms-error">{error}<button onClick={reset} style={{ marginLeft: 8, padding: '2px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-primary)' }}>↺ Reset</button></div>}

      {step === 0 && (
        <div style={{ textAlign: 'center' }}>
          <div className="ms-scene">
            <div className="ms-scene-title">💣 Minesweeper Simulation</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: 20 }}>Create a 5x5 game with 3 mines and reveal cells one by one!</p>
          </div>
          <button onClick={() => setStep(1)} style={{ padding: '12px 32px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Start Simulation</button>
        </div>
      )}

      {step === 1 && !game && (
        <div style={{ textAlign: 'center' }}>
          <div className="ms-scene">
            <div className="ms-scene-title" style={{ fontSize: 40, marginBottom: 8 }}>💣</div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>Create a Minesweeper Game</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>5x5 board, 3 mines</p>
          </div>
          <button onClick={createGameAction} disabled={loading} className="ms-btn">💣 Create Game {loading ? '...' : ''}</button>
        </div>
      )}

      {step >= 1 && step <= 3 && game && board && (
        <div>
          <div className="ms-scene">
            <div className="ms-scene-title">💣 Minesweeper {game.status === 'WON' ? '🏆' : game.status === 'LOST' ? '💥' : ''}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="ms-flow-board" style={{ gridTemplateColumns: `repeat(${game.cols}, 40px)` }}>
                {board.map((row, r) => row.map((cell, c) => {
                  let cls = 'ms-flow-cell';
                  let content = '';
                  if (cell.revealed) {
                    cls += ' revealed';
                    if (cell.mine) { cls += ' mine'; content = '💣'; }
                    else if (cell.adjacentMines > 0) { cls += ` num-${cell.adjacentMines}`; content = cell.adjacentMines; }
                  } else if (cell.flagged) {
                    cls += ' flagged';
                    content = '🚩';
                  }
                  return <div key={`${r}-${c}`} className={cls}>{content}</div>;
                }))}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              🚩 {game.flagsUsed} flags | 💣 {game.totalMines} mines | 🔍 {totalRevealed} revealed
            </div>
          </div>

          {game.status === 'PLAYING' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={revealAction} disabled={loading} className="ms-btn">🔍 Reveal Cell {loading ? '...' : ''}</button>
            </div>
          )}
        </div>
      )}

      {step === 4 || game?.status !== 'PLAYING' && step >= 1 ? (
        <div>
          <div className="ms-scene">
            <div className="ms-flow-board" style={{ gridTemplateColumns: `repeat(${game?.cols || 5}, 40px)`, justifyContent: 'center' }}>
              {(board || []).map((row, r) => row.map((cell, c) => {
                let cls = 'ms-flow-cell';
                let content = '';
                if (cell.revealed) {
                  cls += ' revealed';
                  if (cell.mine) { cls += ' mine'; content = '💣'; }
                  else if (cell.adjacentMines > 0) { cls += ` num-${cell.adjacentMines}`; content = cell.adjacentMines; }
                } else if (cell.flagged) {
                  cls += ' flagged';
                  content = '🚩';
                } else if (cell.mine && game?.status === 'LOST') {
                  cls += ' revealed mine';
                  content = '💣';
                }
                return <div key={`${r}-${c}`} className={cls}>{content}</div>;
              }))}
            </div>
          </div>
          <div className="ms-flow-popup">
            <div style={{ fontSize: 36 }}>{game?.status === 'WON' ? '🎉' : '💥'}</div>
            <h3>{game?.status === 'WON' ? 'You Won!' : 'Game Over!'}</h3>
            <p>{game?.status === 'WON' ? 'All non-mine cells revealed!' : 'Hit a mine!'}</p>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={reset} className="ms-btn">🔄 Play Again</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MinesweeperPage() {
  const [tab, setTab] = useState('game');
  const [gameId, setGameId] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');

  const difficultyMap = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 12, cols: 12, mines: 25 },
    expert: { rows: 16, cols: 16, mines: 50 },
  };

  const tabs = ['game', 'simulation', 'diagram', 'sequence', 'design'];
  const tabLabels = { game: 'Game', simulation: 'Simulation', diagram: 'Class Diagram', sequence: 'Sequence Diagram', design: 'Design Details' };

  return (
    <div className="ms-page">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back</Link>
      <div className="ms-header">
        <h1>💣 Minesweeper</h1>
        <p>Low-Level Design</p>
      </div>
      <div className="ms-nav">
        {tabs.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{tabLabels[t]}</button>
        ))}
      </div>
      <div className="ms-main">
        {tab === 'game' && (
          <>
            {!gameId ? (
              <div className="ms-setup">
                <h2>New Game</h2>
                <div className="ms-form-group">
                  <label>Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    <option value="beginner">Beginner (9×9, 10 mines)</option>
                    <option value="intermediate">Intermediate (12×12, 25 mines)</option>
                    <option value="expert">Expert (16×16, 50 mines)</option>
                  </select>
                </div>
                <button className="ms-btn" onClick={async () => {
                  const d = difficultyMap[difficulty];
                  const data = await createGame(d.rows, d.cols, d.mines);
                  if (!data.error) setGameId(data.id);
                }} style={{ padding: '12px 32px', fontSize: 15 }}>Start Game</button>
              </div>
            ) : (
              <Game gameId={gameId} onNewGame={() => setGameId(null)} />
            )}
          </>
        )}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="minesweeper" />}
        {tab === 'sequence' && <SequenceDiagram module="minesweeper" />}
        {tab === 'design' && <DesignDetails module="minesweeper" />}
      </div>
    </div>
  );
}
