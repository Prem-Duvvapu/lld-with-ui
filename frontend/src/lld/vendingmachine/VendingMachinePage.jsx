import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getSlots,
  getStatus,
  getChangeInventory,
  getTransactions,
  selectProduct,
  insertMoney,
  dispense,
  cancelTransaction,
  restock,
  refillChange,
  simReset,
  simSelect,
  simInsertMoney,
  simDispense,
  simCancel,
  simRestock,
  simGetSnapshot,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

const DENOMINATIONS = [
  { val: 1, label: '₹1', type: 'coin' },
  { val: 2, label: '₹2', type: 'coin' },
  { val: 5, label: '₹5', type: 'coin' },
  { val: 10, label: '₹10', type: 'coin' },
  { val: 20, label: '₹20', type: 'note' },
  { val: 50, label: '₹50', type: 'note' },
  { val: 100, label: '₹100', type: 'note' },
  { val: 500, label: '₹500', type: 'note' },
];

export default function VendingMachinePage() {
  const [activeTab, setActiveTab] = useState('machine');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            to="/"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← Home
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>🥤</span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Vending Machine System
              </h1>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                LLD #21
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              State Pattern (IDLE / SELECTION / MONEY / DISPENSING) &amp; Chain of Responsibility Change Dispenser
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ maxWidth: 1200, margin: '0 auto 24px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border-primary)', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'machine', label: '🥤 Vending Machine', desc: 'Interactive Hardware Showcase' },
          { id: 'admin', label: '🔧 Admin & Inventory', desc: 'Stock & Cashbox Management' },
          { id: 'simulation', label: '🕹️ 2D Interactive Simulation', desc: '8-Step State & CoR Sandbox' },
          { id: 'diagram', label: '📐 Class Diagram', desc: 'UML Architecture' },
          { id: 'sequence', label: '🔄 Sequence Diagram', desc: 'State Machine & Change Flow' },
          { id: 'design', label: '📋 Design Details', desc: 'Deep Dive Specs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: activeTab === tab.id ? '2px solid #3b82f6' : '1px solid var(--border-primary)',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              transition: 'all 0.2s ease',
              minWidth: 150,
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {activeTab === 'machine' && <MachineHardwareTab />}
        {activeTab === 'admin' && <AdminDashboardTab />}
        {activeTab === 'simulation' && <SimulationTab />}
        {activeTab === 'diagram' && <ClassDiagram module="vendingmachine" />}
        {activeTab === 'sequence' && <SequenceDiagram module="vendingmachine" />}
        {activeTab === 'design' && <DesignDetails module="vendingmachine" />}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 1: VENDING MACHINE HARDWARE CONSOLE
// =========================================================================

function MachineHardwareTab() {
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keypadInput, setKeypadInput] = useState('');
  const [dispensedItem, setDispensedItem] = useState(null);
  const [droppedChange, setDroppedChange] = useState(null);
  const [spinningSlot, setSpinningSlot] = useState(null);
  const [doorOpen, setDoorOpen] = useState(false);

  const fetchMachineData = async () => {
    try {
      const [sData, stData] = await Promise.all([getSlots(), getStatus()]);
      setSlots(sData);
      setStatus(stData);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchMachineData();
    const interval = setInterval(fetchMachineData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleKeypadPress = (val) => {
    setError('');
    if (val === 'CLR') {
      setKeypadInput('');
    } else if (val === 'ENT') {
      if (keypadInput.length >= 2) {
        handleSlotSelect(keypadInput.toUpperCase());
        setKeypadInput('');
      }
    } else {
      if (keypadInput.length < 2) {
        setKeypadInput((prev) => prev + val);
      }
    }
  };

  const handleSlotSelect = async (code) => {
    setLoading(true);
    setError('');
    try {
      await selectProduct(code);
      await fetchMachineData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertCash = async (denomVal) => {
    setLoading(true);
    setError('');
    try {
      await insertMoney(denomVal);
      await fetchMachineData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    setLoading(true);
    setError('');
    try {
      const activeSlot = status?.currentTransaction?.slotCode;
      if (activeSlot) {
        setSpinningSlot(activeSlot);
      }

      const txn = await dispense();
      setDispensedItem(txn);
      if (txn.changeAmount > 0) {
        setDroppedChange({ amount: txn.changeAmount, breakdown: txn.changeBreakdown });
      }
      setDoorOpen(true);
      setTimeout(() => setSpinningSlot(null), 1500);
      await fetchMachineData();
    } catch (e) {
      setSpinningSlot(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      const txn = await cancelTransaction();
      if (txn.changeAmount > 0) {
        setDroppedChange({ amount: txn.changeAmount, breakdown: txn.changeBreakdown });
        setDoorOpen(true);
      }
      await fetchMachineData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const collectItems = () => {
    setDispensedItem(null);
    setDroppedChange(null);
    setDoorOpen(false);
  };

  const currentTxn = status?.currentTransaction;
  const isReadyToDispense =
    currentTxn && currentTxn.insertedAmount >= currentTxn.itemPrice && currentTxn.itemPrice > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.4fr) minmax(320px, 1fr)', gap: 24, alignItems: 'start' }}>
      {/* LEFT: PHYSICAL VENDING MACHINE CABINET */}
      <div
        style={{
          background: 'linear-gradient(145deg, #0b1120, #1e293b)',
          borderRadius: 20,
          padding: '24px 20px',
          border: '4px solid #334155',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 2px 6px rgba(255,255,255,0.1)',
          position: 'relative',
        }}
      >
        {/* Machine Header Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>❄️</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              RoboVend 3000-X
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>ONLINE</span>
          </div>
        </div>

        {/* Glass Front Showcase */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
            borderRadius: 14,
            padding: 16,
            border: '2px solid #475569',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(59, 130, 246, 0.1)',
            minHeight: 460,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            position: 'relative',
          }}
        >
          {slots.map((slot) => {
            const isSelected = currentTxn?.slotCode === slot.code;
            const isSpinning = spinningSlot === slot.code;
            const isOut = slot.currentStock === 0;

            return (
              <div
                key={slot.code}
                onClick={() => !isOut && handleSlotSelect(slot.code)}
                style={{
                  background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(15, 23, 42, 0.75)',
                  borderRadius: 10,
                  padding: '10px 6px',
                  border: isSelected
                    ? '2px solid #3b82f6'
                    : isOut
                    ? '1px dashed #ef4444'
                    : '1px solid #334155',
                  boxShadow: isSelected ? '0 0 16px rgba(59, 130, 246, 0.4)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: isOut ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 110,
                }}
              >
                {/* Spiral Coil Illusion */}
                <div
                  style={{
                    position: 'absolute',
                    top: '25%',
                    left: '10%',
                    right: '10%',
                    height: 24,
                    borderBottom: '2px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '50%',
                    transform: isSpinning ? 'rotate(360deg)' : 'none',
                    transition: isSpinning ? 'transform 1.2s ease-in-out' : 'none',
                    pointerEvents: 'none',
                  }}
                />

                {/* Product Emoji */}
                <span
                  style={{
                    fontSize: 28,
                    marginBottom: 2,
                    transform: isSpinning ? 'translateY(12px) scale(0.9)' : 'none',
                    transition: 'transform 0.5s ease',
                  }}
                >
                  {slot.product?.emoji || '📦'}
                </span>

                {/* Name */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#e2e8f0',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {slot.product?.name}
                </div>

                {/* Code & Price Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: 4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      background: '#3b82f6',
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}
                  >
                    {slot.code}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>
                    ₹{slot.product?.price}
                  </span>
                </div>

                {/* Stock Indicator */}
                <div style={{ marginTop: 3 }}>
                  {isOut ? (
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 800 }}>SOLD OUT</span>
                  ) : (
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>{slot.currentStock} left</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Dispenser Flap & Tray */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: 4 }}>
            DISPENSER TRAY &amp; CHANGE HOPPER
          </div>
          <div
            onClick={collectItems}
            style={{
              background: '#020617',
              borderRadius: 12,
              padding: '14px 16px',
              border: doorOpen ? '2px solid #10b981' : '2px solid #1e293b',
              boxShadow: doorOpen ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'inset 0 4px 12px rgba(0,0,0,0.8)',
              minHeight: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: dispensedItem || droppedChange ? 'pointer' : 'default',
              transition: 'all 0.3s ease',
            }}
          >
            {dispensedItem || droppedChange ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'bounce 0.8s infinite alternate' }}>
                {dispensedItem && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: 8, border: '1px solid #10b981' }}>
                    <span style={{ fontSize: 24 }}>🥤</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{dispensedItem.productName}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>Click to Collect Item</div>
                    </div>
                  </div>
                )}
                {droppedChange && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(251, 191, 36, 0.2)', padding: '6px 12px', borderRadius: 8, border: '1px solid #fbbf24' }}>
                    <span style={{ fontSize: 22 }}>🪙</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>Change: ₹{droppedChange.amount}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>
                        {Object.entries(droppedChange.breakdown || {})
                          .map(([k, v]) => `${v}x ${k.replace('COIN_', '₹').replace('NOTE_', '₹')}`)
                          .join(', ')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                PUSH FLAP TO RETRIEVE ITEMS / CHANGE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: CONTROL PANEL & TELEMETRY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Digital Monospace LCD Display */}
        <div
          style={{
            background: '#041017',
            borderRadius: 14,
            padding: 16,
            border: '2px solid #083344',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #164e63', paddingBottom: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700 }}>
              STATE: <span style={{ color: '#38bdf8' }}>{status?.stateName || 'IDLE'}</span>
            </span>
            <span style={{ fontSize: 11, color: '#22d3ee' }}>
              KEYPAD: [{keypadInput || '__'}]
            </span>
          </div>

          <div style={{ fontSize: 14, fontWeight: 800, color: '#67e8f9', minHeight: 24, textShadow: '0 0 8px rgba(103, 232, 249, 0.6)' }}>
            {currentTxn
              ? currentTxn.message || `SELECTED: ${currentTxn.slotCode} - ₹${currentTxn.itemPrice}`
              : 'PLEASE SELECT CODE (A1-C4) OR INSERT CASH'}
          </div>

          {currentTxn && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, background: 'rgba(6, 182, 212, 0.08)', padding: 8, borderRadius: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>ITEM PRICE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>₹{currentTxn.itemPrice}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>INSERTED CASH</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: currentTxn.insertedAmount >= currentTxn.itemPrice ? '#10b981' : '#fbbf24' }}>
                  ₹{currentTxn.insertedAmount}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Numeric / Alphanumeric Keypad */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 16, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>
            KEYPAD SELECTION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['A', 'B', 'C', 'CLR', '1', '2', '3', '4', 'ENT'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeypadPress(k)}
                style={{
                  padding: '12px 6px',
                  borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                  background: k === 'ENT' ? '#10b981' : k === 'CLR' ? '#ef4444' : 'var(--bg-primary)',
                  color: k === 'ENT' || k === 'CLR' ? '#fff' : 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  gridColumn: k === 'ENT' ? 'span 2' : 'auto',
                  transition: 'transform 0.1s ease',
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Bill & Coin Acceptor */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 16, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>
            INSERT CASH (COINS &amp; BANKNOTES)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {DENOMINATIONS.map((d) => (
              <button
                key={d.val}
                onClick={() => handleInsertCash(d.val)}
                disabled={loading}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: d.type === 'note' ? '1px solid #10b981' : '1px solid #fbbf24',
                  background: d.type === 'note' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                  color: d.type === 'note' ? '#10b981' : '#fbbf24',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span>{d.label}</span>
                <span style={{ fontSize: 9, opacity: 0.7, textTransform: 'uppercase' }}>{d.type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls: Dispense & Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={handleDispense}
            disabled={!isReadyToDispense || loading}
            style={{
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: isReadyToDispense ? '#10b981' : '#334155',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13,
              cursor: isReadyToDispense ? 'pointer' : 'not-allowed',
              boxShadow: isReadyToDispense ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            🤖 DISPENSE ITEM
          </button>
          <button
            onClick={handleCancel}
            disabled={!currentTxn || loading}
            style={{
              padding: '12px',
              borderRadius: 10,
              border: '1px solid var(--border-primary)',
              background: currentTxn ? '#ef4444' : 'var(--bg-secondary)',
              color: currentTxn ? '#fff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: 13,
              cursor: currentTxn ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            ❌ CANCEL &amp; REFUND
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: ADMIN & INVENTORY DASHBOARD
// =========================================================================

function AdminDashboardTab() {
  const [slots, setSlots] = useState([]);
  const [changeInv, setChangeInv] = useState({});
  const [status, setStatus] = useState(null);
  const [txns, setTxns] = useState([]);
  const [msg, setMsg] = useState('');

  const loadAdminData = async () => {
    try {
      const [s, c, st, t] = await Promise.all([
        getSlots(),
        getChangeInventory(),
        getStatus(),
        getTransactions(),
      ]);
      setSlots(s);
      setChangeInv(c);
      setStatus(st);
      setTxns(t.slice(-10).reverse());
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRestock = async (slotCode, qty) => {
    try {
      await restock(slotCode, qty);
      setMsg(`Slot ${slotCode} restocked (+${qty})`);
      loadAdminData();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const handleRefillChange = async (denom, count) => {
    try {
      await refillChange(denom, count);
      setMsg(`Added ${count} units of ₹${denom}`);
      loadAdminData();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Telemetry Summary Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>CASHBOX REVENUE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 4 }}>₹{status?.cashboxBalance || 0}</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>TOTAL IN STOCK</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>
            {status?.totalItemsInStock || 0} <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/ 120 items</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>MACHINE STATUS</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', marginTop: 8 }}>{status?.stateName || 'IDLE'}</div>
        </div>
      </div>

      {msg && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
          ℹ️ {msg}
        </div>
      )}

      {/* Product Slots Inventory Grid */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 20, border: '1px solid var(--border-primary)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Slot Capacity &amp; Restock Drawer</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {slots.map((s) => (
            <div key={s.code} style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 10, border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 13, background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                  {s.code}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>₹{s.product?.price}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, margin: '6px 0 2px' }}>{s.product?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Stock: {s.currentStock} / {s.capacity}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleRestock(s.code, 5)}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  +5 Refill
                </button>
                <button
                  onClick={() => handleRestock(s.code, 10)}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  Max Fill
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Hopper Inventory (CoR Breakdown) */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 20, border: '1px solid var(--border-primary)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Change Hopper Denominations (Chain of Responsibility)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {DENOMINATIONS.map((d) => {
            const count = changeInv[d.val === 1 ? 'COIN_1' : d.val === 2 ? 'COIN_2' : d.val === 5 ? 'COIN_5' : d.val === 10 ? 'COIN_10' : d.val === 20 ? 'NOTE_20' : d.val === 50 ? 'NOTE_50' : d.val === 100 ? 'NOTE_100' : 'NOTE_500'] || 0;
            return (
              <div key={d.val} style={{ background: 'var(--bg-primary)', padding: 10, borderRadius: 10, border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: d.type === 'note' ? '#10b981' : '#fbbf24' }}>{d.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, margin: '4px 0' }}>{count} <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>units</span></div>
                <button
                  onClick={() => handleRefillChange(d.val, 10)}
                  style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  +10 Units
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transaction Ledger */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 20, border: '1px solid var(--border-primary)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Audit Transaction Ledger</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 12px' }}>TXN ID</th>
                <th style={{ padding: '8px 12px' }}>SLOT / PRODUCT</th>
                <th style={{ padding: '8px 12px' }}>PRICE</th>
                <th style={{ padding: '8px 12px' }}>PAID</th>
                <th style={{ padding: '8px 12px' }}>CHANGE</th>
                <th style={{ padding: '8px 12px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>#{t.id}</td>
                  <td style={{ padding: '8px 12px' }}>{t.productName} ({t.slotCode})</td>
                  <td style={{ padding: '8px 12px' }}>₹{t.itemPrice}</td>
                  <td style={{ padding: '8px 12px' }}>₹{t.insertedAmount}</td>
                  <td style={{ padding: '8px 12px', color: '#fbbf24' }}>₹{t.changeAmount}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 800,
                        background: t.status === 'DISPENSED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.status === 'DISPENSED' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 3: INTERACTIVE 2D SIMULATION
// =========================================================================

const SIM_STEPS = [
  { step: 1, title: 'Step 1: Machine Cold Boot', desc: 'Initialize isolated Vending Machine VM-SIM-01 with 12 slots and change hopper loaded.' },
  { step: 2, title: 'Step 2: Customer Keypad Selection', desc: 'Customer selects Doritos Nacho Cheese (Slot B2 - ₹35). State transitions to HAS_SELECTION.' },
  { step: 3, title: 'Step 3: Cash Validator Deposit', desc: 'Customer inserts ₹50 note into the bill acceptor. State records inserted amount.' },
  { step: 4, title: 'Step 4: Chain of Responsibility Evaluation', desc: 'Chain computes ₹15 change (₹50 - ₹35 = ₹15) across available hopper: 1x ₹10 + 1x ₹5.' },
  { step: 5, title: 'Step 5: Motor Activation & Item Drop', desc: 'Coil rotates, Doritos drops to dispenser tray, change dispensed into return pocket.' },
  { step: 6, title: 'Step 6: Customer Collection & State Reset', desc: 'Customer collects snack and coins. Machine resets back to IDLE state.' },
  { step: 7, title: 'Step 7: Out-of-Stock Edge Case Rejection', desc: 'Customer attempts selecting empty slot A3 (Sparkling Water) -> OutOfStockException cleanly raised.' },
  { step: 8, title: 'Step 8: Cancel & Full Refund Demo', desc: 'Customer inserts ₹20, hits cancel -> CoR executes full refund and resets state safely.' },
];

function SimulationTab() {
  const [currentStep, setCurrentStep] = useState(1);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoPlaying, setAutoPlaying] = useState(false);

  const executeStep = async (stepNum) => {
    setLoading(true);
    setError('');
    try {
      let snap;
      if (stepNum === 1) {
        snap = await simReset();
      } else if (stepNum === 2) {
        snap = await simSelect('B2', 2);
      } else if (stepNum === 3) {
        snap = await simInsertMoney(50, 3);
      } else if (stepNum === 4) {
        // Just inspect state before dispense
        snap = await simGetSnapshot();
      } else if (stepNum === 5) {
        snap = await simDispense(5);
      } else if (stepNum === 6) {
        snap = await simGetSnapshot();
      } else if (stepNum === 7) {
        // Attempt empty slot A3
        try {
          await simSelect('A3', 7);
        } catch (e) {
          setError(`Expected Exception: ${e.message}`);
        }
        snap = await simGetSnapshot();
      } else if (stepNum === 8) {
        await simInsertMoney(20, 8);
        snap = await simCancel(8);
      }
      setSnapshot(snap);
      setCurrentStep(stepNum);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeStep(1);
  }, []);

  const handleNext = () => {
    if (currentStep < 8) {
      executeStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      executeStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    executeStep(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step Navigation Ribbon */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: 18, border: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>
              Educational Sandbox
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0' }}>
              {SIM_STEPS[currentStep - 1]?.title}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {SIM_STEPS[currentStep - 1]?.desc}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Prev Step
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === 8 || loading}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 800, fontSize: 12, cursor: currentStep === 8 ? 'not-allowed' : 'pointer' }}
            >
              Next Step →
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              ↺ Reset Sim
            </button>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
          {SIM_STEPS.map((s) => (
            <div
              key={s.step}
              onClick={() => executeStep(s.step)}
              style={{
                height: 6,
                borderRadius: 3,
                background: s.step === currentStep ? '#3b82f6' : s.step < currentStep ? '#10b981' : 'var(--border-primary)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              title={s.title}
            />
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* 2D Interactive Stage & Telemetry Log */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(320px, 1fr)', gap: 20 }}>
        {/* Visual 2D Machine State Canvas */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0b1329, #1e293b)',
            borderRadius: 16,
            padding: 20,
            border: '2px solid #334155',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* LCD Sim Header */}
          <div style={{ background: '#020617', padding: 12, borderRadius: 10, border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 800 }}>
              STATE: {snapshot?.stateName || 'IDLE'}
            </span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
              CASHBOX: ₹{snapshot?.cashboxBalance || 0}
            </span>
          </div>

          {/* 3x4 Slot Snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '14px 0' }}>
            {(snapshot?.slots || []).map((slot) => {
              const isTarget = (currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) && slot.code === 'B2';
              const isA3Target = currentStep === 7 && slot.code === 'A3';

              return (
                <div
                  key={slot.code}
                  style={{
                    background: isTarget
                      ? 'rgba(59, 130, 246, 0.3)'
                      : isA3Target
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(15, 23, 42, 0.8)',
                    borderRadius: 8,
                    padding: 8,
                    border: isTarget
                      ? '2px solid #3b82f6'
                      : isA3Target
                      ? '2px dashed #ef4444'
                      : '1px solid #334155',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{slot.product?.emoji || '📦'}</span>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slot.product?.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                    <span>{slot.code}</span>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>₹{slot.product?.price}</span>
                  </div>
                  <div style={{ fontSize: 8, color: slot.currentStock === 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {slot.currentStock === 0 ? 'OUT' : `${slot.currentStock} left`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Transaction Banner */}
          <div style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: 10, padding: 12, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>ACTIVE TRANSACTION DATA</div>
            {snapshot?.currentTransaction ? (
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#f8fafc', fontWeight: 800 }}>
                  {snapshot.currentTransaction.productName} ({snapshot.currentTransaction.slotCode})
                </span>
                <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 800 }}>
                  Paid: ₹{snapshot.currentTransaction.insertedAmount} / ₹{snapshot.currentTransaction.itemPrice}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>No active transaction (Ready for selection)</div>
            )}
          </div>
        </div>

        {/* Real-time Telemetry HUD Events Feed */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Telemetry Event Stream</h3>
            <span style={{ fontSize: 10, background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
              {(snapshot?.events || []).length} Events
            </span>
          </div>

          <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(snapshot?.events || []).map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: 'var(--bg-primary)',
                  padding: 10,
                  borderRadius: 8,
                  border: ev.status === 'ERROR' ? '1px solid #ef4444' : ev.status === 'WARNING' ? '1px solid #fbbf24' : '1px solid var(--border-primary)',
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span style={{ color: ev.status === 'ERROR' ? '#ef4444' : ev.status === 'WARNING' ? '#fbbf24' : '#10b981' }}>
                    [{ev.eventType}] {ev.title}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Step {ev.stepNumber}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.3 }}>
                  {ev.description}
                </div>
                {ev.details && Object.keys(ev.details).length > 0 && (
                  <div style={{ marginTop: 6, padding: '4px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>
                    {JSON.stringify(ev.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
