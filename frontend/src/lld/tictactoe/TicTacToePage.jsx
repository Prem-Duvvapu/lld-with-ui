import { useState } from 'react';
import { createGame, makeMove, resetGame } from './api';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/ToastContext';

const TTT_CSS = `
.ttt-container { max-width: 500px; margin: 0 auto; }
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 320px; margin: 0 auto 16px; }
.cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; background: var(--bg-tertiary); border: 2px solid var(--border-primary); border-radius: var(--radius-md); cursor: pointer; transition: all var(--duration-fast); color: var(--text-primary); }
.cell:hover:not(.disabled) { background: var(--border-primary); transform: scale(1.02); }
.cell.x { color: var(--accent); }
.cell.o { color: var(--danger); }
.cell.disabled { cursor: not-allowed; opacity: 0.9; }

.game-over-box { text-align: center; padding: 16px; background: var(--success-bg); border-radius: var(--radius-md); border: 1px solid var(--success); margin-bottom: 16px; }
.game-over-box.draw { background: var(--warning-bg); border-color: var(--warning); }

.ttt-flow-players { display: flex; justify-content: center; gap: 16px; margin-bottom: 16px; }
.ttt-flow-player-card { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-primary); background: var(--bg-card); transition: all 0.3s; }
.ttt-flow-player-card.active-x { border-color: var(--accent); background: rgba(102, 126, 234, 0.15); }
.ttt-flow-player-card.active-o { border-color: var(--danger); background: var(--danger-bg); }
`;

function GameBoard() {
  const toast = useToast();
  const [player1, setPlayer1] = useState('Alice');
  const [player2, setPlayer2] = useState('Bob');
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStartGame = async (e) => {
    e.preventDefault();
    if (!player1.trim() || !player2.trim()) return;
    setLoading(true);
    try {
      const data = await createGame(player1.trim(), player2.trim());
      setGame(data);
      toast.success('Game started! X goes first.');
    } catch (err) {
      toast.error(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = async (row, col) => {
    if (!game || game.status !== 'IN_PROGRESS') return;
    const currentSymbol = game.currentTurn;
    const currentPlayer = currentSymbol === 'X' ? game.player1 : game.player2;

    try {
      const updated = await makeMove(game.id, row, col, currentPlayer);
      setGame(updated);
      if (updated.status === 'WON') {
        toast.success(`🎉 ${updated.winner} wins!`);
      } else if (updated.status === 'DRAW') {
        toast.info('Game ended in a Draw!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid move');
    }
  };

  const handleReset = async () => {
    if (!game) return;
    try {
      const updated = await resetGame(game.id);
      setGame(updated);
      toast.info('Game board reset');
    } catch (err) {
      toast.error(err.message || 'Failed to reset board');
    }
  };

  return (
    <div className="ttt-container">
      <Card>
        <CardBody>
          {!game ? (
            <form onSubmit={handleStartGame}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: 'center', color: 'var(--text-primary)' }}>
                New 2-Player Game
              </h3>
              <Input
                label="Player 1 (X)"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                required
              />
              <Input
                label="Player 2 (O)"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 12 }}>
                Start Game
              </Button>
            </form>
          ) : (
            <div>
              <div className="ttt-flow-players">
                <div className={`ttt-flow-player-card ${game.currentTurn === 'X' && game.status === 'IN_PROGRESS' ? 'active-x' : ''}`}>
                  <strong style={{ color: 'var(--accent)' }}>X: {game.player1}</strong>
                </div>
                <div className={`ttt-flow-player-card ${game.currentTurn === 'O' && game.status === 'IN_PROGRESS' ? 'active-o' : ''}`}>
                  <strong style={{ color: 'var(--danger)' }}>O: {game.player2}</strong>
                </div>
              </div>

              {game.status === 'IN_PROGRESS' && (
                <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Current Turn: <Badge variant={game.currentTurn === 'X' ? 'accent' : 'danger'}>{game.currentTurn} ({game.currentTurn === 'X' ? game.player1 : game.player2})</Badge>
                </div>
              )}

              {game.status === 'WON' && (
                <div className="game-over-box">
                  <h3 style={{ fontSize: 20, color: 'var(--success)', marginBottom: 4 }}>🎉 Winner: {game.winner}!</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Congratulations!</p>
                </div>
              )}

              {game.status === 'DRAW' && (
                <div className="game-over-box draw">
                  <h3 style={{ fontSize: 20, color: 'var(--warning)', marginBottom: 4 }}>🤝 It's a Draw!</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Well played by both players!</p>
                </div>
              )}

              <div className="board">
                {(game.board || Array.from({ length: 3 }, () => Array(3).fill(''))).map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`cell ${val === 'X' ? 'x' : val === 'O' ? 'o' : ''} ${game.status !== 'IN_PROGRESS' || val ? 'disabled' : ''}`}
                      onClick={() => handleCellClick(rIdx, cIdx)}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={handleReset} style={{ flex: 1 }}>
                  Reset Board
                </Button>
                <Button variant="ghost" onClick={() => setGame(null)}>
                  New Game
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function TicTacToePage() {
  return (
    <LldPage
      module="tictactoe"
      title="Tic Tac Toe Game"
      icon="❌"
      tabs={['app', 'diagram', 'design']}
    >
      {() => (
        <div className="ttt-container">
          <style>{TTT_CSS}</style>
          <GameBoard />
        </div>
      )}
    </LldPage>
  );
}
