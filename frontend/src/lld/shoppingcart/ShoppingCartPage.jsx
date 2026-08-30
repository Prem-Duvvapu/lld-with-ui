import React, { useState, useEffect } from 'react'
import * as api from './api'
import ClassDiagram from '../../components/ClassDiagram'
import SequenceDiagram from '../../components/SequenceDiagram'
import DesignDetails from '../../components/DesignDetails'
import StepIndicator from '../../components/ui/StepIndicator'
import '../../styles/theme.css'

export default function ShoppingCartPage() {
  const [activeTab, setActiveTab] = useState('catalog')
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('u-alice')
  const [cart, setCart] = useState(null)
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [message, setMessage] = useState(null)

  // Simulation state -- driven entirely by the isolated /api/shoppingcart/sim/* sandbox
  const [simSnapshot, setSimSnapshot] = useState(null)
  const [simStep, setSimStep] = useState(0)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState('')
  const [bobOrderId, setBobOrderId] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchUserCartAndOrders(selectedUser)
    }
  }, [selectedUser])

  const fetchInitialData = async () => {
    try {
      const [prodRes, userRes] = await Promise.all([
        api.getProducts(),
        api.getUsers()
      ])
      setProducts(prodRes)
      setUsers(userRes)
      if (userRes && userRes.length > 0) {
        setSelectedUser(userRes[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUserCartAndOrders = async (userId) => {
    try {
      const [cartData, userOrderData, allOrderData] = await Promise.all([
        api.getCart(userId),
        api.getUserOrders(userId),
        api.getAllOrders()
      ])
      setCart(cartData)
      setOrders(userOrderData)
      setAllOrders(allOrderData)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddToCart = async (productId) => {
    try {
      const updatedCart = await api.addToCart(selectedUser, productId, 1)
      setCart(updatedCart)
      showBanner('Item added to cart! (Command recorded)', 'success')
    } catch (err) {
      showBanner(err.message || 'Failed to add item', 'error')
    }
  }

  const handleRemoveFromCart = async (productId) => {
    try {
      const updatedCart = await api.removeFromCart(selectedUser, productId)
      setCart(updatedCart)
      showBanner('Item removed from cart! (Command recorded)', 'info')
    } catch (err) {
      showBanner(err.message || 'Failed to remove item', 'error')
    }
  }

  const handleUndo = async () => {
    try {
      const updatedCart = await api.undoLastCartAction(selectedUser)
      setCart(updatedCart)
      showBanner('Undone last cart operation! (Command Pattern)', 'success')
    } catch (err) {
      showBanner(err.message || 'Nothing to undo', 'error')
    }
  }

  const handleCheckout = async () => {
    try {
      const idempKey = 'IDEMP-' + Date.now()
      const newOrder = await api.placeOrder(selectedUser, paymentMethod, idempKey)
      showBanner(`Order ${newOrder.orderId} placed successfully! Transaction: ${newOrder.paymentTransactionId}`, 'success')
      fetchUserCartAndOrders(selectedUser)
      fetchInitialData()
      setActiveTab('orders')
    } catch (err) {
      showBanner(err.message || 'Checkout failed due to stock/payment error', 'error')
    }
  }

  const handleCancelOrder = async (orderId) => {
    try {
      await api.cancelOrder(orderId)
      showBanner(`Order ${orderId} cancelled and items restocked!`, 'info')
      fetchUserCartAndOrders(selectedUser)
      fetchInitialData()
    } catch (err) {
      showBanner(err.message || 'Failed to cancel order', 'error')
    }
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus)
      showBanner(`Order ${orderId} updated to ${newStatus}`, 'success')
      fetchUserCartAndOrders(selectedUser)
    } catch (err) {
      showBanner(err.message || 'Update failed', 'error')
    }
  }

  const showBanner = (msg, type) => {
    setMessage({ text: msg, type })
    setTimeout(() => setMessage(null), 4000)
  }

  // SIMULATION CONTROLS -- an 8-step, user-driven walkthrough against the isolated
  // /api/shoppingcart/sim/* sandbox. Every step calls a real backend endpoint; nothing here is
  // faked in React state. Each step only advances on the user's own click (no autoplay timers).
  const SIM_STEPS = [
    {
      title: 'Reset Sandbox',
      detail: 'Wipe and reseed the isolated sim sandbox — its own products/carts/orders, completely separate from the live catalog and orders shown in the other tabs.',
      run: async () => {
        const snap = await api.simReset()
        setSimSnapshot(snap)
        setBobOrderId(null)
      },
    },
    {
      title: 'Alice Adds Laptop',
      detail: 'User_Alice adds 1× "Gaming Laptop RTX 4080" (P101) to her cart. P101 is seeded with only 2 units in stock — the low-stock contention this walkthrough is built around.',
      run: async () => {
        const snap = await api.simAddToCart('User_Alice', 'P101', 1)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Bob Adds Laptop ×2',
      detail: 'User_Bob adds 2× P101 to his cart — now both shoppers want a slice of the same 2-unit stock. Whoever checks out first wins.',
      run: async () => {
        const snap = await api.simAddToCart('User_Bob', 'P101', 2)
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Bob Checks Out First',
      detail: 'Bob places his order via UPI. His single-product cart only needs P101\'s lock — stock is validated (2 available, 2 requested), decremented to 0, and the order is confirmed.',
      run: async () => {
        const snap = await api.simPlaceOrder('User_Bob', 'UPI')
        setSimSnapshot(snap)
        const bobOrder = (snap.orders || []).find(o => o.userId === 'User_Bob')
        setBobOrderId(bobOrder ? bobOrder.orderId : null)
      },
    },
    {
      title: 'Alice Checkout Rejected',
      detail: 'Alice attempts to check out for P101 — but stock is now 0. InsufficientStockException is raised and handled safely: no partial charge, no negative stock, Alice\'s cart is left untouched for her to retry.',
      run: async () => {
        const snap = await api.simPlaceOrder('User_Alice', 'CREDIT_CARD')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Alice Checks Out a Multi-Product Cart',
      detail: 'Alice adds "Clean Code Book" (P104) then "Wireless Headphones" (P102) — inserted in that order — and checks out. placeOrder() locks products in ASCENDING product-id order (P102 before P104), the opposite of her cart\'s insertion order, which is exactly what makes concurrent checkouts across shared products deadlock-free.',
      run: async () => {
        await api.simAddToCart('User_Alice', 'P104', 1)
        await api.simAddToCart('User_Alice', 'P102', 1)
        const snap = await api.simPlaceOrder('User_Alice', 'UPI')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Seller Ships Bob\'s Order',
      detail: 'The seller marks Bob\'s order SHIPPED — a legal PLACED → SHIPPED transition in the guarded order-lifecycle state machine.',
      run: async () => {
        if (!bobOrderId) return
        const snap = await api.simUpdateStatus(bobOrderId, 'SHIPPED')
        setSimSnapshot(snap)
      },
    },
    {
      title: 'Cancel Attempt Rejected',
      detail: 'Someone tries to cancel Bob\'s now-SHIPPED order. cancelOrder() rejects SHIPPED/DELIVERED/CANCELLED orders outright — the state machine refuses the transition and no inventory is restocked.',
      run: async () => {
        if (!bobOrderId) return
        const snap = await api.simUpdateStatus(bobOrderId, 'CANCELLED')
        setSimSnapshot(snap)
      },
    },
  ]

  const runSimStep = async () => {
    setSimLoading(true)
    setSimError('')
    try {
      if (simStep >= SIM_STEPS.length) {
        // Walkthrough already finished -- "Run Again" restarts from step 0 (Reset Sandbox).
        await SIM_STEPS[0].run()
        setSimStep(1)
      } else {
        await SIM_STEPS[simStep].run()
        setSimStep(s => s + 1)
      }
    } catch (err) {
      setSimError(err.message || 'Simulation step failed')
    } finally {
      setSimLoading(false)
    }
  }

  // Extract the most recent LOCK_ORDER event (logged only when a checkout touches >1 product) so
  // the UI can visualize cart-insertion order vs. the actual ascending lock-acquisition order.
  const lastLockOrderEvent = simSnapshot?.events
    ? [...simSnapshot.events].reverse().find(e => e.type === 'LOCK_ORDER')
    : null

  const cartTotal = cart ? Object.values(cart.items || {}).reduce((acc, item) => acc + item.totalPrice, 0) : 0

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = !categoryFilter || p.category === categoryFilter
    return matchesSearch && matchesCat
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: 'var(--accent-violet)' }}>
            🛒 Online Shopping System (Amazon / Flipkart LLD)
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Command Pattern (Undo/Redo Cart Actions) • Strategy Pattern (Multi-Payment) • Deadlock-Free Ascending Lock Ordering
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
          <label style={{ fontSize: '13px', fontWeight: '600' }}>Active Customer:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', outline: 'none' }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '600',
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          color: message.type === 'error' ? '#ef4444' : '#22c55e',
          border: `1px solid ${message.type === 'error' ? '#ef4444' : '#22c55e'}`
        }}>
          {message.text}
        </div>
      )}

      {/* TABS HEADER */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-primary)', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { id: 'catalog', label: '🛍️ Shop Catalog' },
          { id: 'cart', label: `🛒 Cart (${cart ? Object.keys(cart.items || {}).length : 0})` },
          { id: 'orders', label: `📦 Orders (${orders.length})` },
          { id: 'seller', label: '🏪 Seller Dashboard' },
          { id: 'sim', label: '🕹️ Concurrency Sim' },
          { id: 'diagram', label: '📐 Class Diagram' },
          { id: 'sequence', label: '🔄 Sequence Diagram' },
          { id: 'details', label: '📋 Design Details' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', fontWeight: '600', borderRadius: '8px 8px 0 0', cursor: 'pointer', border: 'none',
              background: activeTab === tab.id ? 'var(--accent-violet)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SHOP CATALOG */}
      {activeTab === 'catalog' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="FASHION">Fashion</option>
              <option value="HOME_KITCHEN">Home & Kitchen</option>
              <option value="BOOKS">Books</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{
                background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-primary)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-violet)' }}>
                      {p.category}
                    </span>
                    <span style={{ fontSize: '12px', color: p.stockQuantity < 5 ? '#ef4444' : '#22c55e', fontWeight: '600' }}>
                      {p.stockQuantity} in stock
                    </span>
                  </div>
                  <h3 style={{ margin: '8px 0 4px', fontSize: '18px', fontWeight: '700' }}>{p.name}</h3>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-violet)', margin: '12px 0' }}>
                    ₹{p.price.toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={() => handleAddToCart(p.id)}
                  disabled={p.stockQuantity <= 0}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: p.stockQuantity > 0 ? 'pointer' : 'not-allowed',
                    background: p.stockQuantity > 0 ? 'var(--accent-violet)' : '#4b5563', color: '#fff', border: 'none'
                  }}
                >
                  {p.stockQuantity > 0 ? 'Add to Cart 🛒' : 'Out of Stock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CART & CHECKOUT WITH UNDO */}
      {activeTab === 'cart' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Your Shopping Cart</h2>
              <button
                onClick={handleUndo}
                style={{
                  padding: '8px 16px', background: '#eab308', color: '#000', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer'
                }}
              >
                ↩️ Undo Last Cart Action
              </button>
            </div>

            {cart && Object.values(cart.items || {}).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.values(cart.items).map(item => (
                  <div key={item.productId} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
                    background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)'
                  }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px' }}>{item.productName}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        ₹{item.unitPrice.toLocaleString('en-IN')} x {item.quantity} = <strong>₹{item.totalPrice.toLocaleString('en-IN')}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.productId)}
                      style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Your cart is empty.</p>
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--accent-violet)' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Payment Method (Strategy Pattern):</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
              >
                <option value="UPI">UPI (Google Pay / PhonePe)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="WALLET">Digital Wallet</option>
              </select>
            </div>

            <button
              onClick={handleCheckout}
              disabled={!cart || Object.values(cart.items || {}).length === 0}
              style={{
                width: '100%', padding: '14px', borderRadius: '8px', background: 'var(--accent-violet)', color: '#fff',
                border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '16px'
              }}
            >
              Proceed to Checkout 💳
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS TIMELINE */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(o => (
            <div key={o.orderId} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--accent-violet)' }}>Order #{o.orderId}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tx ID: {o.paymentTransactionId} | Method: {o.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                    background: o.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.2)' : o.status === 'DELIVERED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: o.status === 'CANCELLED' ? '#ef4444' : o.status === 'DELIVERED' ? '#22c55e' : '#eab308'
                  }}>
                    {o.status}
                  </span>
                  {o.status !== 'SHIPPED' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelOrder(o.orderId)}
                      style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Cancel & Restock
                    </button>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                {o.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span>{item.productName} (x{item.quantity})</span>
                    <span>₹{item.totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', marginTop: '8px', fontSize: '16px' }}>
                  <span>Total Paid:</span>
                  <span>₹{o.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: SELLER DASHBOARD */}
      {activeTab === 'seller' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '20px' }}>Seller Order Fulfillment Panel</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allOrders.map(o => (
              <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                <div>
                  <h4 style={{ margin: 0 }}>Order #{o.orderId} (Customer: {o.userId})</h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Amount: ₹{o.totalAmount} | Current Status: <strong>{o.status}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['PROCESSING', 'SHIPPED', 'DELIVERED'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(o.orderId, st)}
                      disabled={o.status === st || o.status === 'CANCELLED'}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', background: 'var(--accent-violet)', color: '#fff', opacity: o.status === st ? 0.5 : 1 }}
                    >
                      Mark {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: INTERACTIVE 2D SIMULATION */}
      {activeTab === 'sim' && (
        <ShoppingCartSimulationTab
          simSnapshot={simSnapshot}
          simStep={simStep}
          simLoading={simLoading}
          simError={simError}
          bobOrderId={bobOrderId}
          simSteps={SIM_STEPS}
          lastLockOrderEvent={lastLockOrderEvent}
          onRunStep={runSimStep}
        />
      )}

      {/* TAB 6: CLASS DIAGRAM */}
      {activeTab === 'diagram' && <ClassDiagram module="shoppingcart" />}

      {/* TAB 7: SEQUENCE DIAGRAM */}
      {activeTab === 'sequence' && <SequenceDiagram module="shoppingcart" />}

      {/* TAB 8: DESIGN DETAILS */}
      {activeTab === 'details' && <DesignDetails module="shoppingcart" />}
    </div>
  )
}

// =============================================================================
// SIMULATION TAB -- 8-step, user-driven walkthrough against the isolated
// /api/shoppingcart/sim/* sandbox. Every step below calls a real backend endpoint; nothing here
// fakes state in React. Visualizes: per-shopper cart contents, the warehouse stock HUD, the
// ascending product-id lock-acquisition order vs. cart-insertion order during a multi-product
// checkout, order lifecycle transitions (including a guarded rejection), and a live event log.
// =============================================================================
function ShoppingCartSimulationTab({ simSnapshot, simStep, simLoading, simError, bobOrderId, simSteps, lastLockOrderEvent, onRunStep }) {
  const products = simSnapshot?.products || []
  const carts = simSnapshot?.carts || {}
  const orders = simSnapshot?.orders || []
  const events = simSnapshot?.events || []
  const isDone = simStep >= simSteps.length
  const currentStepMeta = simSteps[Math.min(simStep, simSteps.length - 1)]

  const aliceCart = carts['User_Alice']?.items || {}
  const bobCart = carts['User_Bob']?.items || {}
  const trackedP101 = products.find(p => p.id === 'P101')

  const bobOrder = orders.find(o => o.orderId === bobOrderId)

  return (
    <div>
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>🕹️ Interactive Checkout Concurrency Walkthrough</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Two shoppers race for a 2-unit low-stock product, then a multi-product checkout demonstrates
          ascending product-id lock ordering, then a guarded order-lifecycle rejection. Every step below
          calls the real <code>/api/shoppingcart/sim/*</code> sandbox endpoints — a completely separate
          set of products/carts/orders from the live tabs.
        </p>

        <StepIndicator steps={simSteps.map(s => s.title)} currentStep={Math.min(simStep, simSteps.length - 1)} />

        <div style={{
          marginTop: '20px', padding: '16px 20px', borderRadius: '10px',
          background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isDone ? 'Walkthrough Complete' : `Step ${simStep + 1} of ${simSteps.length}`}
            </div>
            <h4 style={{ margin: '4px 0' }}>{isDone ? 'All 8 steps executed' : currentStepMeta.title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {isDone ? 'Reset the sandbox to run the walkthrough again.' : currentStepMeta.detail}
            </p>
          </div>
          <button
            onClick={onRunStep}
            disabled={simLoading || (isDone && simSnapshot)}
            style={{
              padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: simLoading ? 'default' : 'pointer',
              background: isDone ? '#4b5563' : 'var(--accent-violet)', color: '#fff', whiteSpace: 'nowrap'
            }}
          >
            {simLoading ? 'Running…' : isDone ? '✓ Done' : simStep === 0 ? '▶ Start Walkthrough' : `Next: ${currentStepMeta.title} →`}
          </button>
        </div>

        {simError && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '13px', fontWeight: '600' }}>
            ⚠ {simError}
          </div>
        )}
      </div>

      {simSnapshot && (
        <>
          {/* LIVE TELEMETRY HUD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <HudTile label="P101 Stock" value={trackedP101 ? trackedP101.stockQuantity : '—'} tone={trackedP101 && trackedP101.stockQuantity <= 0 ? 'danger' : 'ok'} />
            <HudTile label="Alice's Cart Items" value={Object.keys(aliceCart).length} tone="neutral" />
            <HudTile label="Bob's Cart Items" value={Object.keys(bobCart).length} tone="neutral" />
            <HudTile label="Orders Placed" value={orders.length} tone="neutral" />
            <HudTile label="Events Logged" value={events.length} tone="neutral" />
            <HudTile label="Bob's Order Status" value={bobOrder ? bobOrder.status : '—'} tone={bobOrder?.status === 'CANCELLED' ? 'danger' : bobOrder?.status === 'SHIPPED' ? 'ok' : 'neutral'} />
          </div>

          {/* SHOPPER CART PANELS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <ShopperCartPanel name="User_Alice" emoji="👩" items={aliceCart} accent="#8b5cf6" />
            <ShopperCartPanel name="User_Bob" emoji="👨" items={bobCart} accent="#38bdf8" />
          </div>

          {/* WAREHOUSE STOCK GRID */}
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>📦 Warehouse Stock</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {products.map(p => {
                const pct = Math.max(0, Math.min(100, (p.stockQuantity / (p.id === 'P101' ? 2 : Math.max(p.stockQuantity, 15))) * 100))
                return (
                  <div key={p.id} style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{p.id}</span>
                      <span style={{ fontWeight: '700', color: p.stockQuantity <= 0 ? '#ef4444' : 'var(--text-primary)' }}>{p.stockQuantity} units</span>
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '13px', margin: '4px 0 8px' }}>{p.name}</div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-primary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: p.stockQuantity <= 0 ? '#ef4444' : p.stockQuantity <= 2 ? '#eab308' : '#22c55e', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LOCK ACQUISITION ORDER VISUALIZER */}
          {lastLockOrderEvent && (
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>🔒 Checkout Lock Acquisition Order</h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {lastLockOrderEvent.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <ChipSequence label="Cart-insertion order" ids={lastLockOrderEvent.details?.cartInsertionOrder || []} tone="neutral" />
                <ChipSequence label="Actual lock-acquisition order (ascending product-id)" ids={lastLockOrderEvent.details?.lockAcquisitionOrder || []} tone="accent" />
              </div>
            </div>
          )}

          {/* ORDERS PANEL */}
          {orders.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '15px' }}>🧾 Orders</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {orders.map(o => (
                  <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)', fontSize: '13px' }}>
                    <span><strong>{o.orderId}</strong> — {o.userId} — ₹{o.totalAmount.toLocaleString('en-IN')}</span>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                      background: o.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.2)' : o.status === 'SHIPPED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                      color: o.status === 'CANCELLED' ? '#ef4444' : o.status === 'SHIPPED' ? '#22c55e' : '#eab308'
                    }}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EVENT LOG STREAM */}
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>📜 Sandbox Event Log</h4>
            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
              {events.map(ev => {
                const isFailure = ev.type.includes('FAIL') || ev.type.includes('INSUFFICIENT')
                const isLockNote = ev.type === 'LOCK_ORDER'
                return (
                  <div key={ev.id} style={{
                    fontSize: '12px', fontFamily: 'monospace', padding: '8px 12px', borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    borderLeft: `3px solid ${isFailure ? '#ef4444' : isLockNote ? '#38bdf8' : '#22c55e'}`
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>[{ev.timestamp}]</span> <strong>{ev.actor}:</strong> {ev.description}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function HudTile({ label, value, tone }) {
  const color = tone === 'danger' ? '#ef4444' : tone === 'ok' ? '#22c55e' : 'var(--accent-violet)'
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function ShopperCartPanel({ name, emoji, items, accent }) {
  const entries = Object.values(items)
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: `1px solid ${accent}55` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '20px' }}>{emoji}</span>
        <strong>{name}</strong>
      </div>
      {entries.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Cart is empty.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map(item => (
            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
              <span>{item.productName} × {item.quantity}</span>
              <span style={{ color: accent, fontWeight: '700' }}>₹{item.totalPrice.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChipSequence({ label, ids, tone }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {ids.map((id, idx) => (
          <React.Fragment key={id + idx}>
            <span style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace',
              background: tone === 'accent' ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-primary)',
              color: tone === 'accent' ? 'var(--accent-violet)' : 'var(--text-primary)',
              border: `1px solid ${tone === 'accent' ? 'var(--accent-violet)' : 'var(--border-primary)'}`
            }}>{id}</span>
            {idx < ids.length - 1 && <span style={{ color: 'var(--text-secondary)' }}>→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}