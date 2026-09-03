import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']

const DIFF_COLORS = {
  Easy: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  Medium: { bg: 'rgba(234,179,8,0.12)', text: '#eab308', border: 'rgba(234,179,8,0.3)' },
  Hard: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
}

const CAT_COLORS = {
  Core: 'rgba(102,126,234,0.15)',
  Platforms: 'rgba(236,72,153,0.15)',
  'Design Patterns & Systems': 'rgba(34,197,94,0.15)',
  Games: 'rgba(234,179,8,0.15)',
  'Real-world': 'rgba(249,115,22,0.15)',
  Concurrency: 'rgba(59,130,246,0.15)',
}

const ALL_LLDS = [
  { title: 'Parking Lot', icon: '🅿️', difficulty: 'Easy', category: 'Core',
    desc: 'Multi-level parking with gates, spot tracking, and ticket-based pricing' },
  { title: 'Splitwise', icon: '💰', difficulty: 'Medium', category: 'Core',
    desc: 'Expense sharing with EQUAL/PERCENTAGE/EXACT split strategies' },
  { title: 'Elevator', icon: '🛗', difficulty: 'Medium', category: 'Core',
    desc: 'Elevator control system with SCAN scheduling and animated movement' },
  { title: 'ATM', icon: '🏧', difficulty: 'Medium', category: 'Core',
    desc: 'Banking ATM with card authentication, withdraw, deposit, and transaction history' },
  { title: 'Library', icon: '📖', difficulty: 'Medium', category: 'Core',
    desc: 'Book inventory, member management, borrow/return with fine calculation' },
  { title: 'Movie Ticket', icon: '🎬', difficulty: 'Medium', category: 'Core',
    desc: 'Movie listings, show timings, seat selection, and ticket booking' },
  { title: 'Hotel Management', icon: '🏨', difficulty: 'Medium', category: 'Core',
    desc: 'Hotel search, room booking, check-in/check-out with status tracking' },
  { title: 'Airline Reservation', icon: '✈️', difficulty: 'Hard', category: 'Core',
    desc: 'Flight search, seat map, booking with multi-class fare system' },
  { title: 'Cab Booking', icon: '🚗', difficulty: 'Medium', category: 'Core',
    desc: 'Ride-hailing with fare estimation, driver assignment, and ride tracking', key: 'uber' },
  { title: 'Food Delivery', icon: '🍕', difficulty: 'Medium', category: 'Core',
    desc: 'Food delivery with restaurant browsing, cart, and order state machine', key: 'zomato' },
  { title: 'Restaurant Management', icon: '🍽️', difficulty: 'Easy', category: 'Core',
    desc: 'Table booking, order management, kitchen display, menu catalog, billing' },
  { title: 'Car Rental', icon: '🚙', difficulty: 'Medium', category: 'Core',
    desc: 'Vehicle fleet management with branch-based reservations, pricing tiers' },
  { title: 'Online Auction', icon: '🏷️', difficulty: 'Hard', category: 'Core',
    desc: 'Real-time bidding with auction lifecycle, bid validation, auto-outbidding' },
  { title: 'Concert Ticket', icon: '🎫', difficulty: 'Easy', category: 'Core',
    desc: 'Event-based seat booking with venue layout, dynamic pricing, waitlist' },
  { title: 'Stack Overflow', icon: '📚', difficulty: 'Hard', category: 'Platforms',
    desc: 'Q&A platform with voting, reputation system, and tag-based search' },
  { title: 'LinkedIn', icon: '💼', difficulty: 'Hard', category: 'Platforms',
    desc: 'Professional network with profiles, connections, feed posts, notifications' },
  { title: 'Social Network', icon: '🌐', difficulty: 'Hard', category: 'Platforms',
    desc: 'User profiles, friend requests, news feed, posts/comments/likes' },
  { title: 'CricInfo', icon: '🏏', difficulty: 'Hard', category: 'Platforms',
    desc: 'Cricket scoring with real-time scorecards, ball-by-ball commentary' },
  { title: 'Music Streaming', icon: '🎵', difficulty: 'Hard', category: 'Platforms',
    desc: 'Song catalog, playlists, recommendations, offline, tiered subscriptions' },
  { title: 'Course Registration', icon: '📚', difficulty: 'Easy', category: 'Platforms',
    desc: 'Student enrollment with schedule conflict detection, waitlist, prerequisites' },
  { title: 'Stock Brokerage', icon: '📈', difficulty: 'Hard', category: 'Platforms',
    desc: 'Trading platform with buy/sell orders, portfolio tracking, order matching' },
  { title: 'Logging Framework', icon: '📝', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Pluggable logging levels, appenders, formatted output, singleton logger' },
  { title: 'Traffic Signal', icon: '🚦', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'State machine for traffic lights with timer-based transitions, emergency override' },
  { title: 'Circuit Breaker', icon: '🔌', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Closed/Open/Half-Open state machine guarding calls, pluggable trip policies, cooldown recovery' },
  { title: 'Task Management', icon: '✅', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Kanban-style board with status workflow, priority levels, user assignment' },
  { title: 'Pub Sub System', icon: '📡', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Publish-subscribe messaging with topics, subscriber groups, async delivery' },
  { title: 'LRU Cache', icon: '⚡', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Fixed-size cache with LRU eviction using doubly linked list + hashmap' },
  { title: 'Snake & Ladders', icon: '🐍', difficulty: 'Medium', category: 'Games',
    desc: 'Multiplayer board game with dice roll and snake/ladder mappings' },
  { title: 'Tic Tac Toe', icon: '❌', difficulty: 'Easy', category: 'Games',
    desc: '2-player game on a 3x3 grid with win/draw detection' },
  { title: 'Chess', icon: '♟️', difficulty: 'Hard', category: 'Games',
    desc: 'Full chess engine with piece validation, check/checkmate detection' },
  { title: 'Ludo', icon: '🎲', difficulty: 'Hard', category: 'Games',
    desc: 'Multiplayer board game with dice roll, token movement, captures and safe spots' },
  { title: 'Minesweeper', icon: '💣', difficulty: 'Medium', category: 'Games',
    desc: 'Minefield grid with reveal, flagging, flood-fill and win/loss detection' },
  { title: 'Vending Machine', icon: '🏪', difficulty: 'Easy', category: 'Real-world',
    desc: 'Product slots, coin insertion, dispensing with cancel support' },
  { title: 'Coffee Machine', icon: '☕', difficulty: 'Easy', category: 'Real-world',
    desc: 'Beverage menu, ingredient management, brewing with state machine' },
  { title: 'Digital Wallet', icon: '💳', difficulty: 'Medium', category: 'Real-world',
    desc: 'Wallet balance, send/receive money, transaction history with UPI/CARD' },
  { title: 'Inventory Management', icon: '📦', difficulty: 'Medium', category: 'Real-world',
    desc: 'Stock tracking, inbound/outbound movements, low stock alerts' },
  { title: 'Shopping Cart', icon: '🛒', difficulty: 'Easy', category: 'Real-world',
    desc: 'Product catalog, cart management, checkout flow with order tracking' },
  { title: 'FooBar Alternately', icon: '🔄', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Two threads print "foo" and "bar" alternately using semaphores' },
  { title: 'Zero Even Odd', icon: '0️⃣', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Three threads print 0, even, odd numbers in sequence using semaphore coordination' },
  { title: 'Fizz Buzz Multithreaded', icon: '🧮', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Four threads collaboratively print Fizz/Buzz/FizzBuzz/numbers' },
  { title: 'Building H2O', icon: '💧', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Hydrogen and oxygen threads bond to form H2O molecules using barriers' },
  { title: 'Thread-Safe TTL Cache', icon: '⏱️', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Concurrent cache with time-to-live expiration, scheduled eviction' },
  { title: 'Concurrent HashMap', icon: '🗺️', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Thread-safe hashmap using segment-based locking for fine-grained concurrency' },
  { title: 'Blocking Queue', icon: '📤', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Bounded blocking queue with wait/notify for producer-consumer patterns' },
  { title: 'Concurrent Bloom Filter', icon: '🌸', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Probabilistic set membership with thread-safe bit operations' },
  { title: 'Multi-threaded Merge Sort', icon: '🔀', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Parallel divide-and-conquer sort using ForkJoinPool for efficient multi-core sorting' },
]

const routeMap = {
  'Parking Lot': 'parking-lot', 'Splitwise': 'splitwise', 'Elevator': 'elevator',
  'ATM': 'atm', 'Library': 'library', 'Movie Ticket': 'movie-ticket',
  'Hotel Management': 'hotel-management', 'Airline Reservation': 'airline-reservation',
  'Cab Booking': 'uber', 'Food Delivery': 'zomato', 'Restaurant Management': 'restaurant',
  'Car Rental': 'car-rental', 'Online Auction': 'auction', 'Concert Ticket': 'concert-ticket',
  'Stack Overflow': 'stackoverflow', 'LinkedIn': 'linkedin', 'Social Network': 'social-network',
  'CricInfo': 'cricinfo', 'Music Streaming': 'music-streaming',
  'Course Registration': 'course-registration', 'Stock Brokerage': 'stock-brokerage',
  'Logging Framework': 'logging-framework', 'Traffic Signal': 'traffic-signal',
  'Circuit Breaker': 'circuit-breaker',
  'Task Management': 'task-management', 'Pub Sub System': 'pub-sub', 'LRU Cache': 'lru-cache',
  'Snake & Ladders': 'snakeladders', 'Tic Tac Toe': 'tictactoe', 'Chess': 'chess',
  'Ludo': 'ludo', 'Minesweeper': 'minesweeper',
  'Vending Machine': 'vending-machine', 'Coffee Machine': 'coffee-machine',
  'Digital Wallet': 'digital-wallet', 'Inventory Management': 'inventory-management',
  'Shopping Cart': 'shopping-cart',
  'FooBar Alternately': 'foo-bar', 'Zero Even Odd': 'zero-even-odd',
  'Fizz Buzz Multithreaded': 'fizz-buzz', 'Building H2O': 'h2o',
  'Thread-Safe TTL Cache': 'ttl-cache', 'Concurrent HashMap': 'concurrent-hashmap',
  'Blocking Queue': 'blocking-queue', 'Concurrent Bloom Filter': 'bloom-filter',
  'Multi-threaded Merge Sort': 'merge-sort',
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')

  const filtered = useMemo(() => {
    return ALL_LLDS.filter(item => {
      const matchSearch = !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      const matchDiff = difficulty === 'All' || item.difficulty === difficulty
      return matchSearch && matchDiff
    })
  }, [query, difficulty])

  return (
    <div className="home">
      <header className="home-header">
        <h1>Low Level Design Patterns</h1>
        <p className="home-subtitle">45 interactive modules — each with a live UI, class diagram, and working Java backend</p>

        <div className="home-controls">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, description, or category..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
          </div>

          <div className="diff-filters">
            {DIFFICULTIES.map(d => {
              const c = DIFF_COLORS[d]
              const active = difficulty === d
              return (
                <button
                  key={d}
                  className="diff-pill"
                  style={active && c ? {
                    background: c.bg,
                    color: c.text,
                    borderColor: c.border,
                  } : {}}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'All' ? 'All Levels' : d}
                </button>
              )
            })}
          </div>
        </div>

        <p className="home-result-count">{filtered.length} module{filtered.length !== 1 ? 's' : ''} found</p>
      </header>

      <div className="lld-grid">
        {filtered.map(item => {
          const dc = DIFF_COLORS[item.difficulty]
          const catBg = CAT_COLORS[item.category]
          const path = item.key || routeMap[item.title]
          return (
            <Link key={path} to={`/${path}`} className="lld-card">
              <span className="lld-icon">{item.icon}</span>
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
              <div className="lld-tags">
                <span className="lld-tag lld-cat-tag" style={{ background: catBg }}>
                  {item.category}
                </span>
                <span className="lld-tag lld-diff-tag" style={{
                  background: dc.bg, color: dc.text, borderColor: dc.border,
                }}>
                  {item.difficulty}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
