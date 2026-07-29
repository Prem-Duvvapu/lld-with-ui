import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, createUser, getGroups, createGroup, addExpense, getBalances, getTransactions, settleUp } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
.splitwise-app { max-width: 600px; margin: 0 auto; padding: 20px 16px; }
.sw-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; }
.sw-header h1 { background: linear-gradient(135deg, #fff, #e0d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 28px; font-weight: 800; }
.sw-user-badge { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.25); color: #fff; font-weight: 700; font-size: 14px; text-transform: uppercase; }
.sw-main { background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); padding: 24px; min-height: 400px; }
.sw-back-btn { background: none; border: none; color: #667eea; cursor: pointer; font-size: 14px; font-weight: 600; padding: 4px 0; margin-bottom: 16px; display: inline-block; }
.sw-back-btn:hover { color: #764ba2; }
.sw-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #eee; }
.sw-form h3 { font-size: 16px; color: #555; }
.sw-form label { font-size: 13px; font-weight: 600; color: #666; }
.sw-form input, .sw-form select { padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
.sw-form input:focus, .sw-form select:focus { border-color: #667eea; }
.sw-btn { padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
.sw-btn:hover { opacity: 0.9; }
.sw-btn:active { transform: scale(0.98); }
.sw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sw-btn-secondary { background: #f0f0f0; color: #555; }
.sw-btn-secondary:hover { background: #e0e0e0; opacity: 1; }
.sw-list { display: flex; flex-direction: column; gap: 8px; }
.sw-list h3 { font-size: 16px; color: #555; margin-bottom: 4px; }
.sw-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 10px; background: #f8f9ff; cursor: pointer; transition: background 0.2s, transform 0.1s; border: 1px solid transparent; }
.sw-card:hover { background: #eef0ff; border-color: #667eea; }
.sw-card:active { transform: scale(0.99); }
.sw-card-title { font-weight: 600; font-size: 15px; }
.sw-card-sub { font-size: 12px; color: #999; }
.sw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sw-balance-positive { color: #22c55e; font-weight: 600; }
.sw-balance-negative { color: #ef4444; font-weight: 600; }
.sw-balance-zero { color: #999; }
.sw-settle-section { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.sw-settle-section select, .sw-settle-section input { padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
.sw-settle-section select:focus, .sw-settle-section input:focus { border-color: #667eea; }
.sw-expense-form { display: flex; flex-direction: column; gap: 14px; }
.sw-split-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.sw-split-row span { flex: 1; font-size: 14px; font-weight: 500; }
.sw-split-row input { width: 100px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; text-align: right; outline: none; }
.sw-split-row input:focus { border-color: #667eea; }
.sw-section-title { font-size: 15px; font-weight: 700; color: #444; margin-bottom: 8px; }
.sw-transactions { margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; }
.sw-transaction-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
.sw-loading { text-align: center; color: #999; padding: 40px 0; font-size: 14px; }
.sw-error { text-align: center; color: #ef4444; padding: 20px 0; font-size: 14px; }
.sw-success { text-align: center; color: #22c55e; padding: 16px 0; font-size: 14px; font-weight: 600; }
.sw-flex { display: flex; gap: 8px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.5); border-radius: 6px; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: rgba(255,255,255,0.2); }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #667eea; box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.step-dot.done { background: #3fb950; }
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
        <h3>Create User</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" />
        <button type="submit" className="sw-btn" disabled={!name.trim() || !email.trim()}>Create User</button>
      </form>
      <div className="sw-list">
        <h3>Select User</h3>
        {users.length === 0 && <div className="sw-loading">No users yet</div>}
        {users.map((user) => (
          <div key={user.id} className="sw-card" onClick={() => onUserSelect(user)}>
            <span className="sw-card-title">{user.name}</span>
            <span className="sw-card-sub">{user.email}</span>
          </div>
        ))}
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
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to users</button>
      <form className="sw-form" onSubmit={handleCreate}>
        <h3>Create Group</h3>
        <label>Group Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter group name" />
        <label>Add Members</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allUsers.filter((u) => u.id !== user.id).map((u) => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 13, background: selectedMembers.includes(u.id) ? '#667eea' : '#f0f0f0', color: selectedMembers.includes(u.id) ? '#fff' : '#333', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={selectedMembers.includes(u.id)} onChange={() => toggleMember(u.id)} style={{ display: 'none' }} />
              {u.name}
            </label>
          ))}
        </div>
        <button type="submit" className="sw-btn" disabled={!name.trim()}>Create Group</button>
      </form>
      <div className="sw-list">
        <h3>Your Groups</h3>
        {userGroups.length === 0 && <div className="sw-loading">No groups yet</div>}
        {userGroups.map((group) => (
          <div key={group.id} className="sw-card" onClick={() => onGroupSelect(group)}>
            <span className="sw-card-title">{group.name}</span>
            <span className="sw-card-sub">{group.members ? group.members.length : 0} members</span>
          </div>
        ))}
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
    if (!parsedAmount || parsedAmount <= 0) return 'Enter a valid amount';
    if (splitType === 'EQUAL') return null;
    const total = Object.values(splits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    if (splitType === 'PERCENTAGE' && Math.abs(total - 100) > 0.01) return 'Percentages must sum to 100';
    if (splitType === 'EXACT' && Math.abs(total - parsedAmount) > 0.01) return 'Exact amounts must sum to ' + parsedAmount;
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
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to groups</button>
      <div className="sw-section-title">Add Expense in {group.name}</div>
      {error && <div className="sw-error">{error}</div>}
      <form className="sw-expense-form" onSubmit={handleSubmit}>
        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this expense for?" required />
        <label>Amount</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" required />
        <label>Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === user.id ? ' (you)' : ''}</option>)}
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
            {splitType === 'EQUAL' && <span style={{ color: '#999', fontSize: 13 }}>{parseFloat(amount) > 0 ? '$' + (parseFloat(amount) / members.length).toFixed(2) : '$0.00'}</span>}
            {splitType === 'PERCENTAGE' && <input type="number" step="0.1" min="0" max="100" value={splits[m.id] || ''} onChange={(e) => updateSplit(m.id, e.target.value)} placeholder="%" />}
            {splitType === 'EXACT' && <input type="number" step="0.01" min="0" value={splits[m.id] || ''} onChange={(e) => updateSplit(m.id, e.target.value)} placeholder="0.00" />}
          </div>
        ))}
        <button type="submit" className="sw-btn" disabled={submitting}>{submitting ? 'Adding...' : 'Add Expense'}</button>
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
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to groups</button>
      <div className="sw-section-title">Your Balances</div>
      {balanceEntries.length === 0 && <div className="sw-loading">No balances to show</div>}
      <div className="sw-grid">
        {balanceEntries.map(([otherName, amount]) => {
          const otherId = getUserId(otherName);
          return (
            <div key={otherName} className="sw-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sw-card-title">{otherName}</span>
                <span className={amount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>{amount > 0 ? '+' : ''}${Math.abs(amount).toFixed(2)}</span>
              </div>
              <span style={{ fontSize: 12, color: '#999' }}>{amount > 0 ? 'owes you' : 'you owe'}</span>
              {otherId && <button className="sw-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onSettle(otherId)}>Settle Up</button>}
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

function SettleUp({ user, onBack, onSettled }) {
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
      .then(([balData, usersData, groupsData]) => { setBalances(balData || {}); setAllUsers(usersData); setGroups(groupsData); })
      .catch(setError).finally(() => setLoading(false));
  }, [user.id]);

  const getUserId = (name) => { const u = allUsers.find((x) => x.name === name); return u ? u.id : null; };
  const balanceEntries = Object.entries(balances).filter(([, amount]) => amount !== 0);
  const userGroups = groups.filter((g) => g.members && g.members.some((m) => m.id === user.id));

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedGroupId || !amount || parseFloat(amount) <= 0) { setError('Please fill all fields'); return; }
    setSubmitting(true); setError(null); setSuccess(null);
    try { await settleUp(user.id, Number(selectedUserId), Number(selectedGroupId), parseFloat(amount)); setSuccess('Settled up successfully!'); setTimeout(() => onSettled(), 1500); }
    catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="sw-loading">Loading...</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to balances</button>
      <div className="sw-section-title">Settle Up</div>
      {balanceEntries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Outstanding balances:</div>
          {balanceEntries.map(([otherName, balAmount]) => (
            <div key={otherName} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span>{otherName}</span>
              <span className={balAmount > 0 ? 'sw-balance-positive' : 'sw-balance-negative'}>{balAmount > 0 ? '+' : ''}${Math.abs(balAmount).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      {error && <div className="sw-error">{error}</div>}
      {success && <div className="sw-success">{success}</div>}
      <form className="sw-settle-section" onSubmit={handleSettle}>
        <label>Settle with</label>
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Select user</option>
          {allUsers.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label>In group</label>
        <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
          <option value="">Select group</option>
          {userGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <label>Amount</label>
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        <button type="submit" className="sw-btn" disabled={submitting}>{submitting ? 'Settling...' : 'Settle Up'}</button>
      </form>
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const steps = ['Users', 'Group', 'Expense', 'Split', 'Settle'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setResult(null); setError(''); setLoading(false); };

  const startSim = async () => {
    setError(''); setLoading(true); setStep(1);
    try {
      const users = await getUsers();
      let u1, u2;
      if (users.length >= 2) { u1 = users[0]; u2 = users[1]; }
      else {
        u1 = await createUser('Alice', 'alice@test.com');
        u2 = await createUser('Bob', 'bob@test.com');
      }
      if (!mountedRef.current) return;
      if (u1.error || u2.error) { setError('Failed to create users'); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(2);

      const group = await createGroup('Trip to Goa', [u1.id, u2.id]);
      if (!mountedRef.current) return;
      if (group.error) { setError(group.error); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(3);

      const expense = await addExpense('Hotel Booking', 5000, u1.id, group.id, [
        { userId: u1.id, type: 'EQUAL' },
        { userId: u2.id, type: 'EQUAL' }
      ]);
      if (!mountedRef.current) return;
      if (expense.error) { setError(expense.error); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 800));
      if (!mountedRef.current) return;
      setStep(4);

      await new Promise(r => setTimeout(r, 1000));
      if (!mountedRef.current) return;
      setStep(5);
      setLoading(false);

      await new Promise(r => setTimeout(r, 1500));
      if (!mountedRef.current) return;
      setResult({ group: group.name, expense: expense.description, amount: expense.amount, paidBy: expense.paidBy?.name || 'Alice', totalUsers: 2 });
    } catch { if (mountedRef.current) { setError('Simulation failed'); setLoading(false); } }
  };

  return (
    <div>
      <div className="step-indicator" style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      {error && <div style={{ color: '#f85149', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>{error}<button style={{ marginLeft: 12, padding: '4px 12px', background: '#2a2a4a', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={reset}>↺ Reset</button></div>}

      {step === 0 && <button onClick={startSim} disabled={loading} style={{ display: 'block', margin: '0 auto', padding: '12px 32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>▶ Start Simulation</button>}

      {step >= 1 && !error && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          {step === 1 && <div><div style={{ fontSize: 36, marginBottom: 8 }}>👥</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Creating users...</div></div>}
          {step === 2 && <div><div style={{ fontSize: 36, marginBottom: 8 }}>📁</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Creating group...</div></div>}
          {step === 3 && <div><div style={{ fontSize: 36, marginBottom: 8 }}>💰</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{loading ? 'Adding expense...' : 'Expense added!'}</div></div>}
          {step === 4 && <div><div style={{ fontSize: 36, marginBottom: 8 }}>➗</div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Splitting equally...</div></div>}
          {step === 5 && result && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 16, maxWidth: 320, margin: '0 auto', border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: 'var(--info)', fontSize: 16, marginBottom: 12 }}>Expense Split!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Group: {result.group}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Expense: {result.expense}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0' }}>₹{result.amount?.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paid by {result.paidBy} • Split across {result.totalUsers} people</div>
              <button style={{ marginTop: 12, padding: '8px 20px', fontSize: 13, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={reset}>🔄 New Simulation</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SplitwisePage() {
  const [view, setView] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const handleUserSelect = (user) => { setSelectedUser(user); setView('groups'); };
  const handleGroupSelect = (group) => { setSelectedGroup(group); setView('expense'); };

  return (
    <div className="splitwise-app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="sw-header">
        <h1>Splitwise</h1>
        {selectedUser && <span className="sw-user-badge">{selectedUser.name[0]}</span>}
      </header>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="sw-btn" style={{ padding: '6px 14px', fontSize: 12, background: view === 'users' || view === 'groups' || view === 'expense' || view === 'balances' || view === 'settle' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0', color: view === 'users' || view === 'groups' || view === 'expense' || view === 'balances' || view === 'settle' ? '#fff' : '#555' }} onClick={() => setView('users')}>App</button>
        <button className="sw-btn" style={{ padding: '6px 14px', fontSize: 12, background: view === 'simulation' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0', color: view === 'simulation' ? '#fff' : '#555' }} onClick={() => setView('simulation')}>Simulation</button>
        <button className="sw-btn" style={{ padding: '6px 14px', fontSize: 12, background: view === 'diagram' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0', color: view === 'diagram' ? '#fff' : '#555' }} onClick={() => setView('diagram')}>📐 Class Diagram</button>
        <button className="sw-btn" style={{ padding: '6px 14px', fontSize: 12, background: view === 'design' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0', color: view === 'design' ? '#fff' : '#555' }} onClick={() => setView('design')}>Design Details</button>
      </nav>
      <main className="sw-main">
        {view === 'simulation' && <AnimatedFlow />}
        {view === 'design' && <DesignDetails module="splitwise" />}
        {view === 'diagram' && <ClassDiagram module="splitwise" />}
        {view !== 'simulation' && view !== 'design' && view !== 'diagram' && view === 'users' && <UserList onUserSelect={handleUserSelect} onUserCreated={() => {}} />}
        {view !== 'simulation' && view !== 'design' && view !== 'diagram' && view === 'groups' && selectedUser && <GroupList user={selectedUser} onGroupSelect={handleGroupSelect} onBack={() => { setSelectedUser(null); setView('users'); }} />}
        {view !== 'simulation' && view !== 'design' && view !== 'diagram' && view === 'expense' && selectedGroup && selectedUser && <AddExpense user={selectedUser} group={selectedGroup} onBack={() => { setSelectedGroup(null); setView('groups'); }} onExpenseAdded={() => setView('balances')} />}
        {view !== 'simulation' && view !== 'design' && view !== 'diagram' && view === 'balances' && selectedUser && <BalanceView user={selectedUser} onBack={() => setView('groups')} onSettle={(otherId) => setView('settle')} />}
        {view !== 'simulation' && view !== 'design' && view !== 'diagram' && view === 'settle' && selectedUser && <SettleUp user={selectedUser} onBack={() => setView('balances')} onSettled={() => setView('balances')} />}
      </main>
    </div>
  );
}
