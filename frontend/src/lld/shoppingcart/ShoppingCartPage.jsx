import React, { useState, useEffect } from 'react'
import * as api from './api'
import ClassDiagram from '../../components/ClassDiagram'
import SequenceDiagram from '../../components/SequenceDiagram'
import DesignDetails from '../../components/DesignDetails'
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

  // Simulation state
  const [simState, setSimState] = useState(null)
  const [simStepIndex, setSimStepIndex] = useState(0)
  const [isSimRunning, setIsSimRunning] = useState(false)

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

  // SIMULATION CONTROLS
  const startSimulation = async () => {
    setIsSimRunning(true)
    const resetData = await api.simReset()
    setSimState(resetData)
    setSimStepIndex(0)

    const steps = [
      async () => {
        const snap = await api.simAddToCart('User_Alice', 'P101', 1)
        setSimState(snap)
        setSimStepIndex(1)
      },
      async () => {
        const snap = await api.simAddToCart('User_Bob', 'P101', 2) // P101 stock is 2 -> Bob requests 2
        setSimState(snap)
        setSimStepIndex(2)
      },
      async () => {
        const snap = await api.simPlaceOrder('User_Bob', 'UPI') // Bob completes checkout -> consumes all 2 units
        setSimState(snap)
        setSimStepIndex(3)
      },
      async () => {
        // Alice attempts checkout for P101, but stock is now 0 -> InsufficientStockException rejection
        const snap = await api.simPlaceOrder('User_Alice', 'CREDIT_CARD')
        setSimState(snap)
        setSimStepIndex(4)
      },
      async () => {
        const snap = await api.simUpdateStatus('SIM-ORD-101', 'SHIPPED')
        setSimState(snap)
        setSimStepIndex(5)
      },
      async () => {
        const snap = await api.simUpdateStatus('SIM-ORD-101', 'DELIVERED')
        setSimState(snap)
        setSimStepIndex(6)
      }
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 2200))
      await steps[i]()
    }
    setIsSimRunning(false)
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <label style={{ fontSize: '13px', fontWeight: '600' }}>Active Customer:</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}
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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', overflowX: 'auto' }}>
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
              style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
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
                background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)',
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
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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
                    background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)'
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

          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
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
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
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
            <div key={o.orderId} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
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
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '20px' }}>Seller Order Fulfillment Panel</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allOrders.map(o => (
              <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
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
        <div>
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Low-Stock Concurrency Race Condition Simulation</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Product P101 has 2 units in stock. User_Alice adds 1, User_Bob adds 2 and checks out first, consuming all stock. Alice's checkout fails safely with <code>InsufficientStockException</code>.
                </p>
              </div>
              <button
                onClick={startSimulation}
                disabled={isSimRunning}
                style={{ padding: '12px 24px', background: 'var(--accent-violet)', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' }}
              >
                {isSimRunning ? 'Running Concurrency Sim...' : '▶ Start Concurrency Demo'}
              </button>
            </div>

            {/* SIMULATION TIMELINE & TELEMETRY */}
            {simState && (
              <div style={{ background: '#090d16', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 12px', color: '#38bdf8' }}>Live Warehouse Stock HUD</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {simState.products.map(p => (
                    <div key={p.id} style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{p.id}</span>
                      <h5 style={{ margin: '4px 0', color: '#f8fafc' }}>{p.name}</h5>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: p.stockQuantity <= 0 ? '#ef4444' : '#22c55e' }}>
                        Stock: {p.stockQuantity} units
                      </span>
                    </div>
                  ))}
                </div>

                <h4 style={{ margin: '0 0 12px', color: '#eab308' }}>Simulation Log Stream</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {simState.events.map(ev => (
                    <div key={ev.id} style={{ fontSize: '13px', fontFamily: 'monospace', padding: '6px 10px', background: '#020617', borderRadius: '4px', borderLeft: `3px solid ${ev.type.includes('FAIL') || ev.type.includes('INSUFFICIENT') ? '#ef4444' : '#22c55e'}` }}>
                      <span style={{ color: '#64748b' }}>[{ev.timestamp}]</span> <strong>{ev.actor}:</strong> {ev.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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