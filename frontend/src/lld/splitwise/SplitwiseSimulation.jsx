import * as api from './api';
import SimulationControls from '../../components/SimulationControls';
import { useSimulationPlayback } from '../../hooks/useSimulationPlayback';
import '../../components/SimulationPanel.css';
import './SplitwiseSimulation.css';

const STEPS = [
  { title: 'Prepare the expense sandbox', detail: 'Clear the previous simulation’s users, expenses, settlements, and ledger.' },
  { title: 'Create four participants', detail: 'Create Alice, Bob, Charlie, and Diana using the sandbox API.' },
  { title: 'Create the trip group', detail: 'Add all four participants to Goa Trip 2026.' },
  { title: 'Split the hotel equally', detail: 'Alice pays ₹4,000. The server resolves equal shares for all group members.' },
  { title: 'Split dinner by percentage', detail: 'Bob pays ₹1,200. Shares are Alice 20%, Bob 40%, Charlie 20%, and Diana 20%.' },
  { title: 'Split the cab by exact amounts', detail: 'Charlie pays ₹800. Each member’s exact share is ₹200.' },
  { title: 'Simplify the debt graph', detail: 'Read the server’s suggested settlements. These preserve balances while reducing transfers.' },
  { title: 'Record Diana’s settlement', detail: 'Diana pays Alice ₹1,000. Refresh the ledger and suggested settlements after payment.' },
  { title: 'Check the final ledger', detail: 'Read balances, remaining suggested transfers, and the full activity log.' },
];

export default function SplitwiseSimulation() {
  const playback = useSimulationPlayback(STEPS.length, async (index, previous) => {
    let users = previous?.users || [];
    let group = previous?.group || null;
    let expense = previous?.expense || null;
    let settlement = previous?.settlement || null;
    let debts = previous?.debts || [];
    if (index === 0) {
      await api.simReset();
      users = [];
      group = null;
      expense = null;
      settlement = null;
      debts = [];
    }
    if (index === 1) {
      users = [];
      for (const name of ['Alice', 'Bob', 'Charlie', 'Diana']) users.push(await api.simCreateUser(name, `${name.toLowerCase()}@sim.com`));
    }
    if (index === 2) group = await api.simCreateGroup('Goa Trip 2026', users.map(user => user.id));
    if (index === 3) expense = await api.simAddExpense('Hotel Booking', 4000, users[0].id, group.id, []);
    if (index === 4) expense = await api.simAddExpense('Beach Dinner', 1200, users[1].id, group.id, users.map((user, position) => ({ userId: user.id, type: 'PERCENTAGE', percentage: position === 1 ? 40 : 20 })));
    if (index === 5) expense = await api.simAddExpense('Cab Fare', 800, users[2].id, group.id, users.map(user => ({ userId: user.id, type: 'EXACT', amount: 200 })));
    if (index === 7) settlement = await api.simSettleUp(users[3].id, users[0].id, group.id, 1000);
    if (index >= 6) debts = await api.simGetSimplifiedDebts(group.id);
    const [balances, events] = await Promise.all([api.simGetBalances(), api.simGetEvents()]);
    return { users, group, expense, settlement, debts, balances, events };
  });
  const { users = [], group, expense, settlement, debts = [], balances = {}, events = [] } = playback.result || {};

  return (
    <div className="simulation-panel splitwise-simulation">
      <SimulationControls steps={STEPS} playback={playback} />
      <div className="splitwise-sim-scene" aria-hidden="true">
        <svg viewBox="0 0 600 300">
          {group && <g stroke="#818cf8" strokeWidth="2" strokeDasharray="8 6"><path d="M110 65 L300 150 L490 65" /><path d="M110 235 L300 150 L490 235" /></g>}
          {users.map((user, position) => <g key={user.id} transform={`translate(${position % 2 ? 490 : 110},${position < 2 ? 65 : 235})`}>
            <circle r="36" fill={['#4f46e5', '#7c3aed', '#be185d', '#0369a1'][position]} stroke="#c4b5fd" strokeWidth="2" />
            <text textAnchor="middle" y="6" fill="#fff" fontSize="20" fontWeight="700">{user.name.slice(0, 1)}</text>
            <text textAnchor="middle" y="55" fill="#fff" fontSize="15">{user.name}</text>
          </g>)}
          {group && <g><rect x="215" y="110" width="170" height="80" rx="12" fill="#4338ca" /><text x="300" y="147" fill="#fff" textAnchor="middle" fontSize="16">Goa Trip</text><text x="300" y="170" fill="#ddd6fe" textAnchor="middle" fontSize="13">4 participants</text></g>}
          {!users.length && <text x="300" y="150" fill="#cbd5e1" textAnchor="middle" fontSize="16">Create participants to begin</text>}
        </svg>
      </div>
      <section className="simulation-panel-card" aria-label="Expense ledger summary">
        <h3>{playback.done ? 'Final expense ledger' : group?.name || 'Trip participants'}</h3>
        {expense && <p>Latest expense: <strong>{expense.description} · ₹{expense.amount?.toFixed(2)}</strong> · Paid by {expense.paidBy?.name} · {expense.splits?.[0]?.type || 'EQUAL'} split.</p>}
        {settlement && <p className="simulation-panel-note">Settlement recorded: {settlement.fromUser?.name} paid {settlement.toUser?.name} ₹{settlement.amount?.toFixed(2)}.</p>}
        <div className="simulation-panel-grid">
          {users.map(user => <div key={user.id}><h4>{user.name}</h4>
            {Object.entries(balances[user.name] || {}).map(([other, amount]) => <p key={other}>{amount >= 0 ? 'Receives from' : 'Owes'} {other}: ₹{Math.abs(amount).toFixed(2)}</p>)}
            {!Object.keys(balances[user.name] || {}).length && <p>No balances recorded.</p>}
          </div>)}
        </div>
        {playback.completed >= 7 && <>
          <h4 className="splitwise-sim-transfer-title">Suggested remaining transfers</h4>
          <ul>{debts.map((debt, position) => <li key={position}>{debt.fromUser?.name} → {debt.toUser?.name}: ₹{debt.amount?.toFixed(2)}</li>)}</ul>
          {!debts.length && <p>No suggested transfers remain.</p>}
        </>}
      </section>
      <details className="simulation-panel-card" open>
        <summary>Sandbox activity ({events.length})</summary>
        <ol>{events.slice().reverse().map(event => <li key={event.id}><strong>{event.type}</strong> · {event.actor}<p>{event.description}</p></li>)}</ol>
      </details>
    </div>
  );
}
