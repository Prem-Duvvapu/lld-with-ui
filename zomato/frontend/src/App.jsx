import { useState } from 'react';
import RestaurantList from './components/RestaurantList';
import MenuView from './components/MenuView';
import Cart from './components/Cart';
import Orders from './components/Orders';
import './App.css';

const USER_ID = 'user1';

export default function App() {
  const [page, setPage] = useState('restaurants');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const addToCart = (item, restaurantId, restaurantName) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          quantity: 1,
          price: item.price,
          restaurantId,
          restaurantName,
        },
      ];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setCart((prev) => {
      const updated = prev
        .map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0);
      return updated;
    });
  };

  const clearCart = () => setCart([]);

  const onOrderPlaced = () => {
    clearCart();
    setRefreshKey((k) => k + 1);
    setPage('orders');
  };

  return (
    <div className="app">
      <header>
        <h1>Zomato</h1>
        <p>Food Delivery - Low-Level Design</p>
      </header>

      <nav>
        <button className={page === 'restaurants' ? 'active' : ''} onClick={() => { setPage('restaurants'); setSelectedRestaurant(null); }}>Restaurants</button>
        <button className={page === 'orders' ? 'active' : ''} onClick={() => setPage('orders')}>
          My Orders {cart.length > 0 && <span className="badge">{cart.length}</span>}
        </button>
        <button className={page === 'cart' ? 'active' : ''} onClick={() => setPage('cart')}>
          Cart {cart.length > 0 && <span className="badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
        </button>
      </nav>

      <main>
        {page === 'restaurants' && !selectedRestaurant && (
          <RestaurantList
            onSelect={(r) => { setSelectedRestaurant(r); setPage('menu'); }}
          />
        )}

        {page === 'menu' && selectedRestaurant && (
          <MenuView
            restaurant={selectedRestaurant}
            cart={cart}
            addToCart={addToCart}
            updateQty={updateQty}
            onBack={() => { setSelectedRestaurant(null); setPage('restaurants'); }}
          />
        )}

        {page === 'cart' && (
          <Cart
            cart={cart}
            userId={USER_ID}
            updateQty={updateQty}
            onOrderPlaced={onOrderPlaced}
          />
        )}

        {page === 'orders' && (
          <Orders key={refreshKey} userId={USER_ID} />
        )}
      </main>
    </div>
  );
}
