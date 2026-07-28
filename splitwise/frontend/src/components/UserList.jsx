import { useState, useEffect } from 'react';
import { getUsers, createUser } from '../api';

export default function UserList({ onUserSelect, onUserCreated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      const user = await createUser(name.trim(), email.trim());
      setUsers([...users, user]);
      setName('');
      setEmail('');
      onUserCreated(user);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="sw-loading">Loading users...</div>;
  if (error) return <div className="sw-error">{error}</div>;

  return (
    <div>
      <form className="sw-form" onSubmit={handleCreate}>
        <h3>Create User</h3>
        <label>Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
        />
        <button type="submit" className="sw-btn" disabled={!name.trim() || !email.trim()}>
          Create User
        </button>
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
