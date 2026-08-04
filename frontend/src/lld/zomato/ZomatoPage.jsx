import React, { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import StepIndicator from '../../components/ui/StepIndicator';
import classDiagrams from '../../data/classDiagrams';
import designDetails from '../../data/designDetails';
import { useToast } from '../../components/ui/ToastContext';
import * as api from './api';

export default function ZomatoPage() {
  const { showToast } = useToast();

  // Data states
  const [restaurants, setRestaurants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [cart, setCart] = useState([]); // [{ menuItem, quantity }]
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Active tracking order
  const [activeOrder, setActiveOrder] = useState(null);

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpTargetOrderId, setOtpTargetOrderId] = useState('');

  // Initial Fetch
  const fetchData = async () => {
    try {
      const [restsData, custsData, agentsData, ordersData, notifsData] = await Promise.all([
        api.getRestaurants(),
        api.getCustomers(),
        api.getDeliveryAgents(),
        api.getOrders(),
        api.getNotifications()
      ]);

      setRestaurants(restsData || []);
      setCustomers(custsData || []);
      setAgents(agentsData || []);
      setOrders(ordersData || []);
      setNotifications(notifsData || []);

      if (custsData?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custsData[0].id);
        setDeliveryAddress(custsData[0].deliveryAddress || '');
      }
      if (restsData?.length > 0 && !selectedRestaurantId) {
        setSelectedRestaurantId(restsData[0].id);
      }
      if (agentsData?.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agentsData[0].id);
      }

      if (ordersData?.length > 0) {
        const latest = ordersData[0];
        setActiveOrder(latest);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching Zomato data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update selected customer address
  useEffect(() => {
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (cust) {
      setDeliveryAddress(cust.deliveryAddress || '');
    }
  }, [selectedCustomerId, customers]);

  // Cart operations
  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
    showToast(`Added ${menuItem.name} to cart`, 'success');
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map(item => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 35 : 0;
  const tax = Math.round((subtotal * 0.05) * 100) / 100;
  const totalPayable = subtotal + deliveryFee + tax;

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showToast('Your cart is empty!', 'error');
      return;
    }
    try {
      const orderItems = cart.map(item => ({
        itemId: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity
      }));

      const newOrder = await api.placeOrder({
        customerId: selectedCustomerId,
        restaurantId: selectedRestaurantId,
        items: orderItems,
        deliveryAddress: deliveryAddress,
        paymentMethod: paymentMethod
      });

      showToast(`Order #${newOrder.id} placed successfully! OTP: ${newOrder.deliveryOtp}`, 'success');
      setCart([]);
      setActiveOrder(newOrder);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    }
  };

  // Restaurant Actions
  const handleConfirmOrder = async (orderId) => {
    try {
      await api.confirmOrder(orderId);
      showToast(`Order #${orderId} confirmed!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartPreparing = async (orderId) => {
    try {
      await api.startPreparingOrder(orderId);
      showToast(`Order #${orderId} is now preparing in kitchen!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      const updated = await api.markReadyForPickup(orderId);
      if (updated.status === 'OUT_FOR_DELIVERY') {
        showToast(`Order #${orderId} ready! Assigned agent: ${updated.deliveryAgentName}`, 'success');
      } else {
        showToast(`Order #${orderId} ready for pickup! Waiting for available agent.`, 'info');
      }
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleMenuAvailability = async (restId, itemId, currentAvailable) => {
    try {
      await api.updateMenuItemAvailability(restId, itemId, !currentAvailable);
      showToast(`Menu item status updated!`, 'info');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delivery Agent Actions
  const handleToggleAgentStatus = async (agentId, currentAvailable) => {
    try {
      await api.toggleAgentAvailability(agentId, !currentAvailable);
      showToast(`Delivery Agent status updated!`, 'info');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openOtpModal = (orderId) => {
    setOtpTargetOrderId(orderId);
    setOtpInput('');
    setOtpModalOpen(true);
  };

  const handleVerifyOtpAndDeliver = async () => {
    if (!otpInput || otpInput.length !== 4) {
      showToast('Please enter a valid 4-digit OTP', 'error');
      return;
    }
    try {
      await api.verifyOtpAndDeliver(otpTargetOrderId, otpInput);
      showToast(`Order #${otpTargetOrderId} delivered successfully!`, 'success');
      setOtpModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Invalid OTP', 'error');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await api.cancelOrder(orderId, 'Cancelled by user');
      showToast(`Order #${orderId} cancelled & payment refunded.`, 'info');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || restaurants[0];
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const categories = ['ALL', 'Main Course', 'Burgers', 'Pizzas', 'Sides', 'Desserts', 'Beverages'];
  const filteredMenu = currentRestaurant?.menu?.filter(item =>
    selectedCategory === 'ALL' ? true : item.category === selectedCategory
  ) || [];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PLACED': return 'badge-warning';
      case 'CONFIRMED': return 'badge-info';
      case 'PREPARING': return 'badge-accent';
      case 'READY_FOR_PICKUP': return 'badge-secondary';
      case 'OUT_FOR_DELIVERY': return 'badge-primary';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-default';
    }
  };

  return (
    <LldPage
      module="zomato"
      title="Zomato Food Delivery Service"
      icon="🍕"
      tabs={['browse', 'restaurant', 'driver', 'simulation', 'diagram', 'details']}
    >
      {(tab) => (
        <>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading Zomato Food Delivery Service...
            </div>
          ) : (
            <>
              {/* TAB 1: FOOD ORDERING (CUSTOMER VIEW) */}
              {tab === 'browse' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                  {/* Left Column: Restaurants & Menu */}
                  <div>
                    {/* Customer Profile Selector */}
                    <div style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px 20px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Customer</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontWeight: 600
                            }}
                          >
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>
                        <div style={{ color: 'var(--text-secondary)' }}>📍 Delivery Address:</div>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Enter delivery address..."
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--font-xs)',
                            width: '240px',
                            marginTop: '4px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Restaurant Cards Selector */}
                    <h3 style={{ fontSize: 'var(--font-lg)', marginBottom: '12px', fontWeight: 700 }}>Select Restaurant</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                      {restaurants.map(rest => {
                        const isSelected = rest.id === selectedRestaurantId;
                        return (
                          <div
                            key={rest.id}
                            onClick={() => setSelectedRestaurantId(rest.id)}
                            style={{
                              background: isSelected ? 'rgba(226, 55, 68, 0.08)' : 'var(--card-bg)',
                              border: isSelected ? '2px solid #e23744' : '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 'var(--font-base)', color: isSelected ? '#e23744' : 'var(--text-primary)' }}>
                                {rest.name}
                              </span>
                              <span style={{ fontSize: 'var(--font-xs)', background: '#22c55e', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                ★ {rest.rating}
                              </span>
                            </div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>{rest.cuisine}</div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>📍 {rest.address}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Menu Category Filter Pills */}
                    {currentRestaurant && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Menu — {currentRestaurant.name}</h3>
                          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                            {categories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: 'var(--font-xs)',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: selectedCategory === cat ? '#e23744' : 'var(--bg-secondary)',
                                  color: selectedCategory === cat ? '#fff' : 'var(--text-primary)'
                                }}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Menu Item Cards Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                          {filteredMenu.map(item => {
                            const inCart = cart.find(c => c.menuItem.id === item.id);
                            return (
                              <div
                                key={item.id}
                                style={{
                                  background: 'var(--card-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justify: 'space-between'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      width: '14px',
                                      height: '14px',
                                      border: `2px solid ${item.isVeg ? '#22c55e' : '#ef4444'}`,
                                      borderRadius: '3px',
                                      position: 'relative'
                                    }}>
                                      <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: item.isVeg ? '#22c55e' : '#ef4444',
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px'
                                      }} />
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>{item.name}</span>
                                  </div>
                                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '32px' }}>
                                    {item.description}
                                  </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 800, fontSize: 'var(--font-base)', color: 'var(--text-primary)' }}>
                                    ₹{item.price.toFixed(2)}
                                  </span>
                                  {!item.available ? (
                                    <span style={{ fontSize: 'var(--font-xs)', color: '#ef4444', fontWeight: 600 }}>Out of Stock</span>
                                  ) : inCart ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e23744', color: '#fff', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                                      <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>-</button>
                                      <span style={{ fontWeight: 700, fontSize: 'var(--font-xs)' }}>{inCart.quantity}</span>
                                      <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+</button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart(item)}
                                      style={{
                                        padding: '6px 14px',
                                        background: 'var(--bg-secondary)',
                                        color: '#e23744',
                                        border: '1px solid #e23744',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 700,
                                        fontSize: 'var(--font-xs)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + ADD
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Sticky Cart & Active Order Tracker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Cart Drawer */}
                    <div style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>🛒 Your Food Cart</h3>
                        {cart.length > 0 && (
                          <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 'var(--font-xs)', cursor: 'pointer' }}>Clear</button>
                        )}
                      </div>

                      {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                          Cart is empty. Add items from the menu!
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                            {cart.map(item => (
                              <div key={item.menuItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-xs)' }}>
                                <div>
                                  <span style={{ fontWeight: 600 }}>{item.menuItem.name}</span>
                                  <div style={{ color: 'var(--text-muted)' }}>₹{item.menuItem.price} × {item.quantity}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button onClick={() => updateQuantity(item.menuItem.id, -1)} style={{ padding: '2px 6px', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>-</button>
                                  <span>{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.menuItem.id, 1)} style={{ padding: '2px 6px', border: '1px solid var(--border-color)', borderRadius: '3px', cursor: 'pointer' }}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Payment Method Selector */}
                          <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                              💳 Select Payment Method
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 'var(--font-xs)'
                              }}
                            >
                              <option value="UPI">UPI (Google Pay / PhonePe)</option>
                              <option value="CREDIT_CARD">Credit Card</option>
                              <option value="DEBIT_CARD">Debit Card</option>
                              <option value="WALLET">Zomato Wallet</option>
                              <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                            </select>
                          </div>

                          {/* Summary Breakdown */}
                          <div style={{ fontSize: 'var(--font-xs)', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Item Subtotal:</span>
                              <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Delivery Surcharge:</span>
                              <span>₹{deliveryFee.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>GST Tax (5%):</span>
                              <span>₹{tax.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'var(--font-sm)', color: '#e23744', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                              <span>To Pay:</span>
                              <span>₹{totalPayable.toFixed(2)}</span>
                            </div>
                          </div>

                          <button
                            onClick={handlePlaceOrder}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: '#e23744',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: 700,
                              fontSize: 'var(--font-sm)',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(226, 55, 68, 0.3)'
                            }}
                          >
                            Place Order (₹{totalPayable.toFixed(2)})
                          </button>
                        </>
                      )}
                    </div>

                    {/* Active Order Tracker Card */}
                    {activeOrder && (
                      <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>🚴 Active Order Tracker</h4>
                          <span className={`badge ${getStatusBadgeClass(activeOrder.status)}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            {activeOrder.status}
                          </span>
                        </div>

                        <div style={{ fontSize: 'var(--font-xs)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>Order ID:</strong> #{activeOrder.id}</div>
                          <div><strong>Restaurant:</strong> {activeOrder.restaurantName}</div>
                          <div><strong>Total Amount:</strong> ₹{activeOrder.totalAmount?.toFixed(2)}</div>
                          {activeOrder.deliveryOtp && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '8px', borderRadius: 'var(--radius-sm)', marginTop: '4px', color: '#22c55e', fontWeight: 700, textAlign: 'center' }}>
                              🔑 Delivery OTP: {activeOrder.deliveryOtp}
                            </div>
                          )}
                          {activeOrder.deliveryAgentName && (
                            <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                              🛵 Agent: <strong>{activeOrder.deliveryAgentName}</strong> ({activeOrder.deliveryAgentPhone})
                            </div>
                          )}
                        </div>

                        {/* Order Stepper */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                          {['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((st, idx) => {
                            const statuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
                            const currentIdx = statuses.indexOf(activeOrder.status);
                            const isDone = currentIdx >= idx;
                            const isCurrent = currentIdx === idx;

                            return (
                              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                                <span style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: isCurrent ? '#e23744' : isDone ? '#22c55e' : 'var(--bg-secondary)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '10px'
                                }}>
                                  {isDone ? '✓' : idx + 1}
                                </span>
                                <span style={{ color: isCurrent ? '#e23744' : isDone ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>
                                  {st}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {activeOrder.status !== 'DELIVERED' && activeOrder.status !== 'CANCELLED' && activeOrder.status !== 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleCancelOrder(activeOrder.id)}
                            style={{
                              width: '100%',
                              marginTop: '16px',
                              padding: '8px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid #ef4444',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--font-xs)',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: RESTAURANT MANAGER DASHBOARD */}
              {tab === 'restaurant' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                  {/* Left Column: Menu Management */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px' }}>🏪 Manage Restaurant</h3>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Select Restaurant</label>
                      <select
                        value={selectedRestaurantId}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      >
                        {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>

                    <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginTop: '20px', marginBottom: '12px' }}>Menu Stock Availability</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                      {currentRestaurant?.menu?.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--border-color)', fontSize: 'var(--font-xs)' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div style={{ color: 'var(--text-muted)' }}>₹{item.price}</div>
                          </div>
                          <button
                            onClick={() => handleToggleMenuAvailability(currentRestaurant.id, item.id, item.available)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              background: item.available ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: item.available ? '#22c55e' : '#ef4444'
                            }}
                          >
                            {item.available ? 'IN STOCK' : 'OUT OF STOCK'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Kitchen Order Queue */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px' }}>👩‍🍳 Kitchen Incoming Orders Queue</h3>

                    {orders.filter(o => o.restaurantId === selectedRestaurantId).length === 0 ? (
                      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No active orders for {currentRestaurant?.name} yet. Place an order from the Food Ordering tab!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {orders.filter(o => o.restaurantId === selectedRestaurantId).map(ord => (
                          <div
                            key={ord.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '16px',
                              background: 'var(--bg-primary)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)' }}>Order #{ord.id}</span>
                                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginLeft: '12px' }}>Customer: {ord.customerName} ({ord.customerPhone})</span>
                              </div>
                              <span className={`badge ${getStatusBadgeClass(ord.status)}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                {ord.status}
                              </span>
                            </div>

                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                              <strong>Items:</strong> {ord.items?.map(i => `${i.name} × ${i.quantity}`).join(', ')} | <strong>Total:</strong> ₹{ord.totalAmount?.toFixed(2)}
                            </div>

                            {/* Kitchen Workflow Controls */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {ord.status === 'PLACED' && (
                                <button
                                  onClick={() => handleConfirmOrder(ord.id)}
                                  style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-xs)', cursor: 'pointer' }}
                                >
                                  ✓ Accept Order
                                </button>
                              )}
                              {ord.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleStartPreparing(ord.id)}
                                  style={{ padding: '6px 14px', background: '#eab308', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-xs)', cursor: 'pointer' }}
                                >
                                  🍳 Start Cooking (Preparing)
                                </button>
                              )}
                              {ord.status === 'PREPARING' && (
                                <button
                                  onClick={() => handleMarkReady(ord.id)}
                                  style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-xs)', cursor: 'pointer' }}
                                >
                                  📦 Mark Ready for Pickup
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DELIVERY PARTNER DASHBOARD */}
              {tab === 'driver' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                  {/* Agent Selector & Availability */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px' }}>🛵 Delivery Agent Controls</h3>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Active Delivery Agent</label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      >
                        {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.vehicleNumber})</option>)}
                      </select>
                    </div>

                    {currentAgent && (
                      <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 700 }}>{currentAgent.name}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>📞 {currentAgent.phone}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>🛵 {currentAgent.vehicleNumber}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '6px' }}>Total Completed Deliveries: <strong>{currentAgent.totalDeliveries}</strong></div>

                        <button
                          onClick={() => handleToggleAgentStatus(currentAgent.id, currentAgent.available)}
                          style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '10px',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: 'var(--font-xs)',
                            cursor: 'pointer',
                            background: currentAgent.available ? '#22c55e' : '#ef4444',
                            color: '#fff'
                          }}
                        >
                          {currentAgent.available ? '🟢 ONLINE / AVAILABLE' : '🔴 OFFLINE'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Agent Deliveries Queue */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '16px' }}>📦 Assigned Delivery Tasks</h3>

                    {orders.filter(o => o.deliveryAgentId === selectedAgentId).length === 0 ? (
                      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No delivery tasks currently assigned to {currentAgent?.name}.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {orders.filter(o => o.deliveryAgentId === selectedAgentId).map(ord => (
                          <div
                            key={ord.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: '16px',
                              background: 'var(--bg-primary)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 700 }}>Order #{ord.id}</span>
                              <span className={`badge ${getStatusBadgeClass(ord.status)}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                {ord.status}
                              </span>
                            </div>

                            <div style={{ fontSize: 'var(--font-xs)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                              <div>🏪 <strong>Pickup From:</strong> {ord.restaurantName}</div>
                              <div>📍 <strong>Deliver To:</strong> {ord.customerName} ({ord.deliveryAddress})</div>
                              <div>📞 <strong>Customer Phone:</strong> {ord.customerPhone}</div>
                            </div>

                            {ord.status === 'OUT_FOR_DELIVERY' && (
                              <button
                                onClick={() => openOtpModal(ord.id)}
                                style={{
                                  padding: '8px 16px',
                                  background: '#22c55e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: 700,
                                  fontSize: 'var(--font-xs)',
                                  cursor: 'pointer'
                                }}
                              >
                                🔑 Verify OTP & Complete Delivery
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: INTERACTIVE 2D SIMULATION SCENE */}
              {tab === 'simulation' && <InteractiveZomatoSimulation />}
            </>
          )}
        </>
      )}

      {/* OTP Verification Modal */}
      {otpModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '320px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '8px' }}>🔑 Enter Delivery OTP</h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ask the customer for the 4-digit verification OTP to complete delivery for Order #{otpTargetOrderId}.
            </p>

            <input
              type="text"
              maxLength={4}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="e.g. 4821"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 'var(--font-xl)',
                letterSpacing: '8px',
                textAlign: 'center',
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                marginBottom: '16px'
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setOtpModalOpen(false)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtpAndDeliver}
                style={{ flex: 1, padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}
              >
                Verify & Deliver
              </button>
            </div>
          </div>
        </div>
      )}
    </LldPage>
  );
}

// Sub-component: Upgraded Interactive 2D Simulation Scene Connected directly to Backend REST APIs
function InteractiveZomatoSimulation() {
  const [step, setStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [payMethod, setPayMethod] = useState('UPI');
  const [scooterLeft, setScooterLeft] = useState(150);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [realOrder, setRealOrder] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const { showToast } = useToast();
  const timerRef = useRef(null);

  const steps = [
    'Select Items',
    'Order Placed',
    'Restaurant Confirmed',
    'Kitchen Cooking',
    'Food Ready & Agent Assigned',
    'Scooter Out for Delivery',
    'Verify OTP Handoff',
    'Delivered & Settled'
  ];

  // Animate scooter position based on step
  useEffect(() => {
    if (step === 5) {
      setScooterLeft(150);
      const timer = setTimeout(() => setScooterLeft(720), 100);
      return () => clearTimeout(timer);
    } else if (step >= 6) {
      setScooterLeft(720);
    } else {
      setScooterLeft(150);
    }
  }, [step]);

  // Step 0 -> Step 1: Call Real Backend Place Order API
  const handleStep0PlaceOrder = async () => {
    setApiLoading(true);
    try {
      const newOrder = await api.placeOrder({
        customerId: 'CUST-101',
        restaurantId: 'REST-01',
        items: [
          { itemId: 'M101', name: 'Paneer Butter Masala', price: 260.0, quantity: 1 },
          { itemId: 'M102', name: 'Garlic Naan', price: 55.0, quantity: 2 }
        ],
        deliveryAddress: 'Apt 4B, Green Glen Layout, Bellandur, Bangalore',
        paymentMethod: payMethod
      });

      setRealOrder(newOrder);
      setInputOtp(newOrder.deliveryOtp || '4821');
      setStep(1);
      showToast(`Order #${newOrder.id} placed in backend! Secret OTP: ${newOrder.deliveryOtp}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to place order in backend', 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // Step 1 -> Step 2: Call Real Backend Confirm Order API
  const handleStep1ConfirmOrder = async () => {
    if (!realOrder) {
      setStep(2);
      return;
    }
    setApiLoading(true);
    try {
      const updated = await api.confirmOrder(realOrder.id);
      setRealOrder(updated);
      setStep(2);
      showToast(`Restaurant confirmed order #${realOrder.id} in backend!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to confirm order', 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // Step 2 -> Step 3: Call Real Backend Start Preparing API
  const handleStep2StartPreparing = async () => {
    if (!realOrder) {
      setStep(3);
      return;
    }
    setApiLoading(true);
    try {
      const updated = await api.startPreparingOrder(realOrder.id);
      setRealOrder(updated);
      setStep(3);
      showToast(`Kitchen started cooking order #${realOrder.id} in backend!`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to start cooking', 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // Step 3 -> Step 4: Call Real Backend Mark Ready for Pickup API
  const handleStep3MarkReady = async () => {
    if (!realOrder) {
      setStep(4);
      return;
    }
    setApiLoading(true);
    try {
      const updated = await api.markReadyForPickup(realOrder.id);
      setRealOrder(updated);
      setStep(4);
      showToast(`Order #${realOrder.id} ready! Assigned agent: ${updated.deliveryAgentName || 'Ramesh Kumar'}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to mark ready', 'error');
    } finally {
      setApiLoading(false);
    }
  };

  // Step 4 -> Step 5: Scooter Departs
  const handleStep4Depart = () => {
    setStep(5);
    showToast(`Agent ${realOrder?.deliveryAgentName || 'Ramesh Kumar'} departed for delivery!`, 'info');
  };

  // Step 5 -> Step 6: Arrive at Customer House
  const handleStep5Arrive = () => {
    setStep(6);
    showToast('Agent arrived at customer address! Please verify 4-digit OTP.', 'info');
  };

  // Step 6 -> Step 7: Call Real Backend Verify OTP & Deliver API
  const handleStep6VerifyOtp = async () => {
    if (!inputOtp || inputOtp.length !== 4) {
      setOtpError('Please enter a valid 4-digit OTP');
      showToast('Please enter a valid 4-digit OTP', 'error');
      return;
    }
    setApiLoading(true);
    try {
      if (realOrder) {
        const updated = await api.verifyOtpAndDeliver(realOrder.id, inputOtp.trim());
        setRealOrder(updated);
      }
      setOtpError('');
      setStep(7);
      showToast(`✅ OTP verified in backend! Order #${realOrder?.id || 'ORD-10101'} status set to DELIVERED.`, 'success');
    } catch (err) {
      const msg = err.message || 'Invalid OTP! Verification failed in backend.';
      setOtpError(`❌ ${msg}`);
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setApiLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setAutoPlay(false);
    setScooterLeft(150);
    setInputOtp('');
    setOtpError('');
    setRealOrder(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top StepIndicator */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>🎬 Interactive 2D Order Simulation</h3>
          <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: '#e23744' }}>
            Step {step + 1} of 8: {steps[step]}
          </div>
        </div>
        <StepIndicator steps={steps} currentStep={step} />
      </div>

      {/* 2D Graphic City Scene SVG */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 380">
          {/* Night Sky & Background */}
          <rect x="0" y="0" width="1000" height="230" fill="#0f172a" />
          
          {/* Stars */}
          <circle cx="120" cy="40" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="340" cy="25" r="2" fill="#ffffff" opacity="0.6" />
          <circle cx="580" cy="50" r="1" fill="#ffffff" opacity="0.9" />
          <circle cx="790" cy="30" r="1.5" fill="#ffffff" opacity="0.7" />

          {/* Street Lamps with Ambient Light Cones */}
          <g>
            {/* Lamp 1 */}
            <line x1="280" y1="160" x2="280" y2="230" stroke="#94a3b8" strokeWidth="4" />
            <circle cx="280" cy="160" r="6" fill="#fef08a" />
            <polygon points="280,160 230,230 330,230" fill="#fef08a" opacity="0.12" />

            {/* Lamp 2 */}
            <line x1="680" y1="160" x2="680" y2="230" stroke="#94a3b8" strokeWidth="4" />
            <circle cx="680" cy="160" r="6" fill="#fef08a" />
            <polygon points="680,160 630,230 730,230" fill="#fef08a" opacity="0.12" />
          </g>

          {/* Background Trees */}
          <g>
            <circle cx="220" cy="190" r="24" fill="#166534" />
            <rect x="216" y="195" width="8" height="35" fill="#78350f" />
            
            <circle cx="760" cy="190" r="24" fill="#166534" />
            <rect x="756" y="195" width="8" height="35" fill="#78350f" />
          </g>

          {/* Restaurant Building (Left) */}
          <g transform="translate(40, 50)">
            <rect x="0" y="0" width="150" height="180" fill="#e23744" rx="8" />
            <rect x="15" y="25" width="120" height="35" fill="#ffffff" rx="4" />
            <text x="75" y="47" fill="#e23744" fontSize="13" fontWeight="bold" textAnchor="middle">SPICE GARDEN</text>
            <rect x="25" y="90" width="40" height="50" fill="#fef08a" opacity="0.8" />
            <rect x="85" y="90" width="40" height="50" fill="#fef08a" opacity="0.8" />
            <rect x="60" y="130" width="30" height="50" fill="#7f1d1d" />

            {/* Animated Smoke Particles when Kitchen Cooking (Step 3) */}
            {step === 3 && (
              <g className="smoke-animation">
                <circle cx="75" cy="-12" r="10" fill="#cbd5e1" opacity="0.7" />
                <circle cx="85" cy="-30" r="15" fill="#94a3b8" opacity="0.5" />
                <circle cx="70" cy="-52" r="20" fill="#64748b" opacity="0.3" />
              </g>
            )}
          </g>

          {/* Customer House (Right) */}
          <g transform="translate(810, 60)">
            <polygon points="70,0 0,65 140,65" fill="#2563eb" />
            <rect x="15" y="65" width="110" height="105" fill="#1e3a8a" rx="4" />
            <rect x="50" y="105" width="40" height="65" fill="#60a5fa" />
            <circle cx="70" cy="35" r="12" fill="#fef08a" />
            
            {/* Location Pin */}
            <g transform="translate(70, -25)">
              <circle cx="0" cy="0" r="14" fill="#ef4444" />
              <circle cx="0" cy="0" r="6" fill="#ffffff" />
            </g>
          </g>

          {/* Sidewalk */}
          <rect x="0" y="230" width="1000" height="15" fill="#475569" />

          {/* Asphalt Road */}
          <rect x="0" y="245" width="1000" height="100" fill="#1e293b" />
          
          {/* Double Yellow Center Line */}
          <line x1="0" y1="292" x2="1000" y2="292" stroke="#facc15" strokeWidth="3" strokeDasharray="25,15" />
          <line x1="0" y1="298" x2="1000" y2="298" stroke="#facc15" strokeWidth="3" strokeDasharray="25,15" />

          {/* Zebra Crossings */}
          <g opacity="0.4">
            <rect x="200" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="230" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="760" y="245" width="15" height="100" fill="#ffffff" />
            <rect x="790" y="245" width="15" height="100" fill="#ffffff" />
          </g>

          {/* Animated Zomato Scooter */}
          <g transform={`translate(${scooterLeft}, 260)`} style={{ transition: 'transform 2.5s cubic-bezier(0.25, 1, 0.5, 1)' }}>
            {/* Headlight Beam */}
            <polygon points="55,15 160,-15 160,45" fill="#fef08a" opacity="0.3" />

            {/* Scooter Wheels */}
            <circle cx="12" cy="30" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="4" />
            <circle cx="52" cy="30" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="4" />

            {/* Scooter Frame & Delivery Box */}
            <path d="M 12 30 Q 30 30 40 15 L 52 30" fill="none" stroke="#e23744" strokeWidth="6" />
            <rect x="0" y="5" width="24" height="20" fill="#e23744" rx="4" />
            <text x="12" y="18" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">Z</text>

            {/* Driver Rider */}
            <circle cx="34" cy="5" r="8" fill="#e23744" />
            <rect x="30" y="13" width="12" height="15" fill="#334155" rx="2" />
          </g>
        </svg>

        {/* Floating Glassmorphism HUD Overlay */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: '#fff',
          fontSize: 'var(--font-xs)',
          minWidth: '260px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontWeight: 800, color: '#e23744', fontSize: 'var(--font-sm)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📍 ZOMATO LIVE HUD</span>
            <span style={{ fontSize: '10px', background: '#22c55e', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>REAL BACKEND</span>
          </div>
          <div>Order ID: <strong style={{ color: '#facc15' }}>#{realOrder?.id || 'ORD-10101'}</strong></div>
          <div>Status: <strong style={{ color: '#22c55e' }}>{
            realOrder?.status || (
              step === 0 ? 'CONFIGURING_ORDER' :
              step === 1 ? 'PLACED' :
              step === 2 ? 'CONFIRMED' :
              step === 3 ? 'PREPARING (COOKING)' :
              step === 4 ? 'READY_FOR_PICKUP' :
              step === 5 ? 'OUT_FOR_DELIVERY' :
              step === 6 ? 'VERIFYING_OTP' : 'DELIVERED'
            )
          }</strong></div>
          <div>Restaurant: <strong>Spice Garden</strong></div>
          <div>Secret OTP: <strong style={{ color: '#38bdf8' }}>{realOrder?.deliveryOtp || (step >= 1 ? '4821' : '---')}</strong></div>
          <div>Agent: <strong>{realOrder?.deliveryAgentName || (step >= 4 ? 'Ramesh Kumar (KA-01-EQ-1234)' : 'Unassigned')}</strong></div>
        </div>
      </div>

      {/* Step Navigation Controls & Toolbar */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleReset}
            style={{ padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
          >
            ↺ Reset Simulation
          </button>
        </div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
          All buttons execute real Spring Boot REST API calls!
        </div>
      </div>

      {/* Dynamic Interactive Workflow Panel per Step */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}>
        {/* STEP 0: CONFIGURE ORDER */}
        {step === 0 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#e23744' }}>
              Step 1: Select Items & Configure Food Order
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Customer Rahul Sharma is ordering food from Spice Garden restaurant via Spring Boot API.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: 'var(--font-xs)' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Selected Food Items:</div>
                <div>• Paneer Butter Masala (1 × ₹260.00)</div>
                <div>• Garlic Naan (2 × ₹55.00)</div>
                <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Subtotal: ₹370.00 | Delivery: ₹35.00 | GST: ₹18.50</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: '#e23744', marginTop: '4px' }}>Total Amount: ₹423.50</div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Payment Method:</div>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', marginBottom: '8px' }}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe)</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="WALLET">Zomato Wallet</option>
                </select>
                <div>📍 Address: Green Glen Layout, Bellandur</div>
              </div>
            </div>

            <button
              onClick={handleStep0PlaceOrder}
              disabled={apiLoading}
              style={{ padding: '12px 24px', background: '#e23744', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: apiLoading ? 'wait' : 'pointer' }}
            >
              {apiLoading ? 'Placing Order...' : '🛒 Place Food Order via API (₹423.50) ➔'}
            </button>
          </div>
        )}

        {/* STEP 1: ORDER PLACED */}
        {step === 1 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#eab308' }}>
              Step 2: Order Placed (Status: {realOrder?.status || 'PLACED'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Order <strong>#{realOrder?.id || 'ORD-10101'}</strong> created in backend with payment transaction <strong>{realOrder?.payment?.transactionRef || 'TXN-881920'}</strong>.
            </p>

            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#22c55e', fontSize: 'var(--font-base)' }}>🔑 Secret Delivery OTP: {realOrder?.deliveryOtp || '4821'}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>Generated by Java backend `ZomatoService.placeOrder`.</div>
              </div>
              <span className="badge badge-warning" style={{ padding: '6px 12px', borderRadius: '4px', fontWeight: 700 }}>{realOrder?.status || 'PLACED'}</span>
            </div>

            <button
              onClick={handleStep1ConfirmOrder}
              disabled={apiLoading}
              style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: apiLoading ? 'wait' : 'pointer' }}
            >
              {apiLoading ? 'Calling API...' : '🏪 Restaurant Accepts & Confirms Order via API ➔'}
            </button>
          </div>
        )}

        {/* STEP 2: RESTAURANT CONFIRMED */}
        {step === 2 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#3b82f6' }}>
              Step 3: Restaurant Confirms Order (Status: {realOrder?.status || 'CONFIRMED'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Spice Garden kitchen accepts order <strong>#{realOrder?.id || 'ORD-10101'}</strong> via Spring Boot API.
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: '#3b82f6' }}>📩 Real-Time Notification Dispatched</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                "Restaurant Spice Garden accepted your order! Estimated cooking time: 12 minutes."
              </div>
            </div>

            <button
              onClick={handleStep2StartPreparing}
              disabled={apiLoading}
              style={{ padding: '12px 24px', background: '#eab308', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: apiLoading ? 'wait' : 'pointer' }}
            >
              {apiLoading ? 'Calling API...' : '🍳 Start Cooking in Kitchen via API ➔'}
            </button>
          </div>
        )}

        {/* STEP 3: KITCHEN COOKING */}
        {step === 3 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#eab308' }}>
              Step 4: Kitchen Cooking (Status: {realOrder?.status || 'PREPARING'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Chef is cooking Paneer Butter Masala and baking fresh Garlic Naan in the oven. Smoke particles are rising from the stove in the 2D graphic scene above!
            </p>

            <button
              onClick={handleStep3MarkReady}
              disabled={apiLoading}
              style={{ padding: '12px 24px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: apiLoading ? 'wait' : 'pointer' }}
            >
              {apiLoading ? 'Matching Agent in Backend...' : '📦 Mark Ready & Match Agent via API ➔'}
            </button>
          </div>
        )}

        {/* STEP 4: FOOD READY & AGENT ASSIGNED */}
        {step === 4 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#8b5cf6' }}>
              Step 5: Food Ready & Delivery Agent Assigned (Status: {realOrder?.status || 'READY_FOR_PICKUP'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Food packed. Backend assigned delivery agent <strong>{realOrder?.deliveryAgentName || 'Ramesh Kumar'} ({realOrder?.deliveryAgentPhone || '+91 91111 22222'})</strong>.
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>🛵 Assigned Agent: {realOrder?.deliveryAgentName || 'Ramesh Kumar'}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Status: {realOrder?.status} | Phone: {realOrder?.deliveryAgentPhone || '+91 91111 22222'}</div>
              </div>
              <span className="badge badge-secondary" style={{ padding: '6px 12px', borderRadius: '4px', fontWeight: 700 }}>{realOrder?.status || 'OUT_FOR_DELIVERY'}</span>
            </div>

            <button
              onClick={handleStep4Depart}
              style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: 'pointer' }}
            >
              🛵 Scooter Departs for Delivery ➔
            </button>
          </div>
        )}

        {/* STEP 5: SCOOTER OUT FOR DELIVERY */}
        {step === 5 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#3b82f6' }}>
              Step 6: Scooter Out for Delivery (Status: {realOrder?.status || 'OUT_FOR_DELIVERY'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {realOrder?.deliveryAgentName || 'Ramesh Kumar'} is driving the Zomato delivery scooter across the asphalt road network to Green Glen Layout.
            </p>

            <button
              onClick={handleStep5Arrive}
              style={{ padding: '12px 24px', background: '#e23744', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--font-sm)', cursor: 'pointer' }}
            >
              📍 Arrive at Customer House ➔
            </button>
          </div>
        )}

        {/* STEP 6: OTP VERIFICATION HANDOFF */}
        {step === 6 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#38bdf8' }}>
              Step 7: Verify Secret Delivery OTP via Backend
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Agent arrived at customer address. Enter customer's 4-digit secret OTP (<strong>{realOrder?.deliveryOtp || '4821'}</strong>) to execute backend verification.
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '400px', marginBottom: '20px' }}>
              <div style={{ fontSize: 'var(--font-xs)', color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>🔑 Handoff Verification (Secret OTP: {realOrder?.deliveryOtp || '4821'})</div>
              <input
                type="text"
                maxLength={4}
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value)}
                placeholder={`e.g. ${realOrder?.deliveryOtp || '4821'}`}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: 'var(--font-xl)',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}
              />
              {otpError && <div style={{ color: '#ef4444', fontSize: 'var(--font-xs)', marginBottom: '8px' }}>{otpError}</div>}
              <button
                onClick={handleStep6VerifyOtp}
                disabled={apiLoading}
                style={{ width: '100%', padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: apiLoading ? 'wait' : 'pointer' }}
              >
                {apiLoading ? 'Verifying OTP in Backend...' : '🔑 Verify OTP via Backend API'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: ORDER DELIVERED & SETTLED */}
        {step === 7 && (
          <div>
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 700, marginBottom: '12px', color: '#22c55e' }}>
              Step 8: Order Delivered & Payment Settled (Status: {realOrder?.status || 'DELIVERED'})
            </h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Order successfully verified and delivered in Spring Boot backend! Payment settled via {realOrder?.payment?.paymentMethod || 'UPI'}.
            </p>

            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: 'var(--font-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: '#22c55e' }}>✅ Order #{realOrder?.id || 'ORD-10101'} Completed in Backend!</div>
                <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>Amount Paid: ₹{realOrder?.totalAmount?.toFixed(2) || '423.50'} | Agent freed for next delivery.</div>
                <div style={{ marginTop: '6px', color: '#facc15' }}>Customer Rating: ★★★★★ (5.0)</div>
              </div>
              <button
                onClick={handleReset}
                style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}
              >
                ↺ Reset Simulation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
