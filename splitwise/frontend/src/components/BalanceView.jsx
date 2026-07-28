import { useState, useEffect } from 'react';
import { getBalances, getTransactions, getUsers } from '../api';

export default function BalanceView({ user, onBack, onSettle }) {
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getBalances(user.id), getTransactions(user.id), getUsers()])
      .then(([balData, txData, usersData]) => {
        setBalances(balData || {});
        setTransactions(txData || []);
        setUsers(usersData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [user.id]);

  const getUserId = (name) => {
    const u = users.find((x) => x.name === name);
    return u ? u.id : null;
  };

  const balanceEntries = Object.entries(balances).filter(([, amount]) => amount !== 0);

  if (loading) return <div className="sw-loading">Loading balances...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to groups</button>
      <div className="sw-section-title">Your Balances</div>

      {balanceEntries.length === 0 && (
        <div className="sw-loading">No balances to show</div>
      )}

      <div className="sw-grid">
        {balanceEntries.map(([otherName, amount]) => {
          const otherId = getUserId(otherName);
          return (
            <div key={otherName} className="sw-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sw-card-title">{otherName}</span>
                <span className={amount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>
                  {amount > 0 ? '+' : ''}${Math.abs(amount).toFixed(2)}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#999' }}>
                {amount > 0 ? 'owes you' : 'you owe'}
              </span>
              {otherId && (
                <button
                  className="sw-btn"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => onSettle(otherId)}
                >
                  Settle Up
                </button>
              )}
            </div>
          );
        })}
      </div>

      {transactions.length > 0 && (
        <div className="sw-transactions">
          <div className="sw-section-title">Transaction History</div>
          {transactions.map((tx, i) => (
            <div key={i} className="sw-transaction-item">
              <span>{tx.description || `${tx.type} - $${tx.amount}`}</span>
              <span style={{ fontWeight: 600 }}>${tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
