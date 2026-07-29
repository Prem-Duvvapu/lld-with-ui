import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getRestaurants, placeOrder, getUserOrders, updateOrderStatus } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; }
.app { max-width: 1000px; margin: 0 auto; padding: 20px; }
header { text-align: center; margin-bottom: 24px; }
header h1 { font-size: 28px; color: #e23744; }
header p { color: #666; font-size: 14px; margin-top: 4px; }
nav { display: flex; gap: 8px; margin-bottom: 24px; justify-content: center; }
nav button { padding: 10px 24px; border: 2px solid #e23744; background: white; color: #e23744; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
nav button.active { background: #e23744; color: white; }
nav button:hover:not(.active) { background: #fff0f0; }
.badge { display: inline-block; background: #e23744; color: white; border-radius: 50%; padding: 0 6px; font-size: 11px; margin-left: 4px; line-height: 18px; }
nav button.active .badge { background: white; color: #e23744; }
main { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.restaurant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.restaurant-card { border: 2px solid #eee; border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.2s; }
.restaurant-card:hover { border-color: #e23744; box-shadow: 0 2px 12px rgba(226,55,68,0.15); }
.restaurant-card h3 { font-size: 18px; margin-bottom: 6px; }
.restaurant-card .cuisine { color: #666; font-size: 13px; margin-bottom: 4px; }
.restaurant-card .rating { color: #e23744; font-weight: 700; font-size: 14px; }
.restaurant-card .location { color: #999; font-size: 12px; margin-top: 8px; }
.menu-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.menu-header h2 { font-size: 22px; }
.btn-back { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: white; }
.btn-back:hover { background: #f5f5f5; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; }
.menu-item:last-child { border-bottom: none; }
.menu-item-info { flex: 1; }
.menu-item-info h4 { font-size: 16px; margin-bottom: 4px; }
.menu-item-info .category { font-size: 12px; color: #999; margin-bottom: 4px; }
.menu-item-info .price { font-weight: 700; color: #333; }
.add-btn { padding: 6px 16px; background: #e23744; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
.add-btn:hover { background: #c92a36; }
.qty-controls { display: flex; align-items: center; gap: 8px; }
.qty-controls button { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #ddd; background: white; cursor: pointer; font-weight: 700; }
.qty-controls span { font-weight: 600; min-width: 20px; text-align: center; }
.cart-empty { text-align: center; padding: 40px; color: #999; }
.cart-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0; }
.cart-item-info h4 { font-size: 15px; margin-bottom: 2px; }
.cart-item-info .cart-price { font-size: 13px; color: #666; }
.cart-total { text-align: right; font-size: 18px; font-weight: 700; margin: 16px 0; }
.btn-checkout { width: 100%; padding: 14px; background: #e23744; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-checkout:hover { background: #c92a36; }
.order-card { border: 2px solid #eee; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.order-header .order-id { font-weight: 700; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.status-PLACED { background: #e3f2fd; color: #1565c0; }
.status-CONFIRMED { background: #fff3e0; color: #e65100; }
.status-PREPARING { background: #fce4ec; color: #c62828; }
.status-OUT_FOR_DELIVERY { background: #e8f5e9; color: #2e7d32; }
.status-DELIVERED { background: #f1f8e9; color: #558b2f; }
.status-CANCELLED { background: #fafafa; color: #9e9e9e; }
.order-items { font-size: 13px; color: #666; margin: 8px 0; }
.order-total { font-weight: 700; margin: 8px 0; }
.order-partner { font-size: 13px; color: #555; margin: 4px 0; }
.order-actions { margin-top: 8px; display: flex; gap: 8px; }
.order-actions button { padding: 6px 14px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 12px; background: white; }
.order-actions button:hover { background: #f5f5f5; }
.alert { text-align: center; padding: 32px; color: #666; font-size: 16px; }
.error { margin-top: 16px; padding: 12px; background: #fff0f0; color: #d32f2f; border-radius: 8px; font-size: 14px; }
.result-card { margin-top: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #e23744; }
.result-card h3 { margin-bottom: 12px; color: #e23744; }
.result-card .detail { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #eee; }
.result-card .detail:last-child { border-bottom: none; }
.result-card .label { color: #666; }
.result-card .value { font-weight: 600; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid #e23744; border-radius: 6px; color: #e23744; text-decoration: none; font-size: 14px; font-weight: 600; transition: all 0.2s; }
.back-home:hover { background: #e23744; color: white; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
.step-dot.active { background: #e23744; box-shadow: 0 0 8px rgba(226,55,68,0.5); }
.step-dot.done { background: #3fb950; }
`;

const USER_ID = 'user1';

function RestaurantList({ onSelect }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getRestaurants().then(setRestaurants).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="alert">Loading restaurants...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Restaurants Near You</h2>
      <div className="restaurant-grid">
        {restaurants.map((r) => (
          <div key={r.id} className="restaurant-card" onClick={() => onSelect(r)}>
            <h3>{r.name}</h3>
            <div className="cuisine">{r.cuisine}</div>
            <div className="rating">{'★'} {r.rating}</div>
            <div className="location">{r.location}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuView({ restaurant, cart, addToCart, updateQty, onBack }) {
  const getQty = (menuItemId) => {
    const item = cart.find((i) => i.menuItemId === menuItemId);
    return item ? item.quantity : 0;
  };

  return (
    <div>
      <div className="menu-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <div>
          <h2>{restaurant.name}</h2>
          <span style={{ fontSize: 13, color: '#666' }}>{restaurant.cuisine} • {restaurant.location}</span>
        </div>
      </div>
      {restaurant.menu.map((item) => (
        <div key={item.id} className="menu-item">
          <div className="menu-item-info">
            <h4>{item.name}</h4>
            <div className="category">{item.category}</div>
            <div className="price">₹{item.price}</div>
          </div>
          {getQty(item.id) === 0 ? (
            <button className="add-btn" onClick={() => addToCart(item, restaurant.id, restaurant.name)}>Add</button>
          ) : (
            <div className="qty-controls">
              <button onClick={() => updateQty(item.id, -1)}>−</button>
              <span>{getQty(item.id)}</span>
              <button onClick={() => addToCart(item, restaurant.id, restaurant.name)}>+</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Cart({ cart, updateQty, onOrderPlaced }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const restaurantIds = [...new Set(cart.map((i) => i.restaurantId))];

  const handleCheckout = async () => {
    if (restaurantIds.length > 1) { setError('Please order from one restaurant at a time'); return; }
    setError(''); setResult(null); setLoading(true);
    try {
      const data = await placeOrder(cart[0].restaurantId, USER_ID, cart.map(({ menuItemId, name, quantity, price }) => ({ menuItemId, name, quantity, price })));
      if (data.error) { setError(data.error); }
      else { setResult(data); onOrderPlaced(); }
    } catch { setError('Failed to connect to server'); }
    finally { setLoading(false); }
  };

  if (cart.length === 0 && !result) return <div className="cart-empty">Your cart is empty. Browse restaurants to add items.</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Your Cart</h2>
      {cart.map((item) => (
        <div key={item.menuItemId} className="cart-item">
          <div className="cart-item-info">
            <h4>{item.name}</h4>
            <div className="cart-price">₹{item.price} x {item.quantity}</div>
          </div>
          <div className="qty-controls">
            <button onClick={() => updateQty(item.menuItemId, -1)}>−</button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQty(item.menuItemId, 1)}>+</button>
          </div>
        </div>
      ))}
      <div className="cart-total">Total: ₹{total.toFixed(2)}</div>
      {error && <div className="error">{error}</div>}
      {cart.length > 0 && (
        <button className="btn-checkout" onClick={handleCheckout} disabled={loading}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      )}
    </div>
  );
}

const STATUS_FLOW = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function Orders({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => { getUserOrders(USER_ID).then(setOrders).finally(() => setLoading(false)); };

  useEffect(() => { fetchOrders(); const interval = setInterval(fetchOrders, 5000); return () => clearInterval(interval); }, [refreshKey]);

  const advanceStatus = async (orderId, currentStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) { await updateOrderStatus(orderId, STATUS_FLOW[idx + 1]); fetchOrders(); }
  };

  const cancelOrder = async (orderId) => { await updateOrderStatus(orderId, 'CANCELLED'); fetchOrders(); };

  if (loading) return <div className="alert">Loading orders...</div>;
  if (orders.length === 0) return <div className="alert">No orders yet. Start by ordering from a restaurant!</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>My Orders</h2>
      {orders.map((order) => {
        const idx = STATUS_FLOW.indexOf(order.status);
        const canAdvance = order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && idx < STATUS_FLOW.length - 1;
        const canCancel = order.status === 'PLACED';
        return (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <span className="order-id">{order.id}</span>
              <span className={`status-badge status-${order.status}`}>{order.status.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{order.restaurantName}</div>
            <div className="order-items">{order.items.map((item) => <div key={item.menuItemId}>{item.name} x{item.quantity} — ₹{item.price * item.quantity}</div>)}</div>
            <div className="order-total">Total: ₹{order.totalAmount.toFixed(2)}</div>
            {order.deliveryPartnerName && <div className="order-partner">Delivery Partner: {order.deliveryPartnerName}</div>}
            <div className="order-actions">
              {canAdvance && <button onClick={() => advanceStatus(order.id, order.status)}>Next: {STATUS_FLOW[idx + 1].replace(/_/g, ' ')}</button>}
              {canCancel && <button onClick={() => cancelOrder(order.id)} style={{ color: '#d32f2f' }}>Cancel Order</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Order', 'Preparing', 'Delivering', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => { setStep(0); setOrder(null); setLoading(false); setError(''); };

  const startSim = async () => {
    setError(''); setLoading(true); setStep(1); setOrder(null);
    try {
      await new Promise(r => setTimeout(r, 1500));
      if (!mountedRef.current) return;
      setStep(2);
      setLoading(true);

      const data = await placeOrder('R1', 'user1', [{ menuItemId: 'M1', name: 'Margherita Pizza', quantity: 2, price: 299 }]);
      if (!mountedRef.current) return;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setOrder(data);
      setLoading(false);
      setStep(3);

      await new Promise(r => setTimeout(r, 2000));
      if (!mountedRef.current) return;
      await updateOrderStatus(data.id, 'CONFIRMED');
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 1500));
      if (!mountedRef.current) return;
      await updateOrderStatus(data.id, 'PREPARING');
      if (!mountedRef.current) return;
      setStep(4);

      await new Promise(r => setTimeout(r, 2000));
      if (!mountedRef.current) return;
      await updateOrderStatus(data.id, 'OUT_FOR_DELIVERY');
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 2000));
      if (!mountedRef.current) return;
      await updateOrderStatus(data.id, 'DELIVERED');
      if (!mountedRef.current) return;
      setStep(5);
    } catch { if (mountedRef.current) { setError('Simulation failed'); setLoading(false); } }
  };

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      {error && <div className="error">{error}<button className="btn-back" style={{ marginLeft: 12 }} onClick={reset}>↺ Reset</button></div>}

      {step === 0 && <button className="btn-checkout" onClick={startSim} disabled={loading}>▶ Start Simulation</button>}

      {step >= 1 && !error && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          {step === 1 && <div><div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div><div style={{ color: '#e23744', fontWeight: 600 }}>Browsing Pizza Paradise...</div></div>}
          {step === 2 && <div><div style={{ fontSize: 40, marginBottom: 12 }}>{loading ? '⏳' : '✅'}</div><div style={{ fontWeight: 600 }}>{loading ? 'Placing order...' : 'Order placed!'}</div></div>}
          {step === 3 && <div><div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🍳</div><div style={{ fontWeight: 600 }}>Preparing your Margherita Pizza...</div></div>}
          {step === 4 && order && <div><div style={{ fontSize: 40, marginBottom: 12 }}>🛵</div><div style={{ fontWeight: 600 }}>{order.deliveryPartnerName || 'Partner'} is delivering your order!</div></div>}
          {step === 5 && order && (
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, maxWidth: 300, margin: '0 auto' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🍕</div>
              <div style={{ fontWeight: 700, color: '#e23744' }}>Delivered!</div>
              <div style={{ margin: '8px 0', fontSize: 13 }}>Order: {order.id}</div>
              <div style={{ margin: '8px 0', fontSize: 13 }}>Total: ₹{order.totalAmount?.toFixed(2)}</div>
              <div style={{ margin: '8px 0', fontSize: 13 }}>Delivered by: {order.deliveryPartnerName}</div>
              <button className="btn-checkout" style={{ marginTop: 12, padding: '8px 20px', fontSize: 13 }} onClick={reset}>🔄 New Simulation</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ZomatoPage() {
  const [page, setPage] = useState('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const addToCart = (item, restaurantId, restaurantName) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) return prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, price: item.price, restaurantId, restaurantName }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setCart((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const clearCart = () => setCart([]);
  const onOrderPlaced = () => { clearCart(); setRefreshKey((k) => k + 1); setPage('orders'); };

  return (
    <div className="app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header><h1>Zomato</h1><p>Food Delivery - Low-Level Design</p></header>
      <nav>
        <button className={page === 'restaurants' ? 'active' : ''} onClick={() => { setPage('restaurants'); setSelectedRestaurant(null); }}>Restaurants</button>
        <button className={page === 'orders' ? 'active' : ''} onClick={() => setPage('orders')}>Orders {cart.length > 0 && <span className="badge">{cart.length}</span>}</button>
        <button className={page === 'cart' ? 'active' : ''} onClick={() => setPage('cart')}>Cart {cart.length > 0 && <span className="badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}</button>
        <button className={page === 'simulation' ? 'active' : ''} onClick={() => setPage('simulation')}>Simulation</button>
        <button className={page === 'diagram' ? 'active' : ''} onClick={() => setPage('diagram')}>Class Diagram</button>
        <button className={page === 'design' ? 'active' : ''} onClick={() => setPage('design')}>Design Details</button>
      </nav>
      <main>
        {page === 'restaurants' && !selectedRestaurant && <RestaurantList onSelect={(r) => { setSelectedRestaurant(r); setPage('menu'); }} />}
        {page === 'menu' && selectedRestaurant && <MenuView restaurant={selectedRestaurant} cart={cart} addToCart={addToCart} updateQty={updateQty} onBack={() => { setSelectedRestaurant(null); setPage('restaurants'); }} />}
        {page === 'cart' && <Cart cart={cart} updateQty={updateQty} onOrderPlaced={onOrderPlaced} />}
        {page === 'orders' && <Orders key={refreshKey} refreshKey={refreshKey} />}
        {page === 'simulation' && <AnimatedFlow />}
        {page === 'diagram' && <ClassDiagram module="zomato" />}
        {page === 'design' && <DesignDetails module="zomato" />}
      </main>
    </div>
  );
}
