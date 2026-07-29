import { Link } from 'react-router-dom'
import './Home.css'

const ICONS = {
  'Parking Lot': '🅿️', 'Zomato': '🍕', 'Uber': '🚗',
  'Stack Overflow': '📚', 'Tic Tac Toe': '❌', 'Snake & Ladders': '🐍',
  'ATM': '🏧', 'Splitwise': '💰', 'Elevator': '🛗',
  'Library': '📖', 'Movie Ticket': '🎬', 'Hotel Management': '🏨',
  'Airline Reservation': '✈️', 'Coffee Machine': '☕', 'Digital Wallet': '💳',
  'Chess': '♟️', 'Ludo': '🎲', 'Minesweeper': '💣',
  'Vending Machine': '🏪', 'Inventory Management': '📦', 'Shopping Cart': '🛒',
}

const DESCRIPTIONS = {
  'Parking Lot': 'Multi-level parking with gates, spot tracking, and ticket-based pricing',
  'Zomato': 'Food delivery with restaurant browsing, cart, and order state machine',
  'Uber': 'Ride-hailing with fare estimation, driver assignment, and ride tracking',
  'Stack Overflow': 'Q&A platform with voting, reputation system, and tag-based search',
  'Tic Tac Toe': '2-player game on a 3x3 grid with win/draw detection',
  'Snake & Ladders': 'Multiplayer board game with dice roll and snake/ladder mappings',
  'ATM': 'Banking ATM with card authentication, withdraw, deposit, and transaction history',
  'Splitwise': 'Expense sharing with EQUAL/PERCENTAGE/EXACT split strategies',
  'Elevator': 'Elevator control system with SCAN scheduling and animated movement',
  'Library': 'Book inventory, member management, borrow/return with fine calculation',
  'Movie Ticket': 'Movie listings, show timings, seat selection, and ticket booking',
  'Hotel Management': 'Hotel search, room booking, check-in/check-out with status tracking',
  'Airline Reservation': 'Flight search, seat map, booking with multi-class fare system',
  'Coffee Machine': 'Beverage menu, ingredient management, brewing with state machine',
  'Digital Wallet': 'Wallet balance, send/receive money, transaction history with UPI/CARD',
  'Chess': 'Full chess engine with piece validation, check/checkmate detection',
  'Ludo': 'Multiplayer board game with dice roll, token movement, captures and safe spots',
  'Minesweeper': 'Minefield grid with reveal, flagging, flood-fill and win/loss detection',
  'Vending Machine': 'Product slots, coin insertion, dispensing with cancel support',
  'Inventory Management': 'Stock tracking, inbound/outbound movements, low stock alerts',
  'Shopping Cart': 'Product catalog, cart management, checkout flow with order tracking',
}

const CATEGORIES = [
  {
    name: 'Core', icon: '🏗️',
    items: ['Parking Lot', 'Splitwise', 'Elevator', 'ATM', 'Library', 'Movie Ticket', 'Hotel Management', 'Airline Reservation', 'Cab Booking', 'Food Delivery'],
    names: { 'Cab Booking': 'Uber', 'Food Delivery': 'Zomato' },
  },
  {
    name: 'Games', icon: '🎮',
    items: ['Snake & Ladders', 'Tic Tac Toe', 'Chess', 'Ludo', 'Minesweeper'],
  },
  {
    name: 'Real-world', icon: '🌍',
    items: ['Vending Machine', 'Coffee Machine', 'Digital Wallet', 'Inventory Management', 'Shopping Cart'],
  },
  {
    name: 'Platforms', icon: '🔗',
    items: ['Stack Overflow'],
  },
]

function cardGrid(titles, llds, nameMap) {
  const routeMap = Object.fromEntries(llds.map(({ path, title }) => [title, path]))
  return (
    <div className="lld-grid">
      {titles.map(title => {
        const displayTitle = nameMap?.[title] || title
        const path = routeMap[displayTitle]
        if (!path) return null
        return (
          <Link key={path} to={`/${path}`} className="lld-card">
            <span className="lld-icon">{ICONS[displayTitle] || '📐'}</span>
            <h2>{displayTitle === title ? title : displayTitle}</h2>
            <p>{DESCRIPTIONS[displayTitle] || ''}</p>
            <span className="lld-link">Explore →</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function Home({ llds }) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-badge">🎯 SDE-2 Interview Prep</div>
        <h1>Master LLD Through<br /><span className="gradient-text">Interactive Visuals</span></h1>
        <p className="home-subtitle">Explore 21 real-world Low-Level Design patterns — each with a live UI, class diagram, and working backend.</p>
        <div className="home-stats">
          <span>⚡ 21 Projects</span>
          <span>📐 21 Class Diagrams</span>
          <span>🎨 Live UIs</span>
          <span>☕ Java + React</span>
        </div>
      </header>
      {CATEGORIES.map(cat => (
        <section key={cat.name} className="home-section">
          <h2 className="section-title"><span>{cat.icon}</span> {cat.name}</h2>
          <p className="section-subtitle">{cat.items.length} projects</p>
          {cardGrid(cat.items, llds, cat.names)}
        </section>
      ))}
    </div>
  )
}
