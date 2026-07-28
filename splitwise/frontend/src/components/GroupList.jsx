import { useState, useEffect } from 'react';
import { getGroups, createGroup, getUsers } from '../api';

export default function GroupList({ user, onGroupSelect, onBack }) {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    Promise.all([getGroups(), getUsers()])
      .then(([groupsData, usersData]) => {
        setGroups(groupsData);
        setAllUsers(usersData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const userGroups = groups.filter((g) => g.members && g.members.some((m) => m.id === user.id));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const memberIds = [...new Set([...selectedMembers, user.id])];
    try {
      const group = await createGroup(name.trim(), memberIds);
      setGroups([...groups, group]);
      setName('');
      setSelectedMembers([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="sw-loading">Loading groups...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <button className="sw-back-btn" onClick={onBack}>&larr; Back to users</button>
      <form className="sw-form" onSubmit={handleCreate}>
        <h3>Create Group</h3>
        <label>Group Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter group name"
        />
        <label>Add Members</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {allUsers.filter((u) => u.id !== user.id).map((u) => (
            <label
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6, fontSize: 13,
                background: selectedMembers.includes(u.id) ? '#667eea' : '#f0f0f0',
                color: selectedMembers.includes(u.id) ? '#fff' : '#333',
                cursor: 'pointer', userSelect: 'none'
              }}
            >
              <input
                type="checkbox"
                checked={selectedMembers.includes(u.id)}
                onChange={() => toggleMember(u.id)}
                style={{ display: 'none' }}
              />
              {u.name}
            </label>
          ))}
        </div>
        <button type="submit" className="sw-btn" disabled={!name.trim()}>
          Create Group
        </button>
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
