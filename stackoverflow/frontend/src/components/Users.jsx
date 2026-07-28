import { useState, useEffect } from 'react';
import { getUsers } from '../api';

const REP_BADGES = [
  { min: 1000, label: 'Gold', cls: '#ffd700' },
  { min: 200, label: 'Silver', cls: '#c0c0c0' },
  { min: 50, label: 'Bronze', cls: '#cd7f32' },
];

function getBadge(rep) {
  for (const b of REP_BADGES) {
    if (rep >= b.min) return b;
  }
  return null;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="alert">Loading users...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Users</h2>
      <div className="user-grid">
        {users.map((u) => {
          const badge = getBadge(u.reputation);
          return (
            <div key={u.id} className="user-card">
              <div className="avatar">{u.username[0].toUpperCase()}</div>
              <div className="username">{u.username}</div>
              <div className="reputation">
                {badge && <span style={{ color: badge.cls, marginRight: 4 }}>●</span>}
                {u.reputation} rep
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                Joined {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
