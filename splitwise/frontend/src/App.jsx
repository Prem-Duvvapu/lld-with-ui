import { useState } from 'react';
import UserList from './components/UserList';
import GroupList from './components/GroupList';
import AddExpense from './components/AddExpense';
import BalanceView from './components/BalanceView';
import SettleUp from './components/SettleUp';

export default function App() {
  const [view, setView] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setView('groups');
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setView('expense');
  };

  return (
    <div className="splitwise-app">
      <header className="sw-header">
        <h1>Splitwise</h1>
        {selectedUser && <span className="sw-user-badge">{selectedUser.name}</span>}
      </header>
      <main className="sw-main">
        {view === 'users' && (
          <UserList onUserSelect={handleUserSelect} onUserCreated={() => {}} />
        )}
        {view === 'groups' && selectedUser && (
          <GroupList
            user={selectedUser}
            onGroupSelect={handleGroupSelect}
            onBack={() => { setSelectedUser(null); setView('users'); }}
          />
        )}
        {view === 'expense' && selectedGroup && selectedUser && (
          <AddExpense
            user={selectedUser}
            group={selectedGroup}
            onBack={() => { setSelectedGroup(null); setView('groups'); }}
            onExpenseAdded={() => setView('balances')}
          />
        )}
        {view === 'balances' && selectedUser && (
          <BalanceView
            user={selectedUser}
            onBack={() => setView('groups')}
            onSettle={(otherId) => setView('settle')}
          />
        )}
        {view === 'settle' && selectedUser && (
          <SettleUp
            user={selectedUser}
            onBack={() => setView('balances')}
            onSettled={() => setView('balances')}
          />
        )}
      </main>
    </div>
  );
}
