import { useState, useEffect } from 'react';
import { getBalances, getUsers, settleUp, getGroups } from '../api';

export default function SettleUp({ user, onBack, onSettled }) {
  const [balances, setBalances] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getBalances(user.id), getUsers(), getGroups()])
      .then(([balData, usersData, groupsData]) => {
        setBalances(balData || {});
        setAllUsers(usersData);
        setGroups(groupsData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [user.id]);

  const getUserId = (name) => {
    const u = allUsers.find((x) => x.name === name);
    return u ? u.id : null;
  };

  const balanceEntries = Object.entries(balances).filter(([, amount]) => amount !== 0);

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedGroupId || !amount || parseFloat(amount) <= 0) {
      setError('Please fill all fields');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await settleUp(user.id, Number(selectedUserId), Number(selectedGroupId), parseFloat(amount));
      setSuccess('Settled up successfully!');
      setTimeout(() => onSettled(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const userGroups = groups.filter((g) => g.members && g.members.some((m) => m.id === user.id));

  if (loading) return <div className="sw-loading">Loading...</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to balances</button>
      <div className="sw-section-title">Settle Up</div>

      {balanceEntries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Outstanding balances:</div>
          {balanceEntries.map(([otherName, balAmount]) => {
            const otherId = getUserId(otherName);
            return (
              <div key={otherName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>{otherName}</span>
                <span className={balAmount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>
                  {balAmount > 0 ? '+' : ''}${Math.abs(balAmount).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="sw-error">{error}</div>}
      {success && <div className="sw-success">{success}</div>}

      <form className="sw-settle-section" onSubmit={handleSettle}>
        <label>Settle with</label>
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Select user</option>
          {allUsers.filter((u) => u.id !== user.id).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <label>In group</label>
        <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
          <option value="">Select group</option>
          {userGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />

        <button type="submit" className="sw-btn" disabled={submitting}>
          {submitting ? 'Settling...' : 'Settle Up'}
        </button>
      </form>
    </div>
  );
}
