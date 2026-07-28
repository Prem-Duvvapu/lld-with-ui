export default function MenuView({ restaurant, cart, addToCart, updateQty, onBack }) {
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
            <button className="add-btn" onClick={() => addToCart(item, restaurant.id, restaurant.name)}>
              Add
            </button>
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
