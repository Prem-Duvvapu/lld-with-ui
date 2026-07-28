import { useState, useEffect } from 'react';
import { getUserOrders, updateOrderStatus } from '../api';

const STATUS_FLOW = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function Orders({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    getUserOrders(userId)
      .then(setOrders)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const advanceStatus = async (orderId, currentStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[idx + 1];
      await updateOrderStatus(orderId, next);
      fetchOrders();
    }
  };

  const cancelOrder = async (orderId) => {
    await updateOrderStatus(orderId, 'CANCELLED');
    fetchOrders();
  };

  if (loading) return <div className="alert">Loading orders...</div>;

  if (orders.length === 0) {
    return <div className="alert">No orders yet. Start by ordering from a restaurant!</div>;
  }

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
              <span className={`status-badge status-${order.status}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{order.restaurantName}</div>
            <div className="order-items">
              {order.items.map((item) => (
                <div key={item.menuItemId}>{item.name} x{item.quantity} — ₹{item.price * item.quantity}</div>
              ))}
            </div>
            <div className="order-total">Total: ₹{order.totalAmount.toFixed(2)}</div>
            {order.deliveryPartnerName && (
              <div className="order-partner">Delivery Partner: {order.deliveryPartnerName}</div>
            )}
            <div className="order-actions">
              {canAdvance && (
                <button onClick={() => advanceStatus(order.id, order.status)}>
                  Next: {STATUS_FLOW[idx + 1].replace(/_/g, ' ')}
                </button>
              )}
              {canCancel && (
                <button onClick={() => cancelOrder(order.id)} style={{ color: '#d32f2f' }}>
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
