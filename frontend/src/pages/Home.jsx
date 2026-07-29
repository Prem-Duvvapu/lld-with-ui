import { Link } from 'react-router-dom'
import './Home.css'

const ICONS = {
  'Parking Lot': '🅿️',
  'Zomato': '🍕',
  'Uber': '🚗',
  'Stack Overflow': '📚',
  'Tic Tac Toe': '❌',
  'Snake & Ladders': '🐍',
  'ATM': '🏧',
  'Splitwise': '💰',
  'Elevator': '🛗',
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
}

export default function Home({ llds }) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-badge">🎯 SDE-2 Interview Prep</div>
        <h1>Master LLD Through<br /><span className="gradient-text">Interactive Visuals</span></h1>
        <p className="home-subtitle">Explore 9 real-world Low-Level Design patterns — each with a live UI, class diagram, and working backend.</p>
        <div className="home-stats">
          <span>⚡ 9 Projects</span>
          <span>📐 9 Class Diagrams</span>
          <span>🎨 Live UIs</span>
          <span>☕ Java + React</span>
        </div>
      </header>
      <div className="lld-grid">
        {llds.map(({ path, title }) => (
          <Link key={path} to={`/${path}`} className="lld-card">
            <span className="lld-icon">{ICONS[title] || '📐'}</span>
            <h2>{title}</h2>
            <p>{DESCRIPTIONS[title] || ''}</p>
            <span className="lld-link">Explore →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
