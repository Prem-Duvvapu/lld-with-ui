import React, { useState, useEffect, useRef } from 'react';
import LldPage from '../../components/LldPage';
import ClassDiagram from '../../components/ClassDiagram';
import DesignDetails from '../../components/DesignDetails';
import classDiagrams from '../../data/classDiagrams';
import designDetails from '../../data/designDetails';
import { useToast } from '../../components/ui/ToastContext';
import * as api from './api';

export default function ZomatoPage() {
  const [activeTab, setActiveTab] = useState('browse');
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

  // 2D Simulation States
  const [simStep, setSimStep] = useState(1);
  const [simAutoPlay, setSimAutoPlay] = useState(false);
  const [simScooterPos, setSimScooterPos] = useState(10); // percentage 10% to 80%
  const simTimerRef = useRef(null);

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
      const updated = await api.confirmOrder(orderId);
      showToast(`Order #${orderId} confirmed!`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartPreparing = async (orderId) => {
    try {
      const updated = await api.startPreparingOrder(orderId);
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

  // 2D Simulation Movement & AutoPlay Effect
  useEffect(() => {
    if (simStep === 6) {
      // OUT_FOR_DELIVERY step - animate scooter from 15% to 75%
      setSimScooterPos(15);
      const timer = setTimeout(() => setSimScooterPos(75), 100);
      return () => clearTimeout(timer);
    } else if (simStep >= 7) {
      setSimScooterPos(75);
    } else {
      setSimScooterPos(15);
    }
  }, [simStep]);

  useEffect(() => {
    if (simAutoPlay) {
      simTimerRef.current = setInterval(() => {
        setSimStep(prev => (prev < 8 ? prev + 1 : 1));
      }, 3500);
    } else {
      clearInterval(simTimerRef.current);
    }
    return () => clearInterval(simTimerRef.current);
  }, [simAutoPlay]);

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || restaurants[0];
  const currentAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const categories = ['ALL', 'Main Course', 'Burgers', 'Pizzas', 'Sides', 'Desserts', 'Beverages'];
  const filteredMenu = currentRestaurant?.menu?.filter(item =>
    selectedCategory === 'ALL' ? true : item.category === selectedCategory
  ) || [];

  // Order status badge styling helper
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

  const tabs = [
    { id: 'browse', label: '🍕 Food Ordering' },
    { id: 'restaurant', label: '🏪 Restaurant Dashboard' },
    { id: 'driver', label: '🛵 Delivery Partner' },
    { id: 'simulation', label: '🎬 Interactive 2D Simulation' },
    { id: 'diagram', label: '📊 Class Diagram' },
    { id: 'details', label: '📝 Design Details' }
  ];

  return (
    <LldPage
      title="Zomato — Food Delivery Service LLD"
      subtitle="Multi-restaurant ordering, state machine lifecycle, 4-digit OTP verification, multiple payments & real-time 2D delivery simulation"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Zomato Food Delivery Service...
        </div>
      ) : (
        <>
          {/* TAB 1: FOOD ORDERING (CUSTOMER VIEW) */}
          {activeTab === 'browse' && (
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
          {activeTab === 'restaurant' && (
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
          {activeTab === 'driver' && (
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
          {activeTab === 'simulation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Simulation Toolbar */}
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setSimAutoPlay(!simAutoPlay)}
                    style={{
                      padding: '8px 16px',
                      background: simAutoPlay ? '#ef4444' : '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {simAutoPlay ? '⏸ Pause Auto-Play' : '▶ Start Guided Tour'}
                  </button>
                  <button
                    onClick={() => setSimStep(prev => Math.max(1, prev - 1))}
                    disabled={simStep === 1}
                    style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    ⏮ Prev Step
                  </button>
                  <button
                    onClick={() => setSimStep(prev => Math.min(8, prev + 1))}
                    disabled={simStep === 8}
                    style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    Next Step ⏭
                  </button>
                  <button
                    onClick={() => { setSimStep(1); setSimAutoPlay(false); }}
                    style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    ↺ Reset
                  </button>
                </div>

                <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: '#e23744' }}>
                  Step {simStep} of 8: {
                    simStep === 1 ? '1. Customer Selects Items & Cart' :
                    simStep === 2 ? '2. Payment & Order Placement (PLACED)' :
                    simStep === 3 ? '3. Restaurant Accepts Order (CONFIRMED)' :
                    simStep === 4 ? '4. Kitchen Cooking Food (PREPARING)' :
                    simStep === 5 ? '5. Order Ready & Agent Assigned (READY_FOR_PICKUP)' :
                    simStep === 6 ? '6. Scooter Out for Delivery (OUT_FOR_DELIVERY)' :
                    simStep === 7 ? '7. Agent Arrives & Verifies OTP' :
                    '8. Order Delivered & Payment Settled'
                  }
                </div>
              </div>

              {/* 2D Graphic City Scene SVG */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '380px',
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <svg width="100%" height="100%" viewBox="0 0 1000 380">
                  {/* Sky & Background Elements */}
                  <rect x="0" y="0" width="1000" height="240" fill="#0f172a" />

                  {/* Restaurant Building (Left) */}
                  <g transform="translate(40, 60)">
                    <rect x="0" y="0" width="140" height="150" fill="#e23744" rx="8" />
                    <rect x="20" y="30" width="100" height="30" fill="#ffffff" rx="4" />
                    <text x="70" y="50" fill="#e23744" fontSize="13" fontWeight="bold" textAnchor="middle">SPICE GARDEN</text>
                    <rect x="30" y="90" width="30" height="40" fill="#facc15" opacity="0.8" />
                    <rect x="80" y="90" width="30" height="40" fill="#facc15" opacity="0.8" />

                    {/* Animated Smoke Particles when Cooking */}
                    {simStep === 4 && (
                      <g className="smoke-animation">
                        <circle cx="70" cy="-10" r="8" fill="#cbd5e1" opacity="0.6" />
                        <circle cx="78" cy="-25" r="12" fill="#94a3b8" opacity="0.4" />
                        <circle cx="65" cy="-42" r="16" fill="#64748b" opacity="0.2" />
                      </g>
                    )}
                  </g>

                  {/* Customer House (Right) */}
                  <g transform="translate(820, 70)">
                    <polygon points="60,0 0,60 120,60" fill="#3b82f6" />
                    <rect x="10" y="60" width="100" height="90" fill="#1e40af" rx="4" />
                    <rect x="45" y="90" width="30" height="60" fill="#60a5fa" />
                    <circle cx="60" cy="35" r="10" fill="#fef08a" />
                  </g>

                  {/* Road Network (Asphalt) */}
                  <rect x="0" y="210" width="1000" height="110" fill="#334155" />
                  <line x1="0" y1="265" x2="1000" y2="265" stroke="#facc15" strokeWidth="4" strokeDasharray="20,15" />

                  {/* Animated Scooter / Bike */}
                  <g transform={`translate(${(simScooterPos / 100) * 1000}, 240)`} style={{ transition: 'transform 2s ease-in-out' }}>
                    {/* Headlight Beam */}
                    <polygon points="50,15 130,-10 130,40" fill="#fef08a" opacity="0.35" />

                    {/* Scooter Body */}
                    <circle cx="10" cy="25" r="12" fill="#000000" />
                    <circle cx="45" cy="25" r="12" fill="#000000" />
                    <rect x="10" y="10" width="35" height="12" fill="#e23744" rx="3" />
                    <circle cx="40" cy="5" r="8" fill="#e23744" />
                    <text x="26" y="20" fill="#ffffff" fontSize="10" fontWeight="bold">ZOMATO</text>
                  </g>
                </svg>

                {/* HUD Live Overlay Card */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: 'var(--font-xs)'
                }}>
                  <div style={{ fontWeight: 700, color: '#e23744', marginBottom: '4px' }}>📍 LIVE ORDER HUD</div>
                  <div>Status: <strong style={{ color: '#22c55e' }}>{
                    simStep === 1 ? 'SELECTING_ITEMS' :
                    simStep === 2 ? 'PLACED' :
                    simStep === 3 ? 'CONFIRMED' :
                    simStep === 4 ? 'PREPARING' :
                    simStep === 5 ? 'READY_FOR_PICKUP' :
                    simStep === 6 ? 'OUT_FOR_DELIVERY' :
                    simStep === 7 ? 'VERIFYING_OTP' : 'DELIVERED'
                  }</strong></div>
                  <div>Delivery OTP: <strong>{simStep >= 2 ? '4821' : '---'}</strong></div>
                  <div>Assigned Agent: <strong>{simStep >= 5 ? 'Ramesh Kumar (KA-01-EQ-1234)' : 'Unassigned'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLASS DIAGRAM */}
          {activeTab === 'diagram' && (
            <ClassDiagram diagram={classDiagrams.zomato} />
          )}

          {/* TAB 6: DESIGN DETAILS */}
          {activeTab === 'details' && (
            <DesignDetails details={designDetails.zomato} />
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
