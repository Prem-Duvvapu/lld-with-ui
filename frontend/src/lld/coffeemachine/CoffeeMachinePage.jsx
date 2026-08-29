import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getMenu,
  getStatus,
  getInventory,
  getOrders,
  startOrder,
  addCustomization,
  insertPayment,
  brew,
  collectCoffee,
  cancelOrder,
  refillIngredient,
  simReset,
  simSelectBase,
  simAddCustomization,
  simInsertPayment,
  simBrew,
  simCollect,
  simCancel,
  simRefill,
  simSetStock,
  simRace,
  simGetSnapshot,
} from './api';
import ClassDiagram from '../../components/ClassDiagram';
import SequenceDiagram from '../../components/SequenceDiagram';
import DesignDetails from '../../components/DesignDetails';
import ThemeToggle from '../../components/ThemeToggle';

const ADD_ONS = [
  { id: 'EXTRA_SHOT', name: 'Extra Espresso Shot', price: 40, emoji: '⚡', desc: '+10g Beans, +30ml Water' },
  { id: 'EXTRA_MILK', name: 'Extra Steamed Milk', price: 20, emoji: '🥛', desc: '+60ml Steamed Milk' },
  { id: 'WHIPPED_CREAM', name: 'Whipped Cream', price: 30, emoji: '🍦', desc: '+25g Sweet Cream' },
  { id: 'CARAMEL_SYRUP', name: 'Caramel Syrup', price: 25, emoji: '🍯', desc: '+20ml Artisan Caramel' },
  { id: 'OAT_MILK', name: 'Oat Milk Sub', price: 35, emoji: '🌾', desc: 'Replace Dairy Milk with Oat Milk' },
];

export default function CoffeeMachinePage() {
  const [activeTab, setActiveTab] = useState('order');

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
              <span style={{ fontSize: 24 }}>☕</span>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Coffee Vending Machine
              </h1>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 700, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                LLD #14
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Decorator Pattern Customizations &bull; Factory Recipe Registry &bull; State Pattern FSM &bull; Deadlock-Free Multi-Locking
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
          { id: 'order', label: '☕ Order & Customize', desc: 'Decorator Barista Console' },
          { id: 'admin', label: '🎛️ Inventory & Refill', desc: 'Ingredient Hoppers & Admin' },
          { id: 'concurrency', label: '🔒 Concurrency Simulation', desc: 'Deadlock-Free Multi-Locking' },
          { id: 'diagram', label: '📐 Class Diagram', desc: 'UML Architecture' },
          { id: 'sequence', label: '🔄 Sequence Diagram', desc: 'State Machine & Order Flow' },
          { id: 'design', label: '📋 Design Details', desc: 'Design Specs & Patterns' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: activeTab === tab.id ? '2px solid #a855f7' : '1px solid var(--border-primary)',
              background: activeTab === tab.id ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-secondary)',
              color: activeTab === tab.id ? '#a855f7' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              transition: 'all 0.2s ease',
              minWidth: 160,
            }}
          >
            <span>{tab.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {activeTab === 'order' && <OrderBaristaTab />}
        {activeTab === 'admin' && <AdminInventoryTab />}
        {activeTab === 'concurrency' && <ConcurrencySimulationTab />}
        {activeTab === 'diagram' && <ClassDiagram module="coffeemachine" />}
        {activeTab === 'sequence' && <SequenceDiagram module="coffeemachine" />}
        {activeTab === 'design' && <DesignDetails module="coffeemachine" />}
      </div>
    </div>
  );
}

// =========================================================================
// TAB 1: ORDER & CUSTOMIZE (DECORATOR BARISTA CONSOLE)
// =========================================================================

function OrderBaristaTab() {
  const [menu, setMenu] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brewingAnimation, setBrewingAnimation] = useState(false);

  const fetchState = async () => {
    try {
      const [m, st] = await Promise.all([getMenu(), getStatus()]);
      setMenu(m);
      setStatus(st);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectBase = async (type) => {
    setLoading(true);
    setError('');
    try {
      await startOrder(type);
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomization = async (addOnId) => {
    setLoading(true);
    setError('');
    try {
      await addCustomization(addOnId);
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertPayment = async (amount) => {
    setLoading(true);
    setError('');
    try {
      await insertPayment(amount);
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBrew = async () => {
    setLoading(true);
    setError('');
    setBrewingAnimation(true);
    try {
      await brew();
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setBrewingAnimation(false), 2000);
    }
  };

  const handleCollect = async () => {
    setLoading(true);
    setError('');
    try {
      await collectCoffee();
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError('');
    try {
      await cancelOrder();
      await fetchState();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentOrder = status?.currentOrder;
  const isPaidEnough = currentOrder && currentOrder.amountPaid >= currentOrder.totalPrice;
  const isDispensed = status?.stateName === 'DISPENSED';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.3fr) minmax(320px, 1fr)', gap: 24, alignItems: 'start' }}>
      {/* LEFT: ARTISAN MENU & DECORATOR BUILDER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Base Coffee Menu */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Step 1: Choose Base Coffee (Factory Pattern)</h3>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>5 Handcrafted Formulas</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {menu.map((recipe) => {
              const isSelected = currentOrder?.baseCoffeeName === recipe.name;
              return (
                <div
                  key={recipe.type}
                  onClick={() => handleSelectBase(recipe.type)}
                  style={{
                    background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-primary)',
                    borderRadius: 12,
                    padding: 14,
                    border: isSelected ? '2px solid #a855f7' : '1px solid var(--border-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.3)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{recipe.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>₹{recipe.basePrice}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8 }}>{recipe.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.2 }}>
                    {recipe.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decorator Customizations (Add-ons) */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Step 2: Add Customizations (Decorator Pattern)</h3>
            <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 700 }}>Chainable Add-ons</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {ADD_ONS.map((addOn) => {
              const count = (currentOrder?.customizations || []).filter((c) => c.toUpperCase().includes(addOn.id) || c.includes(addOn.name)).length;

              return (
                <button
                  key={addOn.id}
                  onClick={() => handleAddCustomization(addOn.id)}
                  disabled={!currentOrder || status?.stateName === 'PAYMENT_PENDING' || status?.stateName === 'BREWING'}
                  style={{
                    background: count > 0 ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-primary)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    border: count > 0 ? '1px solid #a855f7' : '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    cursor: !currentOrder ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: !currentOrder ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {addOn.emoji} {addOn.name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>+₹{addOn.price}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{addOn.desc}</div>
                  {count > 0 && (
                    <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 800 }}>✓ Applied ({count}x)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: LIVE CUP VISUALIZER & PAYMENT CONSOLE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Dynamic Cup & Machine HUD */}
        <div
          style={{
            background: 'linear-gradient(145deg, #111827, #1f2937)',
            borderRadius: 20,
            padding: 24,
            border: '2px solid #374151',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* LCD Status Pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#030712', padding: '6px 14px', borderRadius: 20, border: '1px solid #1f2937', marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#c084fc' }}>
              STATE: {status?.stateName || 'IDLE'}
            </span>
          </div>

          {/* Animated Coffee Cup & Steam */}
          <div style={{ position: 'relative', height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
            {brewingAnimation && (
              <div style={{ position: 'absolute', top: 10, fontSize: 24, animation: 'bounce 1s infinite alternate' }}>
                ♨️ ♨️ ♨️
              </div>
            )}

            {/* Coffee Cup Container */}
            <div
              style={{
                width: 120,
                height: 140,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15))',
                borderRadius: '8px 8px 30px 30px',
                border: '3px solid #6b7280',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6), 0 10px 25px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              {currentOrder ? (
                <>
                  {/* Whipped Cream layer */}
                  {(currentOrder.customizations || []).some((c) => c.toUpperCase().includes('WHIPPED')) && (
                    <div style={{ height: 25, background: '#f8fafc', borderBottom: '1px dashed #cbd5e1' }} title="Whipped Cream Layer" />
                  )}
                  {/* Steamed Milk / Oat Milk layer */}
                  <div
                    style={{
                      height: 50,
                      background: (currentOrder.customizations || []).some((c) => c.toUpperCase().includes('OAT')) ? '#fef3c7' : '#f1f5f9',
                    }}
                    title="Steamed Milk / Foam"
                  />
                  {/* Espresso Base layer */}
                  <div style={{ height: 45, background: '#451a03' }} title="Dark Espresso Extraction" />
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 50 }}>Cup Ready</div>
              )}
            </div>
          </div>

          {/* Assembled Order Description & Price */}
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 12, border: '1px solid #374151' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f9fafb' }}>
              {currentOrder ? currentOrder.description : 'Please select a base coffee'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>
              ₹{currentOrder ? currentOrder.totalPrice : 0}
            </div>
            {currentOrder && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Paid: ₹{currentOrder.amountPaid} &bull; Change Due: ₹{Math.max(0, currentOrder.amountPaid - currentOrder.totalPrice)}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Cash Deposit & Payment Buttons */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>
            INSERT PAYMENT (INR)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => handleInsertPayment(amt)}
                disabled={!currentOrder || loading || isDispensed}
                style={{
                  padding: '10px 4px',
                  borderRadius: 8,
                  border: '1px solid #10b981',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: !currentOrder || isDispensed ? 'not-allowed' : 'pointer',
                }}
              >
                +₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls: Brew / Collect / Cancel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {isDispensed ? (
            <button
              onClick={handleCollect}
              disabled={loading}
              style={{
                gridColumn: 'span 2',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              🥤 COLLECT COFFEE &amp; CHANGE
            </button>
          ) : (
            <>
              <button
                onClick={handleBrew}
                disabled={!isPaidEnough || loading}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: isPaidEnough ? '#a855f7' : '#4b5563',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: isPaidEnough ? 'pointer' : 'not-allowed',
                  boxShadow: isPaidEnough ? '0 0 15px rgba(168, 85, 247, 0.4)' : 'none',
                }}
              >
                ☕ START BREW
              </button>
              <button
                onClick={handleCancel}
                disabled={!currentOrder || loading}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-primary)',
                  background: currentOrder ? '#ef4444' : 'var(--bg-secondary)',
                  color: currentOrder ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: currentOrder ? 'pointer' : 'not-allowed',
                }}
              >
                ❌ CANCEL
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: INVENTORY & REFILL (ADMIN)
// =========================================================================

function AdminInventoryTab() {
  const [invData, setInvData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      const [inv, ords] = await Promise.all([getInventory(), getOrders()]);
      setInvData(inv);
      setOrders(ords.slice(-10).reverse());
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefill = async (ing, amt) => {
    try {
      await refillIngredient(ing, amt);
      setMsg(`Refilled ${ing} (+${amt})`);
      loadData();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const stock = invData?.stock || {};
  const capacities = invData?.capacities || {};
  const thresholds = invData?.thresholds || {};
  const alerts = invData?.lowStockAlerts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {msg && (
        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#a855f7', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
          ℹ️ {msg}
        </div>
      )}

      {/* Ingredient Hoppers Gauge Cards */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Ingredient Hoppers Telemetry</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Object.keys(stock).map((ing) => {
            const current = stock[ing] || 0;
            const maxCap = capacities[ing] || 2000;
            const thresh = thresholds[ing] || 100;
            const pct = Math.min(100, Math.round((current / maxCap) * 100));
            const isLow = current < thresh;

            return (
              <div key={ing} style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 12, border: isLow ? '1px solid #ef4444' : '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{ing.replace('_', ' ')}</span>
                  {isLow ? (
                    <span style={{ fontSize: 10, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>LOW STOCK</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{pct}% Fill</span>
                  )}
                </div>

                <div style={{ fontSize: 20, fontWeight: 900, margin: '8px 0 4px', color: isLow ? '#ef4444' : '#a855f7' }}>
                  {current} <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>/ {maxCap}</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: 'var(--border-primary)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: isLow ? '#ef4444' : '#a855f7', transition: 'width 0.3s ease' }} />
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleRefill(ing, 500)}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    +500 Refill
                  </button>
                  <button
                    onClick={() => handleRefill(ing, maxCap - current)}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Max Fill
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Ledger */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Recent Coffee Orders Audit</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 12px' }}>ORDER ID</th>
                <th style={{ padding: '8px 12px' }}>RECIPE &amp; ADD-ONS</th>
                <th style={{ padding: '8px 12px' }}>PRICE</th>
                <th style={{ padding: '8px 12px' }}>PAID</th>
                <th style={{ padding: '8px 12px' }}>CHANGE</th>
                <th style={{ padding: '8px 12px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderId} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>#{o.orderId}</td>
                  <td style={{ padding: '8px 12px' }}>{o.description}</td>
                  <td style={{ padding: '8px 12px' }}>₹{o.totalPrice}</td>
                  <td style={{ padding: '8px 12px' }}>₹{o.amountPaid}</td>
                  <td style={{ padding: '8px 12px', color: '#fbbf24' }}>₹{o.changeReturned}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 800,
                        background: o.status === 'DISPENSED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: o.status === 'DISPENSED' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {o.status}
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
// TAB 3: CONCURRENCY SIMULATION (DEADLOCK-FREE MULTI-LOCKING)
// =========================================================================

const SIM_STEPS = [
  { step: 1, title: 'Step 1: Machine Cold Boot', desc: 'Bootstraps COFFEE-SIM-01 with full ingredient stores in IDLE state.' },
  { step: 2, title: 'Step 2: Base Coffee Selection', desc: 'Customer selects Caffe Latte (₹120) from CoffeeFactory registry.' },
  { step: 3, title: 'Step 3: Decorator Customization Chain', desc: 'Customer chains ExtraShot (+₹40) and WhippedCream (+₹30) decorators (Total: ₹190).' },
  { step: 4, title: 'Step 4: Cash Deposit & Pre-check', desc: 'Inserts ₹200. Preliminary check confirms assembled ingredients availability.' },
  { step: 5, title: 'Step 5: Atomic Multi-Lock & Brew', desc: 'Acquires locks in ascending enum order (BEANS -> MILK -> WATER -> CREAM), decrements stores atomically, and brews.' },
  { step: 6, title: 'Step 6: Dispense & Cup Collection', desc: 'Dispenses cup with ₹10 change. Customer collects drink; state resets to IDLE.' },
  { step: 7, title: 'Step 7: Insufficient Ingredient Rejection', desc: 'Caramel Syrup hopper is pinned to 5ml (Mocha needs 20ml). Ordering a Mocha is cleanly rejected with InsufficientIngredientException, then the hopper is refilled.' },
  { step: 8, title: 'Step 8: Overlapping Race Condition Test', desc: 'Dispatches 2 concurrent threads demanding overlapping ingredients ({Beans, Water} vs {Water, Milk}) -> zero deadlocks.' },
];

function ConcurrencySimulationTab() {
  const [currentStep, setCurrentStep] = useState(1);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeStep = async (stepNum) => {
    setLoading(true);
    setError('');
    try {
      let snap;
      if (stepNum === 1) snap = await simReset();
      else if (stepNum === 2) snap = await simSelectBase('LATTE', 2);
      else if (stepNum === 3) {
        await simAddCustomization('EXTRA_SHOT', 3);
        snap = await simAddCustomization('WHIPPED_CREAM', 3);
      } else if (stepNum === 4) snap = await simInsertPayment(200, 4);
      else if (stepNum === 5) snap = await simBrew(5);
      else if (stepNum === 6) snap = await simCollect(6);
      else if (stepNum === 7) {
        // Pin Caramel Syrup low, then attempt a Mocha (needs 20ml) — this is the failure path:
        // the real backend rejects it with InsufficientIngredientException before any state
        // changes, which the telemetry log records as an ERROR event. Refill afterward so the
        // hopper is healthy again for the rest of the demo.
        await simSetStock('CARAMEL_SYRUP', 5, 7);
        try {
          await simSelectBase('MOCHA', 7);
        } catch (rejectionExpected) {
          // Expected — the whole point of this step. Surfaced via the event log below.
        }
        snap = await simRefill('CARAMEL_SYRUP', 500, 7);
      }
      else if (stepNum === 8) snap = await simRace(8);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step Ribbon */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 18, border: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#a855f7', textTransform: 'uppercase' }}>
              Concurrency &amp; Decorator Sandbox
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
              onClick={() => executeStep(currentStep - 1)}
              disabled={currentStep === 1 || loading}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: currentStep === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Prev
            </button>
            <button
              onClick={() => executeStep(currentStep + 1)}
              disabled={currentStep === 8 || loading}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#a855f7', color: '#fff', fontWeight: 800, fontSize: 12, cursor: currentStep === 8 ? 'not-allowed' : 'pointer' }}
            >
              Next Step →
            </button>
            <button
              onClick={() => executeStep(1)}
              disabled={loading}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Step Dots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
          {SIM_STEPS.map((s) => (
            <div
              key={s.step}
              onClick={() => executeStep(s.step)}
              style={{
                height: 6,
                borderRadius: 3,
                background: s.step === currentStep ? '#a855f7' : s.step < currentStep ? '#10b981' : 'var(--border-primary)',
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

      {/* 2D Concurrency Stage & Event HUD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(320px, 1fr)', gap: 20 }}>
        {/* Visual Stage */}
        <div style={{ background: 'linear-gradient(135deg, #180d2b, #1e1b4b)', borderRadius: 16, padding: 20, border: '2px solid #3730a3', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ background: '#090514', padding: 12, borderRadius: 10, border: '1px solid #2e1065', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#c084fc', fontWeight: 800 }}>
              SIM STATE: {snapshot?.stateName || 'IDLE'}
            </span>
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
              BREW HEAD: UNLOCKED
            </span>
          </div>

          {/* Active Order Card */}
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: 14, borderRadius: 12, border: '1px solid #4338ca', margin: '14px 0' }}>
            <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700 }}>ACTIVE DECORATOR ASSEMBLED ORDER</div>
            {snapshot?.currentOrder ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{snapshot.currentOrder.description}</div>
                <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 800, marginTop: 2 }}>
                  Price: ₹{snapshot.currentOrder.totalPrice} &bull; Paid: ₹{snapshot.currentOrder.amountPaid}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>No active session</div>
            )}
          </div>

          {/* Ingredient Hoppers Grid — every hopper, so a pinned-low ingredient (Step 7) is visible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {Object.entries(snapshot?.inventory || {}).map(([k, v]) => {
              const threshold = snapshot?.lowStockAlerts?.includes(k) ? true : v < 50;
              return (
                <div
                  key={k}
                  style={{
                    background: threshold ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.8)',
                    padding: 6,
                    borderRadius: 6,
                    textAlign: 'center',
                    border: threshold ? '1px solid #ef4444' : '1px solid #312e81',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{k}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: threshold ? '#f87171' : '#c084fc' }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Telemetry Log HUD */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 20, border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Telemetry Event Stream</h3>
            <span style={{ fontSize: 10, background: '#a855f7', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
              {(snapshot?.events || []).length} Events
            </span>
          </div>

          <div style={{ flex: 1, maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
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