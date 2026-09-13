import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useRevisit } from '../hooks/useRevisit'
import { useTour } from '../hooks/useTour'
import WebsiteTour from '../components/WebsiteTour'
import { ALL_DESIGN_PATTERNS, getModulePatterns } from '../data/modulePatterns'
import { downloadProgress, readProgressFile, importProgress } from '../utils/progressData'
import './Home.css'

const TOUR_STEPS = [
  {
    selector: null,
    title: '👋 Welcome to the LLD portfolio',
    body: "60 interactive Low-Level-Design modules, each with a working Java backend and a live UI. This quick tour points out the tools on this page — skip anytime with Esc or the ✕.",
  },
  {
    selector: '[data-tour="search"]',
    title: 'Search',
    body: 'Search by name, description, or category to jump straight to a module.',
  },
  {
    selector: '[data-tour="difficulty"]',
    title: 'Filter by difficulty',
    body: 'Narrow the list to Easy, Medium, or Hard modules — handy for pacing an interview-prep session.',
  },
  {
    selector: '[data-tour="pattern"]',
    title: 'Filter by design pattern',
    body: "Only want to drill Strategy or Observer today? Pick a GoF pattern and the grid filters to modules that actually use it.",
  },
  {
    selector: '[data-tour="progress"]',
    title: 'Track your progress',
    body: "Mark a module reviewed with the checkmark on its card — your progress is saved in this browser and shown here.",
  },
  {
    selector: '[data-tour="unreviewed"]',
    title: "What's left",
    body: 'Toggle this to hide everything you\'ve already reviewed and focus on what remains.',
  },
  {
    selector: '[data-tour="first-card"]',
    title: 'Try it yourself first',
    body: "Open any module and its Class Diagram, Sequence Diagram, and design breakdown stay hidden until you reveal them — read the requirements, think through the design, then compare.",
  },
  {
    selector: null,
    title: "You're set",
    body: "That's the tour. Replay it anytime from the \"Take a tour\" button up top.",
  },
]

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

const CAT_FILL_COLORS = {
  Core: '#667eea',
  Platforms: '#ec4899',
  'Design Patterns & Systems': '#22c55e',
  Games: '#eab308',
  'Real-world': '#f97316',
  Concurrency: '#3b82f6',
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
  { title: 'Rate Limiter', icon: '🚧', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Per-client throttling with Token Bucket and Sliding Window Counter strategies' },
  { title: 'Meeting Scheduler', icon: '📅', difficulty: 'Medium', category: 'Core',
    desc: 'Room booking with room- and attendee-level conflict detection across overlapping time ranges' },
  { title: 'Thread Pool', icon: '🧵', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Custom-built worker pool with core/max sizing, bounded queue, and pluggable rejection policies' },
  { title: 'Feature Flag', icon: '🚩', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Composite targeting rules (country, user id, attribute, percentage rollout) with a race-free atomic rule swap' },
  { title: 'Notification System', icon: '🔔', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Priority-ordered multi-channel dispatch with idempotent sends, preference-based suppression, and retry with backoff' },
  { title: 'Job Scheduler', icon: '⏰', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Cron-expression parsing, priority-queue dispatch, and misfire policies with a race-free cancel/dispatch guard' },
  { title: 'Locker Management', icon: '🔐', difficulty: 'Medium', category: 'Real-world',
    desc: 'Amazon-style parcel lockers with size-fit allocation strategies and a race-free deposit/pickup lifecycle' },
  { title: 'Payment Gateway', icon: '💳', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Stripe-style charge/refund with a Chain-of-Responsibility fraud pipeline and idempotency-key-safe double-submit protection' },
  { title: 'Web Crawler', icon: '🕷️', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Frontier-queue worker pool with an atomic dedup claim and per-domain politeness locking, plus a Strategy-based URL filter policy' },
  { title: 'Generic Cache Library', icon: '🧰', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'A pluggable Cache<K,V> library — Builder-composed eviction policy, TTL and stats, backed by a segment/shard-locked cache for real concurrent throughput' },
  { title: 'Key-Value Store', icon: '🗃️', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'A toy Redis-shaped store — Command-pattern write-ahead log for durability, versioned entries, and a fully lock-free compare-and-swap race' },
  { title: 'Coupon / Promotion Engine', icon: '🏷️', difficulty: 'Medium', category: 'Real-world',
    desc: 'Percentage/flat/BOGO discount strategies, a Chain-of-Responsibility eligibility check, and a race-free per-coupon redemption limit' },
  { title: 'Blackjack / Deck of Cards', icon: '🃏', difficulty: 'Medium', category: 'Real-world',
    desc: 'A real game loop over a Factory-shuffled shoe — Strategy dealer house rules, a declared round state machine, and a lock-free shared-shoe draw across tables' },
  { title: 'Workflow / Approval Engine', icon: '✅', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Multi-step amount-based approval routing via Chain of Responsibility, a declared instance state machine, an escalation Strategy, and a race-free per-instance approve-vs-timeout-escalate lock' }
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
  'Rate Limiter': 'rate-limiter',
  'Meeting Scheduler': 'meeting-scheduler',
  'Thread Pool': 'thread-pool',
  'Feature Flag': 'featureflag',
  'Notification System': 'notification',
  'Job Scheduler': 'jobscheduler',
  'Locker Management': 'locker',
  'Payment Gateway': 'payment',
  'Web Crawler': 'webcrawler',
  'Generic Cache Library': 'cachelibrary',
  'Key-Value Store': 'kvstore',
  'Coupon / Promotion Engine': 'coupon',
  'Blackjack / Deck of Cards': 'blackjack',
  'Workflow / Approval Engine': 'workflow',
}

function itemPath(item) {
  return item.key || routeMap[item.title]
}

function formatReviewedDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [pattern, setPattern] = useState('All')
  const [unreviewedOnly, setUnreviewedOnly] = useState(false)
  const [revisitOnly, setRevisitOnly] = useState(false)
  const { toggle: toggleReviewed, isReviewed, reviewedAt, count: reviewedCount } = useProgress()
  const { toggleRevisit, isRevisit } = useRevisit()
  const { hasSeenTour, markSeen } = useTour()
  const [tourOpen, setTourOpen] = useState(false)
  const [importStatus, setImportStatus] = useState(null)

  const searchInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cardRefs = useRef([])

  useEffect(() => {
    if (!hasSeenTour) {
      const t = setTimeout(() => setTourOpen(true), 500)
      return () => clearTimeout(t)
    }
  }, [hasSeenTour])

  const closeTour = () => {
    setTourOpen(false)
    markSeen()
  }

  const filtered = useMemo(() => {
    return ALL_LLDS.filter(item => {
      const matchSearch = !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      const matchDiff = difficulty === 'All' || item.difficulty === difficulty
      const path = itemPath(item)
      const matchPattern = pattern === 'All' || getModulePatterns(path).includes(pattern)
      const matchReviewed = !unreviewedOnly || !isReviewed(path)
      const matchRevisit = !revisitOnly || isRevisit(path)
      return matchSearch && matchDiff && matchPattern && matchReviewed && matchRevisit
    })
  }, [query, difficulty, pattern, unreviewedOnly, revisitOnly, isReviewed, isRevisit])

  useEffect(() => {
    cardRefs.current.length = filtered.length
  }, [filtered])

  const progressPct = ALL_LLDS.length > 0 ? Math.round((reviewedCount / ALL_LLDS.length) * 100) : 0

  const categoryStats = useMemo(() => {
    const stats = {}
    ALL_LLDS.forEach(item => {
      const path = itemPath(item)
      if (!stats[item.category]) stats[item.category] = { total: 0, reviewed: 0 }
      stats[item.category].total += 1
      if (isReviewed(path)) stats[item.category].reviewed += 1
    })
    return stats
  }, [isReviewed])

  const handleSurpriseMe = () => {
    const allPaths = ALL_LLDS.map(itemPath)
    const unreviewed = allPaths.filter(p => !isReviewed(p))
    const pool = unreviewed.length > 0 ? unreviewed : allPaths
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/${pick}`)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const payload = await readProgressFile(file)
      importProgress(payload)
      setImportStatus({ type: 'success', message: 'Progress imported — reloading…' })
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message || 'Could not import that file.' })
      setTimeout(() => setImportStatus(null), 4000)
    }
  }

  // Keyboard shortcuts: "/" focuses search, Esc clears it, arrow keys move
  // focus between cards (native <a> focus, so Enter opens the focused card
  // for free). Skipped entirely while typing in any field.
  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement
      const isTyping = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)

      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (isTyping) active.blur()
        setQuery('')
        return
      }
      if (isTyping) return

      const cards = cardRefs.current
      if (cards.length === 0) return
      const currentIndex = cards.indexOf(active)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        cards[Math.min(currentIndex + 1, cards.length - 1)]?.focus()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        cards[Math.max(currentIndex - 1, 0)]?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-title-row">
          <div>
            <h1>Low Level Design Patterns</h1>
            <p className="home-subtitle">60 interactive modules — each with a live UI, class diagram, and working Java backend</p>
          </div>
          <div className="home-actions">
            <button type="button" className="home-action-btn" onClick={handleSurpriseMe}>
              🎲 Surprise me
            </button>
            <button type="button" className="home-action-btn" onClick={downloadProgress}>
              ⬇️ Export progress
            </button>
            <button type="button" className="home-action-btn" onClick={handleImportClick}>
              ⬆️ Import progress
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              hidden
            />
            <button type="button" className="home-action-btn" onClick={() => setTourOpen(true)}>
              🧭 Take a tour
            </button>
          </div>
        </div>

        {importStatus && (
          <p className={`import-status import-status-${importStatus.type}`}>{importStatus.message}</p>
        )}

        <div className="progress-summary" data-tour="progress">
          <div className="progress-summary-label">
            <span>📈 Your progress</span>
            <span>{reviewedCount} / {ALL_LLDS.length} reviewed</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="category-breakdown">
            {Object.keys(CAT_COLORS).filter(cat => categoryStats[cat]).map(cat => {
              const stat = categoryStats[cat]
              const pct = stat.total > 0 ? Math.round((stat.reviewed / stat.total) * 100) : 0
              return (
                <div key={cat} className="category-stat">
                  <div className="category-stat-label">
                    <span>{cat}</span>
                    <span>{stat.reviewed}/{stat.total}</span>
                  </div>
                  <div className="category-stat-track">
                    <div className="category-stat-fill" style={{ width: `${pct}%`, background: CAT_FILL_COLORS[cat] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="home-controls">
          <div className="search-wrap">
            <div className="search-bar" data-tour="search">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, description, or category..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
            </div>
            <span className="kbd-hint"><kbd>/</kbd> to search · <kbd>Esc</kbd> to clear · <kbd>←↑↓→</kbd> to browse</span>
          </div>

          <div className="diff-filters" data-tour="difficulty">
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

          <select
            className="pattern-select"
            data-tour="pattern"
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            aria-label="Filter by design pattern"
          >
            <option value="All">All patterns</option>
            {ALL_DESIGN_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <label className="unreviewed-toggle" data-tour="unreviewed">
            <input
              type="checkbox"
              checked={unreviewedOnly}
              onChange={e => setUnreviewedOnly(e.target.checked)}
            />
            Show only what's left to review
          </label>

          <label className="unreviewed-toggle">
            <input
              type="checkbox"
              checked={revisitOnly}
              onChange={e => setRevisitOnly(e.target.checked)}
            />
            🔖 Flagged for revisit only
          </label>
        </div>

        <p className="home-result-count">{filtered.length} module{filtered.length !== 1 ? 's' : ''} found</p>
      </header>

      <div className="lld-grid">
        {filtered.map((item, i) => {
          const dc = DIFF_COLORS[item.difficulty]
          const catBg = CAT_COLORS[item.category]
          const path = item.key || routeMap[item.title]
          const reviewed = isReviewed(path)
          const revisit = isRevisit(path)
          const reviewedDate = formatReviewedDate(reviewedAt(path))
          return (
            <Link
              key={path}
              to={`/${path}`}
              className={`lld-card${reviewed ? ' reviewed' : ''}${revisit ? ' flagged-revisit' : ''}`}
              ref={el => { cardRefs.current[i] = el }}
              {...(i === 0 ? { 'data-tour': 'first-card' } : {})}
            >
              <button
                type="button"
                className="review-toggle"
                aria-label={reviewed ? `Mark ${item.title} as not reviewed` : `Mark ${item.title} as reviewed`}
                aria-pressed={reviewed}
                title={reviewed ? `Reviewed ${reviewedDate} — click to unmark` : 'Mark as reviewed'}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleReviewed(path) }}
              >
                {reviewed ? '✓' : ''}
              </button>
              <button
                type="button"
                className="revisit-toggle"
                aria-label={revisit ? `Unflag ${item.title} for revisit` : `Flag ${item.title} for revisit`}
                aria-pressed={revisit}
                title={revisit ? 'Flagged for revisit — click to unflag' : 'Flag for revisit'}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleRevisit(path) }}
              >
                🔖
              </button>
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

      {tourOpen && <WebsiteTour steps={TOUR_STEPS} onFinish={closeTour} />}
    </div>
  )
}
