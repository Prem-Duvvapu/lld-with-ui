import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, addToCart, removeFromCart, updateQuantity, checkout, updateOrderStatus, getOrders } from './api';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #0f172a, #1e293b, #334155); min-height: 100vh; font-family: 'Segoe UI', system-ui, sans-serif; color: #e2e8f0; }
.sc-app { max-width: 1000px; margin: 0 auto; padding: 20px 16px; }
.sc-header { text-align: center; padding: 24px 0; }
.sc-header h1 { font-size: 28px; background: linear-gradient(135deg, #f59e0b, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.sc-header p { color: #94a3b8; font-size: 13px; margin-top: 4px; }
.back-home { display: inline-block; margin-bottom: 16px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: #ccc; text-decoration: none; font-size: 13px; transition: all 0.2s; }
.back-home:hover { background: rgba(255,255,255,0.1); }
.sc-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
.sc-nav button { padding: 8px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.08); color: #94a3b8; }
.sc-nav button.active { background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
.sc-main { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 24px; min-height: 400px; border: 1px solid rgba(255,255,255,0.08); }
.sc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.sc-card { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.08); text-align: center; transition: all 0.2s; }
.sc-card:hover { transform: translateY(-2px); border-color: rgba(245,158,11,0.3); }
.sc-card .emoji { font-size: 36px; margin-bottom: 6px; }
.sc-card h3 { font-size: 14px; }
.sc-card .price { font-size: 15px; font-weight: 700; color: #f59e0b; margin: 6px 0; }
.sc-card .stock { font-size: 11px; color: #64748b; }
.sc-btn { padding: 7px 16px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.sc-btn:hover { box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
.sc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sc-btn-secondary { background: rgba(255,255,255,0.1); color: #e2e8f0; }
.sc-btn-secondary:hover { box-shadow: none; background: rgba(255,255,255,0.15); }
.sc-btn-small { padding: 4px 10px; font-size: 11px; }
.sc-cart-summary { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-top: 16px; }
.sc-cart-summary h3 { font-size: 15px; color: #f59e0b; margin-bottom: 10px; }
.sc-cart-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
.sc-cart-item:last-child { border-bottom: none; }
.sc-cart-qty { display: flex; align-items: center; gap: 6px; }
.sc-cart-total { font-size: 16px; font-weight: 700; text-align: right; margin-top: 10px; color: #f59e0b; }
.step-indicator { display: flex; gap: 4px; justify-content: center; margin-bottom: 14px; align-items: center; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.3s; }
.step-dot.active { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.step-dot.done { background: #3fb950; }
.sc-scene { width: 100%; min-height: 420px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); padding: 20px; margin-bottom: 12px; position: relative; overflow: hidden; }
.sc-store-shelf { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 12px 0; }
.sc-product-tile { width: 72px; padding: 8px; border-radius: 8px; text-align: center; transition: all 0.5s; opacity: 0; transform: translateY(20px); }
.sc-product-tile.visible { opacity: 1; transform: translateY(0); }
.sc-product-tile .emoji { font-size: 28px; }
.sc-product-tile .name { font-size: 9px; color: #94a3b8; }
.sc-cart-visual { max-width: 260px; margin: 12px auto; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px dashed rgba(245,158,11,0.3); min-height: 60px; transition: all 0.5s; }
.sc-cart-visual .item { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
.sc-truck { font-size: 36px; text-align: center; transition: all 1.5s ease-in-out; }
.sc-truck.delivering { transform: translateX(200px); }
.sc-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15,23,42,0.96); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: popIn 0.4s ease-out; min-width: 220px; }
@keyframes popIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.sc-loading { text-align: center; color: #94a3b8; padding: 40px; }
.sc-error { text-align: center; color: #f85149; padding: 16px; }
`;

function StoreView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [cartId, setCartId] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const p = await getProducts();
      setProducts(p);
      if (cartId > 0) {
        const c = await (await fetch(`/api/shopping-cart/cart/${cartId}`)).json();
        if (!c.error) setCart(c);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cartId]);

  const handleAdd = async (productId) => {
    setActionLoading(true);
    try {
      const c = await addToCart(cartId, 'user1', productId, 1);
      if (!c.error) { setCart(c); setCartId(c.id); }
    } catch {} finally { setActionLoading(false); }
  };

  const handleUpdateQty = async (productId, qty) => {
    setActionLoading(true);
    try {
      const c = await updateQuantity(cartId, productId, qty);
      if (!c.error) setCart(c);
    } catch {} finally { setActionLoading(false); }
  };

  const handleRemove = async (productId) => {
    setActionLoading(true);
    try {
      const c = await removeFromCart(cartId, productId);
      if (!c.error) setCart(c);
    } catch {} finally { setActionLoading(false); }
  };

  const handleCheckout = async () => {
    setActionLoading(true);
    try {
      const o = await checkout(cartId, '123 Main St, City');
      if (!o.error) { setCart(null); setCartId(0); alert('Order placed! Order ID: ' + o.id); }
    } catch {} finally { setActionLoading(false); }
  };

  if (loading) return <div className="sc-loading">Loading store...</div>;

  return (
    <div>
      <div className="sc-grid">
        {products.map(p => (
          <div key={p.id} className="sc-card">
            <div className="emoji">{p.imageUrl || '📦'}</div>
            <h3>{p.name}</h3>
            <div className="price">₹{p.price.toFixed(2)}</div>
            <div className="stock">{p.availableQuantity} in stock</div>
            <button className="sc-btn sc-btn-small" style={{ marginTop: 8 }} onClick={() => handleAdd(p.id)} disabled={actionLoading}>+ Add to Cart</button>
          </div>
        ))}
      </div>

      {cart && (
        <div className="sc-cart-summary">
          <h3>🛒 Your Cart</h3>
          {Object.values(cart.items || {}).length === 0 && <div style={{ fontSize: 13, color: '#64748b' }}>Cart is empty</div>}
          {Object.values(cart.items || {}).map(item => {
            const prod = products.find(p => p.id === item.productId);
            return (
              <div key={item.productId} className="sc-cart-item">
                <span>{prod?.name || 'Product'} — ₹{item.unitPrice?.toFixed(2)}</span>
                <div className="sc-cart-qty">
                  <button className="sc-btn sc-btn-secondary sc-btn-small" onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}>−</button>
                  <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button className="sc-btn sc-btn-secondary sc-btn-small" onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}>+</button>
                  <button className="sc-btn sc-btn-small" style={{ background: '#f85149', marginLeft: 6 }} onClick={() => handleRemove(item.productId)}>✕</button>
                </div>
              </div>
            );
          })}
          {Object.values(cart.items || {}).length > 0 && (
            <>
              <div className="sc-cart-total">Total: ₹{cart.totalAmount?.toFixed(2)}</div>
              <button className="sc-btn" style={{ width: '100%', marginTop: 10 }} onClick={handleCheckout} disabled={actionLoading}>Proceed to Checkout</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null);
  const [cartId, setCartId] = useState(0);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTiles, setShowTiles] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [truckDelivering, setTruckDelivering] = useState(false);
  const [popup, setPopup] = useState(null);
  const mountedRef = useRef(true);
  const steps = ['Browse', 'Add', 'Cart', 'Checkout', 'Delivered', 'Done'];

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const reset = () => {
    setStep(0); setProducts([]); setCart(null); setCartId(0);
    setOrder(null); setLoading(false); setError('');
    setShowTiles(0); setCartItems([]); setTruckDelivering(false); setPopup(null);
  };

  const startSim = async () => {
    setError('');
    try {
      const p = await getProducts();
      if (!mountedRef.current) return;
      setProducts(p);
      setStep(1);
      for (let i = 0; i <= Math.min(6, p.length); i++) {
        await new Promise(r => setTimeout(r, 300));
        if (!mountedRef.current) return;
        setShowTiles(i);
      }
    } catch { if (mountedRef.current) setError('Failed to load'); }
  };

  const addToCartAction = async () => {
    if (!products.length) return; setError(''); setLoading(true);
    try {
      const p1 = products[0], p2 = products[1] || products[0];
      let c = await addToCart(cartId, 'user1', p1.id, 2);
      if (!mountedRef.current) return;
      if (c.error) { setError(c.error); setLoading(false); return; }
      setCart(c); setCartId(c.id);
      c = await addToCart(c.id, 'user1', p2.id, 1);
      if (!mountedRef.current) return;
      if (c.error) { setError(c.error); setLoading(false); return; }
      setCart(c);
      setCartItems(Object.values(c.items || {}));
      setPopup({ title: '🛒 Added to Cart', detail: `${p1.name} ×2, ${p2.name} ×1`, color: '#f59e0b' });
      setLoading(false); setStep(3);
    } catch { if (mountedRef.current) { setError('Failed to add'); setLoading(false); } }
  };

  const viewCartAction = () => {
    setStep(4);
  };

  const checkoutAction = async () => {
    if (!cartId) return; setError(''); setLoading(true);
    try {
      const o = await checkout(cartId, '123 Main St, City');
      if (!mountedRef.current) return;
      if (o.error) { setError(o.error); setLoading(false); return; }
      setOrder(o);
      setPopup({ title: '💳 Order Placed!', detail: `Order #${o.id} — ₹${o.totalAmount?.toFixed(2)}`, color: '#3fb950' });
      setLoading(false); setStep(5);
    } catch { if (mountedRef.current) { setError('Checkout failed'); setLoading(false); } }
  };

  const deliverAction = async () => {
    if (!order) return; setError(''); setLoading(true);
    try {
      setTruckDelivering(true);
      const o = await updateOrderStatus(order.id, 'DELIVERED');
      if (!mountedRef.current) return;
      if (o.error) { setError(o.error); setLoading(false); return; }
      setOrder(o);
      setLoading(false); setStep(6);
    } catch { if (mountedRef.current) { setError('Delivery failed'); setLoading(false); } }
  };

  const tileEmojis = ['📱', '🔊', '👕', '👟', '🎒', '☕'];

  return (
    <div>
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={s} className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} title={s} />
        ))}
        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>{steps[step] || 'Idle'}</span>
      </div>

      <div className="sc-scene">
        {/* Store shelf */}
        <div className="sc-store-shelf">
          {products.slice(0, 6).map((p, i) => (
            <div key={p.id} className={`sc-product-tile ${i < showTiles ? 'visible' : ''}`} style={{ transitionDelay: `${i * 0.1}s`, background: i < showTiles ? 'rgba(255,255,255,0.06)' : 'transparent', border: i < showTiles ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div className="emoji">{tileEmojis[i % tileEmojis.length]}</div>
              <div className="name">{p.name?.split(' ').slice(0, 2).join(' ')}</div>
              <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>₹{p.price}</div>
            </div>
          ))}
        </div>

        {/* Cart visual */}
        {step >= 3 && step < 6 && (
          <div className="sc-cart-visual">
            <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>🛒 Cart</div>
            {cartItems.map((item, i) => {
              const prod = products.find(p => p.id === item.productId);
              return (
                <div key={i} className="item">
                  <span>{prod?.name || 'Item'} ×{item.quantity}</span>
                  <span>₹{item.totalPrice?.toFixed(2)}</span>
                </div>
              );
            })}
            {cart && <div className="sc-cart-total" style={{ fontSize: 13, marginTop: 4 }}>Total: ₹{cart.totalAmount?.toFixed(2)}</div>}
          </div>
        )}

        {/* Truck */}
        {step >= 5 && (
          <div className={`sc-truck ${truckDelivering ? 'delivering' : ''}`} style={{ marginTop: 16 }}>
            🚚
          </div>
        )}

        {/* Popups */}
        {popup && step < 6 && (
          <div className="sc-popup" style={{ borderColor: popup.color }}>
            <div style={{ fontSize: 32 }}>{popup.title.split(' ')[0]}</div>
            <div style={{ fontWeight: 700, color: popup.color, fontSize: 14 }}>{popup.title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{popup.detail}</div>
            <button className="sc-btn sc-btn-small" style={{ marginTop: 10 }} onClick={() => setPopup(null)}>OK</button>
          </div>
        )}

        {step === 6 && (
          <div className="sc-popup" style={{ borderColor: '#3fb950' }}>
            <div style={{ fontSize: 36 }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#3fb950', fontSize: 15 }}>Order Delivered!</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Order #{order?.id} completed</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>₹{order?.totalAmount?.toFixed(2)}</div>
            <button onClick={reset} className="sc-btn" style={{ marginTop: 10 }}>🔄 New</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {step === 0 && <button onClick={startSim} className="sc-btn" style={{ padding: '10px 28px', fontSize: 14 }}>🏪 Browse Products</button>}
        {step === 1 && <button onClick={() => setStep(2)} className="sc-btn">🏪 Browse → Ready</button>}
        {step === 2 && <button onClick={addToCartAction} disabled={loading} className="sc-btn">🛒 Add to Cart {loading ? '...' : ''}</button>}
        {step === 3 && <button onClick={viewCartAction} className="sc-btn">📋 View Cart</button>}
        {step === 4 && <button onClick={checkoutAction} disabled={loading} className="sc-btn">💳 Checkout {loading ? '...' : ''}</button>}
        {step === 5 && <button onClick={deliverAction} disabled={loading} className="sc-btn">🚚 Delivered {loading ? '...' : ''}</button>}
      </div>

      {error && <div className="sc-error">{error}<button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.1)', color: '#ccc', border: 'none', borderRadius: 6, cursor: 'pointer' }}>↺ Reset</button></div>}
    </div>
  );
}

export default function ShoppingCartPage() {
  const [tab, setTab] = useState('store');
  const tabs = ['store', 'simulation', 'diagram', 'design'];
  const tabLabels = { store: 'Store', simulation: 'Simulation', diagram: 'Class Diagram', design: 'Design Details' };

  return (
    <div className="sc-app">
      <style>{styles}</style>
      <Link to="/" className="back-home">← Back to Home</Link>
      <header className="sc-header">
        <h1>Shopping Cart</h1>
        <p>Browse, add to cart, checkout & track orders</p>
      </header>
      <nav className="sc-nav">
        {tabs.map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{tabLabels[t]}</button>
        ))}
      </nav>
      <main className="sc-main">
        {tab === 'store' && <StoreView />}
        {tab === 'simulation' && <AnimatedFlow />}
        {tab === 'diagram' && <ClassDiagram module="shoppingcart" />}
        {tab === 'design' && <DesignDetails module="shoppingcart" />}
      </main>
    </div>
  );
}