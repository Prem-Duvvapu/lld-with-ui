import { useState, useEffect, useRef } from 'react';
import { getUsers, createUser, getGroups, createGroup, addExpense, getGroupExpenses, getBalances, getTransactions, settleUp, getSimplifiedDebts, getEvents, simReset, simCreateUser, simCreateGroup, simAddExpense, simSettleUp, simGetBalances, simGetEvents, simGetSimplifiedDebts } from './api';
import LldPage from '../../components/LldPage';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
.splitwise-app { max-width: 900px; margin: 0 auto; padding: 12px; }
.sw-main { background: var(--bg-card); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); padding: 24px; min-height: 450px; border: 1px solid var(--border-primary); }
.sw-back-btn { background: none; border: none; color: #667eea; cursor: pointer; font-size: 14px; font-weight: 600; padding: 4px 0; margin-bottom: 16px; display: inline-block; }
.sw-back-btn:hover { color: #764ba2; }
.sw-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border-primary); }
.sw-form h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }
.sw-form label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.sw-form input, .sw-form select { padding: 10px 12px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
.sw-form input:focus, .sw-form select:focus { border-color: #667eea; }
.sw-btn { padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.sw-btn:hover { opacity: 0.9; }
.sw-btn:active { transform: scale(0.98); }
.sw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sw-btn-secondary { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-primary); }
.sw-btn-secondary:hover { background: var(--border-primary); opacity: 1; }
.sw-list { display: flex; flex-direction: column; gap: 8px; }
.sw-list h3 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }
.sw-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; background: var(--bg-primary); cursor: pointer; transition: background 0.2s, transform 0.1s; border: 1px solid var(--border-primary); }
.sw-card:hover { background: var(--bg-card); border-color: #667eea; }
.sw-card-title { font-weight: 600; font-size: 15px; color: var(--text-primary); }
.sw-card-sub { font-size: 12px; color: var(--text-secondary); }
.sw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.sw-balance-positive { color: #22c55e; font-weight: 600; }
.sw-balance-negative { color: #ef4444; font-weight: 600; }
.sw-balance-zero { color: var(--text-secondary); }
.sw-settle-section { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.sw-settle-section select, .sw-settle-section input { padding: 10px 12px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); border-radius: 8px; font-size: 14px; outline: none; }
.sw-expense-form { display: flex; flex-direction: column; gap: 14px; }
.sw-split-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.sw-split-row span { flex: 1; font-size: 14px; font-weight: 500; color: var(--text-primary); }
.sw-split-row input { width: 100px; padding: 8px 10px; border: 1px solid var(--border-primary); background: var(--bg-primary); color: var(--text-primary); border-radius: 6px; font-size: 13px; text-align: right; outline: none; }
.sw-section-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.sw-transactions { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-primary); }
.sw-transaction-item { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; border-bottom: 1px solid var(--border-primary); color: var(--text-primary); }
.sw-loading { text-align: center; color: var(--text-secondary); padding: 40px 0; font-size: 14px; }
.sw-error { text-align: center; color: #ef4444; padding: 16px; font-size: 14px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; margin-bottom: 12px; }
.sw-success { text-align: center; color: #22c55e; padding: 16px; font-size: 14px; font-weight: 600; background: rgba(34, 197, 94, 0.1); border-radius: 8px; margin-bottom: 12px; }

/* Dashboard & Activity styles */
.sw-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.badge-expense { background: rgba(102, 126, 234, 0.15); color: #667eea; }
.badge-settlement { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge-user { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.badge-group { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

/* 2D Interactive Scene */
.step-indicator { display: flex; gap: 6px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.step-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--border-primary); transition: all 0.3s; cursor: pointer; }
.step-dot.active { background: #667eea; box-shadow: 0 0 10px rgba(102,126,234,0.7); transform: scale(1.2); }
.step-dot.done { background: #22c55e; }

.sw-scene { width: 100%; min-height: 420px; background: radial-gradient(circle at center, #1a1c2e 0%, #0d0e17 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; margin-bottom: 16px; overflow: hidden; position: relative; color: #fff; box-shadow: inset 0 0 50px rgba(0,0,0,0.5); }
.sw-hud { position: absolute; bottom: 12px; left: 12px; right: 12px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 16px; display: flex; justify-content: space-around; font-size: 12px; }
.sw-node { width: 54px; height: 54px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #fff; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); position: absolute; box-shadow: 0 0 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.3); }
.sw-group-node { width: 90px; height: 90px; border-radius: 20px; background: linear-gradient(135deg, #667eea, #764ba2); position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(102,126,234,0.5); z-index: 5; border: 2px solid #a855f7; animation: pulseGlow 3s infinite ease-in-out; }

@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(102,126,234,0.4); } 50% { box-shadow: 0 0 40px rgba(168,85,247,0.8); } }

.sw-vector { position: absolute; height: 2px; background: linear-gradient(90deg, #667eea, #22c55e); transform-origin: left center; pointer-events: none; opacity: 0.8; animation: flowRay 1.5s infinite linear; }
@keyframes flowRay { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }

.sw-debt-arrow { position: absolute; border: 1px dashed rgba(255,255,255,0.4); transform-origin: left center; pointer-events: none; }
.sw-debt-label { position: absolute; background: rgba(0,0,0,0.8); color: #22c55e; border: 1px solid #22c55e; border-radius: 10px; padding: 2px 8px; font-size: 11px; font-weight: 700; transform: translate(-50%, -50%); z-index: 12; white-space: nowrap; }

.sw-sim-card { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 14px; max-width: 320px; margin: 0 auto; text-align: center; position: relative; z-index: 10; animation: slideUp 0.4s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

function UserList({ onUserSelect, onUserCreated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => { getUsers().then(setUsers).catch(setError).finally(() => setLoading(false)); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try { const user = await createUser(name.trim(), email.trim()); setUsers([...users, user]); setName(''); setEmail(''); onUserCreated(user); }
    catch (err) { setError(err.message); }
  };

  if (loading) return <div className="sw-loading">Loading users...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <form className="sw-form" onSubmit={handleCreate}>
        <h3>Create New User</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alice" />
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. alice@email.com" />
        <button type="submit" className="sw-btn" disabled={!name.trim() || !email.trim()}>+ Create User</button>
      </form>
      <div className="sw-list">
        <h3>Select Active User</h3>
        {users.length === 0 && <div className="sw-loading">No users created yet</div>}
        <div className="sw-grid">
          {users.map((user) => (
            <div key={user.id} className="sw-card" onClick={() => onUserSelect(user)}>
              <div>
                <div className="sw-card-title">👤 {user.name}</div>
                <div className="sw-card-sub">{user.email}</div>
              </div>
              <span style={{ color: '#667eea', fontWeight: 600, fontSize: 13 }}>Select &rarr;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupList({ user, onGroupSelect, onBack }) {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    Promise.all([getGroups(), getUsers()]).then(([groupsData, usersData]) => {
      setGroups(groupsData); setAllUsers(usersData);
    }).catch(setError).finally(() => setLoading(false));
  }, []);

  const userGroups = groups.filter((g) => g.members && g.members.some((m) => m.id === user.id));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const memberIds = [...new Set([...selectedMembers, user.id])];
    try { const group = await createGroup(name.trim(), memberIds); setGroups([...groups, group]); setName(''); setSelectedMembers([]); }
    catch (err) { setError(err.message); }
  };

  const toggleMember = (id) => { setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); };

  if (loading) return <div className="sw-loading">Loading groups...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Switch User ({user.name})</button>
      <form className="sw-form" onSubmit={handleCreate}>
        <h3>Create Expense Group</h3>
        <label>Group Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa Trip 2026" />
        <label>Select Members</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allUsers.filter((u) => u.id !== user.id).map((u) => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 13, background: selectedMembers.includes(u.id) ? '#667eea' : 'var(--bg-primary)', color: selectedMembers.includes(u.id) ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-primary)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={() => toggleMember(u.id)} style={{ display: 'none' }} />
              {u.name}
            </label>
          ))}
        </div>
        <button type="submit" className="sw-btn" disabled={!name.trim()}>+ Create Group</button>
      </form>
      <div className="sw-list">
        <h3>Groups of {user.name}</h3>
        {userGroups.length === 0 && <div className="sw-loading">No groups for this user yet</div>}
        <div className="sw-grid">
          {userGroups.map((group) => (
            <div key={group.id} className="sw-card" onClick={() => onGroupSelect(group)}>
              <div>
                <div className="sw-card-title">📁 {group.name}</div>
                <div className="sw-card-sub">{group.members ? group.members.length : 0} members</div>
              </div>
              <span style={{ color: '#667eea', fontWeight: 600, fontSize: 13 }}>Open &rarr;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddExpense({ user, group, onBack, onExpenseAdded }) {
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
      const groupMembers = all.filter((u) => group.members && group.members.some((m) => m.id === u.id));
      setMembers(groupMembers);
      const initial = {}; groupMembers.forEach((m) => { initial[m.id] = ''; }); setSplits(initial);
    }).catch(setError);
  }, [group]);

  const handleAmountChange = (val) => {
    setAmount(val);
    if (splitType === 'EQUAL' && parseFloat(val) > 0 && members.length > 0) {
      const share = (parseFloat(val) / members.length).toFixed(2);
      const updated = {}; members.forEach((m) => { updated[m.id] = share; }); setSplits(updated);
    }
  };

  const handleSplitTypeChange = (type) => {
    setSplitType(type);
    const parsedAmount = parseFloat(amount);
    if (type === 'EQUAL' && parsedAmount > 0 && members.length > 0) {
      const share = (parsedAmount / members.length).toFixed(2);
      const updated = {}; members.forEach((m) => { updated[m.id] = share; }); setSplits(updated);
    } else {
      const updated = {}; members.forEach((m) => { updated[m.id] = ''; }); setSplits(updated);
    }
  };

  const updateSplit = (memberId, val) => { setSplits({ ...splits, [memberId]: val }); };

  const validateSplits = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid positive amount';
    if (splitType === 'EQUAL') return null;
    const total = Object.values(splits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    if (splitType === 'PERCENTAGE' && Math.abs(total - 100) > 0.01) return 'Percentages must sum to 100 (got ' + total + '%)';
    if (splitType === 'EXACT' && Math.abs(total - parsedAmount) > 0.01) return 'Exact amounts must sum to ₹' + parsedAmount + ' (got ₹' + total + ')';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateSplits();
    if (validationError) { setError(validationError); return; }
    const splitEntries = members.map((m) => {
      if (splitType === 'EQUAL') return { userId: m.id, type: 'EQUAL' };
      if (splitType === 'PERCENTAGE') return { userId: m.id, type: 'PERCENTAGE', percentage: parseFloat(splits[m.id]) || 0, amount: 0 };
      return { userId: m.id, type: 'EXACT', amount: parseFloat(splits[m.id]) || 0, percentage: 0 };
    });
    setSubmitting(true); setError(null);
    try { await addExpense(description, parseFloat(amount), paidBy, group.id, splitEntries); onExpenseAdded(); }
    catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to Groups</button>
      <div className="sw-section-title">Add Expense in {group.name}</div>
      {error && <div className="sw-error">{error}</div>}
      <form className="sw-expense-form" onSubmit={handleSubmit}>
        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" required />
        <label>Amount (₹)</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" required />
        <label>Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (you)' : ''}</option>)}
        </select>
        <label>Split Type (Strategy Pattern)</label>
        <select value={splitType} onChange={(e) => handleSplitTypeChange(e.target.value)}>
          <option value="EQUAL">Equal Split</option>
          <option value="PERCENTAGE">Percentage Split</option>
          <option value="EXACT">Exact Amount Split</option>
        </select>
        <label>Split Share Details</label>
        {members.map((m) => (
          <div key={m.id} className="sw-split-row">
            <span>{m.name}{m.id === user.id ? ' (you)' : ''}</span>
            {splitType === 'EQUAL' && <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{parseFloat(amount) > 0 ? '₹' + (parseFloat(amount) / members.length).toFixed(2) : '₹0.00'}</span>}
            {splitType === 'PERCENTAGE' && <input type="number" step="0.1" min="0" max="100" value={splits[m.id] || ''} onChange={(e) => updateSplit(m.id, e.target.value)} placeholder="%" />}
            {splitType === 'EXACT' && <input type="number" step="0.01" min="0" value={splits[m.id] || ''} onChange={(e) => updateSplit(m.id, e.target.value)} placeholder="₹0.00" />}
          </div>
        ))}
        <button type="submit" className="sw-btn" disabled={submitting}>{submitting ? 'Adding...' : '💸 Add Expense'}</button>
      </form>
    </div>
  );
}

function BalanceView({ user, onBack, onSettle }) {
  const [balances, setBalances] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getBalances(user.id), getTransactions(user.id), getUsers()])
      .then(([balData, txData, usersData]) => { setBalances(balData || {}); setTransactions(txData || []); setUsers(usersData); })
      .catch(setError).finally(() => setLoading(false));
  }, [user.id]);

  const getUserId = (name) => { const u = users.find((x) => x.name === name); return u ? u.id : null; };
  const balanceEntries = Object.entries(balances).filter(([, amount]) => amount !== 0);

  if (loading) return <div className="sw-loading">Loading balances...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to Groups</button>
      <div className="sw-section-title">
        <span>Balances for {user.name}</span>
        <button className="sw-btn" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onSettle()}>💸 Settle Up</button>
      </div>
      {balanceEntries.length === 0 && <div className="sw-loading">All settled up! No outstanding balances.</div>}
      <div className="sw-grid">
        {balanceEntries.map(([otherName, amount]) => {
          const otherId = getUserId(otherName);
          return (
            <div key={otherName} className="sw-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sw-card-title">{otherName}</span>
                <span className={amount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>{amount > 0 ? '+' : ''}₹{Math.abs(amount).toFixed(2)}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{amount > 0 ? 'owes you' : 'you owe'}</span>
              {otherId && <button className="sw-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onSettle(otherId)}>Settle Up</button>}
            </div>
          );
        })}
      </div>
      {transactions.length > 0 && (
        <div className="sw-transactions">
          <div className="sw-section-title">Personal Transaction History</div>
          {transactions.map((tx, i) => (
            <div key={i} className="sw-transaction-item">
              <span>{tx.description || `${tx.type} (${tx.fromUser || ''} → ${tx.toUser || ''})`}</span>
              <span style={{ fontWeight: 600 }}>₹{tx.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettleUp({ user, targetUserId, onBack, onSettled }) {
  const [balances, setBalances] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(targetUserId || '');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getBalances(user.id), getUsers(), getGroups()])
      .then(([balData, usersData, groupsData]) => {
        setBalances(balData || {});
        setAllUsers(usersData);
        setGroups(groupsData);
        if (groupsData.length > 0) setSelectedGroupId(groupsData[0].id);
      })
      .catch(setError).finally(() => setLoading(false));
  }, [user.id]);

  const balanceEntries = Object.entries(balances).filter(([, amount]) => amount !== 0);
  const userGroups = groups.filter((g) => g.members && g.members.some((m) => m.id === user.id));

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedGroupId || !amount || parseFloat(amount) <= 0) { setError('Please fill all fields'); return; }
    setSubmitting(true); setError(null); setSuccess(null);
    try { await settleUp(user.id, Number(selectedUserId), Number(selectedGroupId), parseFloat(amount)); setSuccess('Settled up successfully!'); setTimeout(() => onSettled(), 1200); }
    catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="sw-loading">Loading settlement data...</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to Balances</button>
      <div className="sw-section-title">Settle Up</div>
      {balanceEntries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Outstanding balances for {user.name}:</div>
          {balanceEntries.map(([otherName, balAmount]) => (
            <div key={otherName} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-primary)', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
              <span>{otherName}</span>
              <span className={balAmount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>{balAmount > 0 ? 'owes you ' : 'you owe '}₹{Math.abs(balAmount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      {error && <div className="sw-error">{error}</div>}
      {success && <div className="sw-success">{success}</div>}
      <form className="sw-settle-section" onSubmit={handleSettle}>
        <label>Settle with User</label>
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required>
          <option value="">Select recipient user</option>
          {allUsers.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label>In Group</label>
        <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} required>
          <option value="">Select group context</option>
          {userGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <label>Settlement Amount (₹)</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
        <button type="submit" className="sw-btn" disabled={submitting}>{submitting ? 'Processing...' : '✅ Complete Settlement'}</button>
      </form>
    </div>
  );
}

/* --- TAB 2: BALANCE DASHBOARD (DEBT SIMPLIFICATION) --- */
function BalanceDashboard() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroups().then((data) => {
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroup(data[0]);
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      Promise.all([
        getSimplifiedDebts(selectedGroup.id),
        getGroupExpenses(selectedGroup.id)
      ]).then(([debts, exps]) => {
        setSimplifiedDebts(debts || []);
        setExpenses(exps || []);
      });
    }
  }, [selectedGroup]);

  if (loading) return <div className="sw-loading">Loading Debt Simplification Engine...</div>;

  return (
    <div>
      <div className="sw-section-title">
        <span>📊 Debt Simplification Dashboard</span>
        {groups.length > 0 && (
          <select value={selectedGroup?.id || ''} onChange={(e) => {
            const g = groups.find(x => x.id === Number(e.target.value));
            setSelectedGroup(g);
          }} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      {selectedGroup ? (
        <>
          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)', marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#667eea' }}>🧮 Min-Cash-Flow Debt Simplification Algorithm</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Calculates greedy net cash-flow balances for members of <strong>{selectedGroup.name}</strong> to eliminate intermediate settlement transactions. Reduces algorithm complexity to O(N log N).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>💡 Optimal Settlement Plan ({simplifiedDebts.length} txns)</h4>
              {simplifiedDebts.length === 0 ? (
                <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>🎉 Group is fully settled! Zero debts remaining.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {simplifiedDebts.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 13 }}>
                      <span><strong style={{ color: '#ef4444' }}>{s.fromUser?.name}</strong> &rarr; <strong style={{ color: '#22c55e' }}>{s.toUser?.name}</strong></span>
                      <span style={{ fontWeight: 700, color: '#667eea' }}>₹{s.amount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>🧾 Group Expense Log ({expenses.length})</h4>
              {expenses.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No expenses recorded in this group yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {expenses.map((e) => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 6, fontSize: 12 }}>
                      <span>{e.description} (Paid by {e.paidBy?.name})</span>
                      <span style={{ fontWeight: 700 }}>₹{e.amount?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : <div className="sw-loading">No groups available. Create a group in Expense Manager tab.</div>}
    </div>
  );
}

/* --- TAB 3: REAL-TIME ACTIVITY FEED --- */
function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchEvents = () => { getEvents().then(setEvents).catch(console.error); };
    fetchEvents();
    const interval = setInterval(fetchEvents, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = filter === 'ALL' ? events : events.filter(e => e.type === filter);

  return (
    <div>
      <div className="sw-section-title">
        <span>📜 Real-Time Audit Event Log</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'EXPENSE_ADDED', 'SETTLEMENT', 'GROUP_CREATED'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, border: 'none', background: filter === f ? '#667eea' : 'var(--bg-primary)', color: filter === f ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>{f.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredEvents.length === 0 && <div className="sw-loading">No audit events recorded yet.</div>}
        {filteredEvents.slice().reverse().map((ev) => (
          <div key={ev.id} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`sw-badge badge-${ev.type.toLowerCase().includes('expense') ? 'expense' : ev.type.toLowerCase().includes('settle') ? 'settlement' : ev.type.toLowerCase().includes('user') ? 'user' : 'group'}`}>{ev.type}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.description}</div>
            {ev.balanceSnapshot && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {Object.entries(ev.balanceSnapshot).map(([name, net]) => (
                  <span key={name} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: net > 0 ? '#22c55e' : net < 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                    {name}: {net > 0 ? '+' : ''}₹{net.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- TAB 4: 8-STEP INTERACTIVE 2D SIMULATION --- */
function InteractiveSimulation() {
  const [step, setStep] = useState(0);
  const [users, setUsers] = useState([]);
  const [group, setGroup] = useState(null);
  const [expense, setExpense] = useState(null);
  const [debts, setDebts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { title: 'Idle Engine', label: 'Start Engine' },
    { title: 'Create Sim Users', label: '👥 Spawn 4 Users' },
    { title: 'Form Group', label: '📁 Create Goa Group' },
    { title: 'Expense 1 (Equal)', label: '🏨 Add ₹4000 Hotel' },
    { title: 'Expense 2 (Percentage)', label: '🍕 Add ₹1200 Dinner' },
    { title: 'Expense 3 (Exact)', label: '🚕 Add ₹800 Cab' },
    { title: 'Debt Graph Topology', label: '📊 Analyze Simplification' },
    { title: 'Settlement Ray Flow', label: '💸 Diana Settles ₹1000' },
    { title: 'Simulation Complete', label: '✅ Restart' },
  ];

  const resetSim = async () => {
    setLoading(true); setError('');
    try {
      await simReset();
      setStep(0); setUsers([]); setGroup(null); setExpense(null); setDebts([]); setBalances({});
    } catch { setError('Failed to reset sim'); }
    finally { setLoading(false); }
  };

  const handleStepAction = async () => {
    setLoading(true); setError('');
    try {
      if (step === 0) {
        setStep(1);
      } else if (step === 1) {
        const u1 = await simCreateUser('Alice', 'alice@sim.com');
        const u2 = await simCreateUser('Bob', 'bob@sim.com');
        const u3 = await simCreateUser('Charlie', 'charlie@sim.com');
        const u4 = await simCreateUser('Diana', 'diana@sim.com');
        setUsers([u1, u2, u3, u4]);
        setStep(2);
      } else if (step === 2) {
        const g = await simCreateGroup('Goa Trip 2026', users.map(u => u.id));
        setGroup(g);
        setStep(3);
      } else if (step === 3) {
        const exp1 = await simAddExpense('Hotel Booking', 4000.0, users[0].id, group.id, []);
        setExpense(exp1);
        const b = await simGetBalances(); setBalances(b);
        setStep(4);
      } else if (step === 4) {
        const pctSplits = [
          { userId: users[0].id, type: 'PERCENTAGE', percentage: 20 },
          { userId: users[1].id, type: 'PERCENTAGE', percentage: 40 },
          { userId: users[2].id, type: 'PERCENTAGE', percentage: 20 },
          { userId: users[3].id, type: 'PERCENTAGE', percentage: 20 },
        ];
        const exp2 = await simAddExpense('Beach Dinner', 1200.0, users[1].id, group.id, pctSplits);
        setExpense(exp2);
        const b = await simGetBalances(); setBalances(b);
        setStep(5);
      } else if (step === 5) {
        const exactSplits = [
          { userId: users[0].id, type: 'EXACT', amount: 200 },
          { userId: users[1].id, type: 'EXACT', amount: 200 },
          { userId: users[2].id, type: 'EXACT', amount: 200 },
          { userId: users[3].id, type: 'EXACT', amount: 200 },
        ];
        const exp3 = await simAddExpense('Cab Fare', 800.0, users[2].id, group.id, exactSplits);
        setExpense(exp3);
        const b = await simGetBalances(); setBalances(b);
        setStep(6);
      } else if (step === 6) {
        const d = await simGetSimplifiedDebts(group.id);
        setDebts(d);
        setStep(7);
      } else if (step === 7) {
        await simSettleUp(users[3].id, users[0].id, group.id, 1000.0);
        const d = await simGetSimplifiedDebts(group.id);
        setDebts(d);
        const b = await simGetBalances(); setBalances(b);
        setStep(8);
      } else {
        await resetSim();
      }
    } catch (err) {
      setError(err.message || 'Error executing step');
    } finally {
      setLoading(false);
    }
  };

  const userPositions = [
    { top: '15%', left: '15%', color: '#667eea' }, // Alice
    { top: '15%', right: '15%', color: '#764ba2' }, // Bob
    { bottom: '20%', left: '15%', color: '#f093fb' }, // Charlie
    { bottom: '20%', right: '15%', color: '#4facfe' }, // Diana
  ];

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={i} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s.title} onClick={() => {}} />
        ))}
      </div>

      <div className="sw-scene">
        {/* Central Group Node */}
        {step >= 2 && group && (
          <div className="sw-group-node">
            <div style={{ fontSize: 24 }}>📁</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{group.name}</div>
          </div>
        )}

        {/* User Nodes Orbit */}
        {users.map((u, i) => {
          const pos = userPositions[i];
          return (
            <div key={u.id} className="sw-node" style={{ ...pos, background: pos.color }}>
              <div>{u.name[0]}</div>
              <div style={{ fontSize: 9, marginTop: 2 }}>{u.name}</div>
            </div>
          );
        })}

        {/* Debt Graph Vectors (Step 6 & 7) */}
        {step >= 6 && debts.map((d, idx) => (
          <div key={idx} className="sw-debt-label" style={{ top: `${35 + idx * 15}%`, left: '50%' }}>
            ⚡ {d.fromUser?.name} owe {d.toUser?.name}: ₹{d.amount?.toFixed(2)}
          </div>
        ))}

        {/* Main Expense Popup Cards */}
        {step >= 3 && step <= 5 && expense && (
          <div className="sw-sim-card" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>EXPENSE EVENT RECORDED</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>{expense.description}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>₹{expense.amount?.toFixed(2)}</div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>Paid by {expense.paidBy?.name} ({expense.splits?.[0]?.type || 'EQUAL'})</div>
          </div>
        )}

        {/* Step 8 Complete Summary */}
        {step === 8 && (
          <div className="sw-sim-card" style={{ marginTop: 20, border: '2px solid #22c55e' }}>
            <div style={{ fontSize: 32 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>Simulation Complete!</div>
            <div style={{ fontSize: 12, color: '#cbd5e1', margin: '8px 0' }}>Executed 3 real REST expenses, strategy split validation, greedy debt simplification, and live settlement handoff.</div>
          </div>
        )}

        {/* Live Balance HUD */}
        {users.length > 0 && (
          <div className="sw-hud">
            {users.map((u) => {
              const uBal = balances[u.name] || {};
              const netTotal = Object.values(uBal).reduce((a, b) => a + b, 0);
              return (
                <div key={u.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{u.name}</div>
                  <div style={{ color: netTotal >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                    {netTotal >= 0 ? '+' : ''}₹{netTotal.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button className="sw-btn" onClick={handleStepAction} disabled={loading}>
          {loading ? 'Processing...' : steps[step]?.label || 'Next Step'}
        </button>
        <button className="sw-btn sw-btn-secondary" onClick={resetSim} disabled={loading}>
          ↺ Reset Sim State
        </button>
      </div>
      {error && <div className="sw-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}

export default function SplitwisePage() {
  const [view, setView] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [targetSettleUser, setTargetSettleUser] = useState(null);

  const handleUserSelect = (user) => { setSelectedUser(user); setView('groups'); };
  const handleGroupSelect = (group) => { setSelectedGroup(group); setView('expense'); };

  return (
    <LldPage
      module="splitwise"
      title="Splitwise Expense Sharing"
      icon="💰"
      tabs={[
        { id: 'app', label: '💰 Expense Manager' },
        { id: 'dashboard', label: '📊 Balance Dashboard' },
        { id: 'activity', label: '📜 Activity Feed' },
        { id: 'simulation', label: '🕹️ Interactive 2D Simulation' },
        { id: 'diagram', label: 'Class Diagram' },
        { id: 'design', label: 'Design Details' }
      ]}
    >
      {(activeTab) => (
        <div className="splitwise-app">
          <style>{styles}</style>
          <main className="sw-main">
            {activeTab === 'app' && (
              <>
                {view === 'users' && <UserList onUserSelect={handleUserSelect} onUserCreated={() => {}} />}
                {view === 'groups' && selectedUser && <GroupList user={selectedUser} onGroupSelect={handleGroupSelect} onBack={() => { setSelectedUser(null); setView('users'); }} />}
                {view === 'expense' && selectedGroup && selectedUser && <AddExpense user={selectedUser} group={selectedGroup} onBack={() => { setSelectedGroup(null); setView('groups'); }} onExpenseAdded={() => setView('balances')} />}
                {view === 'balances' && selectedUser && <BalanceView user={selectedUser} onBack={() => setView('groups')} onSettle={(otherId) => { setTargetSettleUser(otherId); setView('settle'); }} />}
                {view === 'settle' && selectedUser && <SettleUp user={selectedUser} targetUserId={targetSettleUser} onBack={() => setView('balances')} onSettled={() => setView('balances')} />}
              </>
            )}
            {activeTab === 'dashboard' && <BalanceDashboard />}
            {activeTab === 'activity' && <ActivityFeed />}
            {activeTab === 'simulation' && <InteractiveSimulation />}
            {activeTab === 'diagram' && <ClassDiagram module="splitwise" />}
            {activeTab === 'design' && <DesignDetails module="splitwise" />}
          </main>
        </div>
      )}
    </LldPage>
  );
}
