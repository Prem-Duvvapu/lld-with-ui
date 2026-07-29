import { useState } from 'react';
import LldPage from '../../components/LldPage';

const CSS = `
.rest-container { background: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 12px; padding: 20px; }
.rest-stage { position: relative; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); padding: 20px; margin-bottom: 20px; }

.table-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
.table-card { background: var(--bg-card); border: 2px solid var(--border-primary); border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s; position: relative; }
.table-card.occupied { border-color: var(--warning); background: rgba(255,204,0,0.05); }
.table-card.cooking { border-color: var(--info); background: rgba(102,126,234,0.05); }
.table-card.served { border-color: var(--success); background: rgba(63,185,80,0.08); }

.menu-selector { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.menu-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-size: 12px; }
.menu-btn.active { border-color: var(--accent); background: var(--accent-gradient); color: #fff; }
`;

function AnimatedFlow() {
  const [tables, setTables] = useState([
    { id: 'T1', seats: 2, status: 'VACANT', order: null },
    { id: 'T2', seats: 4, status: 'VACANT', order: null },
    { id: 'T3', seats: 4, status: 'VACANT', order: null },
    { id: 'T4', seats: 6, status: 'VACANT', order: null },
    { id: 'T5', seats: 2, status: 'VACANT', order: null },
    { id: 'T6', seats: 4, status: 'VACANT', order: null },
  ]);
  const [selectedTableId, setSelectedTableId] = useState('T1');
  const [selectedItems, setSelectedItems] = useState(['🍝 Spaghetti Carbonara', '🍷 Red Wine']);
  const [log, setLog] = useState('Select a table to seat guests and place order.');

  const menuOptions = ['🍝 Spaghetti Carbonara', '🍕 Truffle Pizza', '🍷 Red Wine', '🍰 Tiramisu', '🥗 Caesar Salad'];

  const toggleMenuItem = (item) => {
    setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSeatAndOrder = () => {
    setTables(prev => prev.map(t => {
      if (t.id === selectedTableId) {
        return { ...t, status: 'OCCUPIED', order: selectedItems };
      }
      return t;
    }));
    setLog(`👥 Guests seated at Table ${selectedTableId}. Order placed: [${selectedItems.join(', ')}]. Sent to Kitchen.`);
  };

  const handleChefCook = () => {
    setTables(prev => prev.map(t => {
      if (t.id === selectedTableId && t.status === 'OCCUPIED') {
        return { ...t, status: 'COOKING' };
      }
      return t;
    }));
    setLog(`👨‍🍳 Chef in kitchen preparing items for Table ${selectedTableId}...`);

    setTimeout(() => {
      setTables(prev => prev.map(t => {
        if (t.id === selectedTableId && t.status === 'COOKING') {
          return { ...t, status: 'SERVED' };
        }
        return t;
      }));
      setLog(`🍽️ Waiter served order to Table ${selectedTableId}! Guests eating.`);
    }, 1500);
  };

  const handleSettleBill = () => {
    setTables(prev => prev.map(t => {
      if (t.id === selectedTableId) {
        return { ...t, status: 'VACANT', order: null };
      }
      return t;
    }));
    setLog(`💵 Table ${selectedTableId} settled bill ($75.00). Table cleared and VACANT.`);
  };

  const activeTable = tables.find(t => t.id === selectedTableId);

  return (
    <div className="rest-container">
      <style>{CSS}</style>

      <div className="rest-stage">
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
          RESTAURANT FLOOR PLAN & TABLE MANAGEMENT
        </div>

        <div className="table-grid">
          {tables.map(t => (
            <div key={t.id} className={`table-card ${t.status.toLowerCase()} ${selectedTableId === t.id ? 'selected' : ''}`} onClick={() => setSelectedTableId(t.id)}>
              <div style={{ fontSize: 24 }}>
                {t.status === 'VACANT' ? '🪑' : t.status === 'OCCUPIED' ? '👥' : t.status === 'COOKING' ? '🍳' : '🍽️'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>Table {t.id} ({t.seats} Seats)</div>
              <div style={{ fontSize: 11, color: t.status === 'VACANT' ? 'var(--text-muted)' : t.status === 'SERVED' ? 'var(--success)' : 'var(--warning)', fontWeight: 600, marginTop: 2 }}>
                Status: {t.status}
              </div>
              {t.order && (
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.order.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Menu & Controls */}
      <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-primary)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Menu Items for Table {selectedTableId}:
        </div>
        <div className="menu-selector">
          {menuOptions.map(item => (
            <button key={item} className={`menu-btn ${selectedItems.includes(item) ? 'active' : ''}`} onClick={() => toggleMenuItem(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={handleSeatAndOrder} disabled={activeTable?.status !== 'VACANT'} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--accent-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: activeTable?.status !== 'VACANT' ? 0.4 : 1 }}>
          👥 Seat & Place Order
        </button>

        <button onClick={handleChefCook} disabled={activeTable?.status !== 'OCCUPIED'} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--info)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: activeTable?.status !== 'OCCUPIED' ? 0.4 : 1 }}>
          👨‍🍳 Cook & Serve
        </button>

        <button onClick={handleSettleBill} disabled={activeTable?.status === 'VACANT'} style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: activeTable?.status === 'VACANT' ? 0.4 : 1 }}>
          💵 Settle Bill & Checkout
        </button>
      </div>

      <div style={{ marginTop: 16, background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--info)', textAlign: 'center', fontWeight: 600 }}>
        {log}
      </div>
    </div>
  );
}

export default function RestaurantPage() {
  return (
    <LldPage module="restaurant" title="Restaurant Management" icon="🍽️" tabs={['app', 'simulation', 'diagram', 'design']}>
      {(activeTab) => (
        <>
          {activeTab === 'simulation' && <AnimatedFlow />}
          {activeTab === 'app' && <AnimatedFlow />}
        </>
      )}
    </LldPage>
  );
}
