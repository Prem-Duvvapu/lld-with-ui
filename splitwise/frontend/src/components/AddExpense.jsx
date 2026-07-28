import { useState, useEffect } from 'react';
import { addExpense, getUsers } from '../api';

export default function AddExpense({ user, group, onBack, onExpenseAdded }) {
  const [members, setMembers] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(user.id);
  const [splitType, setSplitType] = useState('EQUAL');
  const [splits, setSplits] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUsers().then((all) => {
      const groupMembers = all.filter((u) =>
        group.members && group.members.some((m) => m.id === u.id)
      );
      setMembers(groupMembers);
      const initial = {};
      groupMembers.forEach((m) => { initial[m.id] = ''; });
      setSplits(initial);
    }).catch(setError);
  }, [group]);

  const handleAmountChange = (val) => {
    setAmount(val);
    if (splitType === 'EQUAL' && parseFloat(val) > 0 && members.length > 0) {
      const share = (parseFloat(val) / members.length).toFixed(2);
      const updated = {};
      members.forEach((m) => { updated[m.id] = share; });
      setSplits(updated);
    }
  };

  const handleSplitTypeChange = (type) => {
    setSplitType(type);
    const parsedAmount = parseFloat(amount);
    if (type === 'EQUAL' && parsedAmount > 0 && members.length > 0) {
      const share = (parsedAmount / members.length).toFixed(2);
      const updated = {};
      members.forEach((m) => { updated[m.id] = share; });
      setSplits(updated);
    } else {
      const updated = {};
      members.forEach((m) => { updated[m.id] = ''; });
      setSplits(updated);
    }
  };

  const updateSplit = (memberId, val) => {
    setSplits({ ...splits, [memberId]: val });
  };

  const validateSplits = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid amount';

    if (splitType === 'EQUAL') return null;

    if (splitType === 'PERCENTAGE') {
      const total = Object.values(splits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(total - 100) > 0.01) return 'Percentages must sum to 100';
      return null;
    }

    if (splitType === 'EXACT') {
      const total = Object.values(splits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(total - parsedAmount) > 0.01) return 'Exact amounts must sum to ' + parsedAmount;
      return null;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateSplits();
    if (validationError) {
      setError(validationError);
      return;
    }

    const splitEntries = members.map((m) => {
      if (splitType === 'EQUAL') {
        return { userId: m.id, type: 'EQUAL' };
      }
      if (splitType === 'PERCENTAGE') {
        const pct = parseFloat(splits[m.id]) || 0;
        return { userId: m.id, type: 'PERCENTAGE', percentage: pct, amount: 0 };
      }
      return { userId: m.id, type: 'EXACT', amount: parseFloat(splits[m.id]) || 0, percentage: 0 };
    });

    setSubmitting(true);
    setError(null);
    try {
      await addExpense(description, parseFloat(amount), paidBy, group.id, splitEntries);
      onExpenseAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to groups</button>
      <div className="sw-section-title">Add Expense in {group.name}</div>
      {error && <div className="sw-error">{error}</div>}
      <form className="sw-expense-form" onSubmit={handleSubmit}>
        <label>Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this expense for?"
          required
        />

        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0.00"
          required
        />

        <label>Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (you)' : ''}</option>
          ))}
        </select>

        <label>Split type</label>
        <select value={splitType} onChange={(e) => handleSplitTypeChange(e.target.value)}>
          <option value="EQUAL">Equal</option>
          <option value="PERCENTAGE">Percentage</option>
          <option value="EXACT">Exact</option>
        </select>

        <label>Split details</label>
        {members.map((m) => (
          <div key={m.id} className="sw-split-row">
            <span>{m.name}{m.id === user.id ? ' (you)' : ''}</span>
            {splitType === 'EQUAL' && (
              <span style={{ color: '#999', fontSize: 13 }}>
                {parseFloat(amount) > 0
                  ? '$' + (parseFloat(amount) / members.length).toFixed(2)
                  : '$0.00'}
              </span>
            )}
            {splitType === 'PERCENTAGE' && (
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={splits[m.id] || ''}
                onChange={(e) => updateSplit(m.id, e.target.value)}
                placeholder="%"
              />
            )}
            {splitType === 'EXACT' && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={splits[m.id] || ''}
                onChange={(e) => updateSplit(m.id, e.target.value)}
                placeholder="0.00"
              />
            )}
          </div>
        ))}

        <button type="submit" className="sw-btn" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
