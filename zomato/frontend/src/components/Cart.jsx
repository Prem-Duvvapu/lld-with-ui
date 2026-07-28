import { useState } from 'react';
import { placeOrder } from '../api';

export default function Cart({ cart, userId, updateQty, onOrderPlaced }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const restaurantIds = [...new Set(cart.map((i) => i.restaurantId))];

  const handleCheckout = async () => {
    if (restaurantIds.length > 1) {
      setError('Please order from one restaurant at a time');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await placeOrder(
        cart[0].restaurantId,
        userId,
        cart.map(({ menuItemId, name, quantity, price }) => ({ menuItemId, name, quantity, price }))
      );
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        onOrderPlaced();
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !result) {
    return <div className="cart-empty">Your cart is empty. Browse restaurants to add items.</div>;
  }

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
