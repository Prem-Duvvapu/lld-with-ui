import { useState, useEffect, useRef, useCallback } from 'react';
import { getRestaurants, placeOrder, getUserOrders, updateOrderStatus } from './api';
import LldPage from '../../components/LldPage';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import StepIndicator from '../../components/ui/StepIndicator';
import { useToast } from '../../components/ui/ToastContext';
import { usePolling } from '../../hooks/usePolling';

const ZOMATO_CSS = `
.zomato-container { max-width: 1000px; margin: 0 auto; }
.restaurant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.restaurant-card { border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 20px; cursor: pointer; transition: all var(--duration-fast); background: var(--bg-card); }
.restaurant-card:hover { border-color: #e23744; box-shadow: var(--shadow-md); transform: translateY(-2px); }
.restaurant-card h3 { font-size: 18px; margin-bottom: 6px; color: var(--text-primary); }
.restaurant-card .cuisine { color: var(--text-secondary); font-size: 13px; margin-bottom: 4px; }
.restaurant-card .rating { color: #e23744; font-weight: 700; font-size: 14px; }
.restaurant-card .location { color: var(--text-muted); font-size: 12px; margin-top: 8px; }

.menu-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-secondary); }
.menu-item:last-child { border-bottom: none; }
.menu-item-info h4 { font-size: 16px; color: var(--text-primary); margin-bottom: 4px; }
.menu-item-info .category { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.menu-item-info .price { font-weight: 700; color: var(--text-primary); }

.qty-controls { display: flex; align-items: center; gap: 8px; }
.qty-controls button { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border-primary); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-weight: 700; }

.cart-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border-secondary); }
.order-card { border: 1px solid var(--border-primary); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; background: var(--bg-card); }
.order-header { display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-primary); }

.zomato-scene { position: relative; width: 100%; height: 380px; background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border-primary); margin-bottom: 16px; }
.zomato-road { position: absolute; bottom: 30px; left: 0; right: 0; height: 50px; background: #2d2d2d; border-top: 3px solid #555; border-bottom: 3px solid #555; }
.zomato-road-line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: repeating-linear-gradient(90deg, #fff 0px, #fff 20px, transparent 20px, transparent 40px); opacity: 0.3; transform: translateY(-50%); }
.zomato-bike { position: absolute; bottom: 42px; font-size: 28px; transition: left 2.5s cubic-bezier(0.4, 0, 0.2, 1); z-index: 5; }
.zomato-restaurant-sim { position: absolute; left: 20px; top: 20px; width: 180px; background: var(--bg-card); border: 2px solid #e23744; border-radius: 10px; padding: 10px; z-index: 2; transition: all 0.6s ease-out; opacity: 0; transform: translateX(-30px); }
.zomato-restaurant-sim.visible { opacity: 1; transform: translateX(0); }
.zomato-house { position: absolute; right: 30px; top: 25px; font-size: 40px; z-index: 2; opacity: 0; transition: all 0.6s ease-out; }
.zomato-house.visible { opacity: 1; }
.zomato-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); border: 2px solid #e23744; border-radius: 12px; padding: 20px; text-align: center; z-index: 10; box-shadow: var(--shadow-lg); min-width: 200px; color: var(--text-primary); }
`;

const USER_ID = 'user1';

function RestaurantList({ onSelect }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants().then((data) => {
      if (Array.isArray(data)) setRestaurants(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton height={240} />;
  if (restaurants.length === 0) return <EmptyState icon="🍽️" title="No restaurants found" />;

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 18, color: 'var(--text-primary)' }}>Restaurants Near You</h2>
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
        <Button variant="secondary" onClick={onBack}>← Back</Button>
        <div>
          <h2 style={{ fontSize: 20, color: 'var(--text-primary)' }}>{restaurant.name}</h2>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{restaurant.cuisine} • {restaurant.location}</span>
        </div>
      </div>
      <Card>
        <CardBody>
          {restaurant.menu.map((item) => (
            <div key={item.id} className="menu-item">
              <div className="menu-item-info">
                <h4>🍕 {item.name}</h4>
                <div className="category">{item.category}</div>
                <div className="price">₹{item.price}</div>
              </div>
              {getQty(item.id) === 0 ? (
                <Button variant="primary" size="sm" onClick={() => addToCart(item, restaurant.id, restaurant.name)} style={{ background: '#e23744' }}>
                  + Add
                </Button>
              ) : (
                <div className="qty-controls">
                  <button onClick={() => updateQty(item.id, -1)}>−</button>
                  <span>{getQty(item.id)}</span>
                  <button onClick={() => addToCart(item, restaurant.id, restaurant.name)}>+</button>
                </div>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function CartView({ cart, updateQty, onOrderPlaced }) {
  const toast = useToast();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const restaurantIds = [...new Set(cart.map((i) => i.restaurantId))];

  const handleCheckout = async () => {
    if (restaurantIds.length > 1) {
      const msg = 'Please order from one restaurant at a time';
      setError(msg); toast.error(msg); return;
    }
    setError(''); setResult(null); setLoading(true);
    try {
      const data = await placeOrder(cart[0].restaurantId, USER_ID, cart.map(({ menuItemId, name, quantity, price }) => ({ menuItemId, name, quantity, price })));
      if (data.error) {
        setError(data.error); toast.error(data.error);
      } else {
        setResult(data); onOrderPlaced();
        toast.success(`Order #${data.id || data.orderId || 'placed'} confirmed!`);
      }
    } catch (err) {
      const msg = err.message || 'Failed to place order';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !result) {
    return <EmptyState icon="🛒" title="Your cart is empty" description="Browse restaurants to add items to your cart." />;
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <Card>
        <CardHeader title="🛒 Your Cart" subtitle={cart.length > 0 ? `${cart.length} item(s)` : ''} />
        <CardBody>
          {cart.map((item) => (
            <div key={item.menuItemId} className="cart-item">
              <div>
                <h4 style={{ fontSize: 15, color: 'var(--text-primary)' }}>{item.name}</h4>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>₹{item.price} × {item.quantity}</span>
              </div>
              <div className="qty-controls">
                <button onClick={() => updateQty(item.menuItemId, -1)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQty(item.menuItemId, 1)}>+</button>
              </div>
            </div>
          ))}

          {cart.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                <span>Total Amount</span>
                <span style={{ color: '#e23744' }}>₹{total}</span>
              </div>
              <Button variant="primary" loading={loading} onClick={handleCheckout} style={{ width: '100%', background: '#e23744' }}>
                Place Order (₹{total})
              </Button>
            </div>
          )}

          {result && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
              <h3 style={{ color: 'var(--success)', marginBottom: 8 }}>✅ Order Placed Successfully!</h3>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Order ID: <strong>{result.id || result.orderId}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Status: <Badge variant="info">{result.status}</Badge></div>
            </div>
          )}

          {error && <div style={{ marginTop: 12, padding: 10, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 6 }}>{error}</div>}
        </CardBody>
      </Card>
    </div>
  );
}

function OrdersView() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getUserOrders(USER_ID);
      if (Array.isArray(data)) setOrders(data);
    } catch {
      // silent retry on poll
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchOrders, 4000, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const getBadgeVariant = (status) => {
    switch (status) {
      case 'PLACED': return 'info';
      case 'CONFIRMED': return 'warning';
      case 'PREPARING': return 'accent';
      case 'OUT_FOR_DELIVERY': return 'warning';
      case 'DELIVERED': return 'success';
      default: return 'neutral';
    }
  };

  if (loading && orders.length === 0) return <Skeleton height={200} />;
  if (orders.length === 0) return <EmptyState icon="📦" title="No orders placed yet" />;

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 18, color: 'var(--text-primary)' }}>Your Live Orders</h2>
      {orders.map((o) => (
        <div key={o.id || o.orderId} className="order-card">
          <div className="order-header">
            <span style={{ fontWeight: 700 }}>Order #{o.id || o.orderId}</span>
            <Badge variant={getBadgeVariant(o.status)}>{o.status}</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
            {o.items?.map((i) => `${i.name} (${i.quantity})`).join(', ')}
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Total: ₹{o.totalAmount || o.total}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {o.status === 'PLACED' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(o.id || o.orderId, 'CONFIRMED')}>Confirm</Button>}
            {o.status === 'CONFIRMED' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(o.id || o.orderId, 'PREPARING')}>Start Preparing</Button>}
            {o.status === 'PREPARING' && <Button size="sm" variant="secondary" onClick={() => handleStatusChange(o.id || o.orderId, 'OUT_FOR_DELIVERY')}>Out for Delivery</Button>}
            {o.status === 'OUT_FOR_DELIVERY' && <Button size="sm" variant="success" onClick={() => handleStatusChange(o.id || o.orderId, 'DELIVERED')}>Mark Delivered</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedFlow() {
  const [step, setStep] = useState(0);
  const [bikeLeft, setBikeLeft] = useState(-50);
  const [resVisible, setResVisible] = useState(false);
  const [houseVisible, setHouseVisible] = useState(false);
  const [popupMsg, setPopupMsg] = useState('');

  const steps = ['Select', 'Place Order', 'Preparing', 'Out for Delivery', 'Delivered'];

  const startSim = () => {
    setStep(1); setResVisible(true); setHouseVisible(true); setPopupMsg('Order Confirmed by Restaurant!');
    setTimeout(() => {
      setStep(2); setPopupMsg('Chef is Preparing Food 👨‍🍳');
    }, 1500);
    setTimeout(() => {
      setStep(3); setPopupMsg('Delivery Partner Assigned 🛵'); setBikeLeft(60);
    }, 3000);
    setTimeout(() => {
      setBikeLeft(750);
    }, 3800);
    setTimeout(() => {
      setStep(4); setPopupMsg('Order Delivered! Enjoy your meal 🎉');
    }, 6500);
  };

  const resetSim = () => {
    setStep(0); setBikeLeft(-50); setResVisible(false); setHouseVisible(false); setPopupMsg('');
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <StepIndicator steps={steps} currentStep={step} />

      <div className="zomato-scene">
        <div className={`zomato-restaurant-sim ${resVisible ? 'visible' : ''}`}>
          <div style={{ fontWeight: 700, color: '#e23744' }}>🍕 Pizza Palace</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kitchen Active</div>
        </div>

        <div className={`zomato-house ${houseVisible ? 'visible' : ''}`}>🏡</div>

        <div className="zomato-road"><div className="zomato-road-line" /></div>

        <div className="zomato-bike" style={{ left: bikeLeft }}>🛵</div>

        {popupMsg && (
          <div className="zomato-popup">
            <div style={{ fontSize: 14, fontWeight: 700 }}>{popupMsg}</div>
          </div>
        )}
      </div>

      {step === 0 ? (
        <Button variant="primary" size="lg" onClick={startSim} style={{ background: '#e23744' }}>
          ▶️ Start Delivery Simulation
        </Button>
      ) : (
        <Button variant="secondary" onClick={resetSim}>
          🔄 Reset Simulation
        </Button>
      )}
    </div>
  );
}

export default function ZomatoPage() {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);

  const addToCart = (item, restaurantId, restaurantName) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, restaurantId, restaurantName }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setCart((prev) => prev.map((i) => {
      if (i.menuItemId === menuItemId) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : null;
      }
      return i;
    }).filter(Boolean));
  };

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <LldPage
      module="zomato"
      title="Zomato Food Delivery"
      icon="🍕"
      tabs={['app', 'cart', 'orders', 'demo', 'diagram', 'design']}
    >
      {(activeTab) => (
        <div className="zomato-container">
          <style>{ZOMATO_CSS}</style>
          {activeTab === 'app' && (
            selectedRestaurant ? (
              <MenuView
                restaurant={selectedRestaurant}
                cart={cart}
                addToCart={addToCart}
                updateQty={updateQty}
                onBack={() => setSelectedRestaurant(null)}
              />
            ) : (
              <RestaurantList onSelect={setSelectedRestaurant} />
            )
          )}
          {activeTab === 'cart' && (
            <CartView
              cart={cart}
              updateQty={updateQty}
              onOrderPlaced={() => setCart([])}
            />
          )}
          {activeTab === 'orders' && <OrdersView />}
          {activeTab === 'demo' && <AnimatedFlow />}
        </div>
      )}
    </LldPage>
  );
}
