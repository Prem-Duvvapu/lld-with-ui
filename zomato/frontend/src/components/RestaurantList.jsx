import { useState, useEffect } from 'react';
import { getRestaurants } from '../api';

export default function RestaurantList({ onSelect }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants()
      .then(setRestaurants)
      .finally(() => setLoading(false));
  }, []);

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
