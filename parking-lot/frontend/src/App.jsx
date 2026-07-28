import { useState } from 'react';
import ParkingLot from './components/ParkingLot';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('entry');

  return (
    <div className="app">
      <header>
        <h1>Parking Lot System</h1>
        <p>Low-Level Design with UI</p>
      </header>

      <nav>
        {[
          { key: 'entry', label: 'Vehicle Entry' },
          { key: 'exit', label: 'Vehicle Exit' },
          { key: 'spots', label: 'Spots' },
          { key: 'tickets', label: 'Active Tickets' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        <ParkingLot activeTab={activeTab} />
      </main>
    </div>
  );
}

export default App;
