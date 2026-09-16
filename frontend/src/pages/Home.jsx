import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useRevisit } from '../hooks/useRevisit'
import { useSiteTour } from '../context/SiteTourContext'
import { ALL_DESIGN_PATTERNS, getModulePatterns } from '../data/modulePatterns'
import { downloadProgress, readProgressFile, importProgress } from '../utils/progressData'
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

const CAT_FILL_COLORS = {
  Core: '#667eea',
  Platforms: '#ec4899',
  'Design Patterns & Systems': '#22c55e',
  Games: '#eab308',
  'Real-world': '#f97316',
  Concurrency: '#3b82f6',
}

const ALL_LLDS = [
  { title: 'Parking Lot', order: 15, icon: '🅿️', difficulty: 'Easy', category: 'Core',
    desc: 'Multi-level parking with gates, spot tracking, and ticket-based pricing' },
  { title: 'Splitwise', order: 35, icon: '💰', difficulty: 'Medium', category: 'Core',
    desc: 'Expense sharing with EQUAL/PERCENTAGE/EXACT split strategies' },
  { title: 'Elevator', order: 16, icon: '🛗', difficulty: 'Medium', category: 'Core',
    desc: 'Elevator control system with SCAN scheduling and animated movement' },
  { title: 'ATM', order: 14, icon: '🏧', difficulty: 'Medium', category: 'Core',
    desc: 'Banking ATM with card authentication, withdraw, deposit, and transaction history' },
  { title: 'Library', order: 10, icon: '📖', difficulty: 'Medium', category: 'Core',
    desc: 'Book inventory, member management, borrow/return with fine calculation' },
  { title: 'Movie Ticket', order: 27, icon: '🎬', difficulty: 'Medium', category: 'Core',
    desc: 'Movie listings, show timings, seat selection, and ticket booking' },
  { title: 'Hotel Management', order: 29, icon: '🏨', difficulty: 'Medium', category: 'Core',
    desc: 'Hotel search, room booking, check-in/check-out with status tracking' },
  { title: 'Airline Reservation', order: 30, icon: '✈️', difficulty: 'Hard', category: 'Core',
    desc: 'Flight search, seat map, booking with multi-class fare system' },
  { title: 'Cab Booking', order: 37, icon: '🚗', difficulty: 'Medium', category: 'Core',
    desc: 'Ride-hailing with fare estimation, driver assignment, and ride tracking', key: 'uber' },
  { title: 'Food Delivery', order: 36, icon: '🍕', difficulty: 'Medium', category: 'Core',
    desc: 'Food delivery with restaurant browsing, cart, and order state machine', key: 'zomato' },
  { title: 'Restaurant Management', order: 34, icon: '🍽️', difficulty: 'Easy', category: 'Core',
    desc: 'Table booking, order management, kitchen display, menu catalog, billing' },
  { title: 'Car Rental', order: 31, icon: '🚙', difficulty: 'Medium', category: 'Core',
    desc: 'Vehicle fleet management with branch-based reservations, pricing tiers' },
  { title: 'Online Auction', order: 38, icon: '🏷️', difficulty: 'Hard', category: 'Core',
    desc: 'Real-time bidding with auction lifecycle, bid validation, auto-outbidding' },
  { title: 'Concert Ticket', order: 28, icon: '🎫', difficulty: 'Easy', category: 'Core',
    desc: 'Event-based seat booking with venue layout, dynamic pricing, waitlist' },
  { title: 'Stack Overflow', order: 39, icon: '📚', difficulty: 'Hard', category: 'Platforms',
    desc: 'Q&A platform with voting, reputation system, and tag-based search' },
  { title: 'LinkedIn', order: 42, icon: '💼', difficulty: 'Hard', category: 'Platforms',
    desc: 'Professional network with profiles, connections, feed posts, notifications' },
  { title: 'Social Network', order: 43, icon: '🌐', difficulty: 'Hard', category: 'Platforms',
    desc: 'User profiles, friend requests, news feed, posts/comments/likes' },
  { title: 'CricInfo', order: 41, icon: '🏏', difficulty: 'Hard', category: 'Platforms',
    desc: 'Cricket scoring with real-time scorecards, ball-by-ball commentary' },
  { title: 'Music Streaming', order: 46, icon: '🎵', difficulty: 'Hard', category: 'Platforms',
    desc: 'Song catalog, playlists, recommendations, offline, tiered subscriptions' },
  { title: 'Course Registration', order: 33, icon: '📚', difficulty: 'Easy', category: 'Platforms',
    desc: 'Student enrollment with schedule conflict detection, waitlist, prerequisites' },
  { title: 'Stock Brokerage', order: 47, icon: '📈', difficulty: 'Hard', category: 'Platforms',
    desc: 'Trading platform with buy/sell orders, portfolio tracking, order matching' },
  { title: 'Logging Framework', order: 8, icon: '📝', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Pluggable logging levels, appenders, formatted output, singleton logger' },
  { title: 'Traffic Signal', order: 7, icon: '🚦', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'State machine for traffic lights with timer-based transitions, emergency override' },
  { title: 'Circuit Breaker', order: 9, icon: '🔌', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Closed/Open/Half-Open state machine guarding calls, pluggable trip policies, cooldown recovery' },
  { title: 'Task Management', order: 11, icon: '✅', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Kanban-style board with status workflow, priority levels, user assignment' },
  { title: 'Pub Sub System', order: 40, icon: '📡', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Publish-subscribe messaging with topics, subscriber groups, async delivery' },
  { title: 'LRU Cache', order: 2, icon: '⚡', difficulty: 'Easy', category: 'Design Patterns & Systems',
    desc: 'Fixed-size cache with LRU eviction using doubly linked list + hashmap' },
  { title: 'Snake & Ladders', order: 3, icon: '🐍', difficulty: 'Medium', category: 'Games',
    desc: 'Multiplayer board game with dice roll and snake/ladder mappings' },
  { title: 'Tic Tac Toe', order: 1, icon: '❌', difficulty: 'Easy', category: 'Games',
    desc: '2-player game on a 3x3 grid with win/draw detection' },
  { title: 'Chess', order: 44, icon: '♟️', difficulty: 'Hard', category: 'Games',
    desc: 'Full chess engine with piece validation, check/checkmate detection' },
  { title: 'Ludo', order: 45, icon: '🎲', difficulty: 'Hard', category: 'Games',
    desc: 'Multiplayer board game with dice roll, token movement, captures and safe spots' },
  { title: 'Minesweeper', order: 4, icon: '💣', difficulty: 'Medium', category: 'Games',
    desc: 'Minefield grid with reveal, flagging, flood-fill and win/loss detection' },
  { title: 'Vending Machine', order: 5, icon: '🏪', difficulty: 'Easy', category: 'Real-world',
    desc: 'Product slots, coin insertion, dispensing with cancel support' },
  { title: 'Coffee Machine', order: 6, icon: '☕', difficulty: 'Easy', category: 'Real-world',
    desc: 'Beverage menu, ingredient management, brewing with state machine' },
  { title: 'Digital Wallet', order: 17, icon: '💳', difficulty: 'Medium', category: 'Real-world',
    desc: 'Wallet balance, send/receive money, transaction history with UPI/CARD' },
  { title: 'Inventory Management', order: 13, icon: '📦', difficulty: 'Medium', category: 'Real-world',
    desc: 'Stock tracking, inbound/outbound movements, low stock alerts' },
  { title: 'Shopping Cart', order: 12, icon: '🛒', difficulty: 'Easy', category: 'Real-world',
    desc: 'Product catalog, cart management, checkout flow with order tracking' },
  { title: 'FooBar Alternately', order: 18, icon: '🔄', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Two threads print "foo" and "bar" alternately using semaphores' },
  { title: 'Zero Even Odd', order: 19, icon: '0️⃣', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Three threads print 0, even, odd numbers in sequence using semaphore coordination' },
  { title: 'Fizz Buzz Multithreaded', order: 20, icon: '🧮', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Four threads collaboratively print Fizz/Buzz/FizzBuzz/numbers' },
  { title: 'Building H2O', order: 21, icon: '💧', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Hydrogen and oxygen threads bond to form H2O molecules using barriers' },
  { title: 'Thread-Safe TTL Cache', order: 24, icon: '⏱️', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Concurrent cache with time-to-live expiration, scheduled eviction' },
  { title: 'Concurrent HashMap', order: 23, icon: '🗺️', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Thread-safe hashmap using segment-based locking for fine-grained concurrency' },
  { title: 'Blocking Queue', order: 22, icon: '📤', difficulty: 'Easy', category: 'Concurrency',
    desc: 'Bounded blocking queue with wait/notify for producer-consumer patterns' },
  { title: 'Concurrent Bloom Filter', order: 25, icon: '🌸', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Probabilistic set membership with thread-safe bit operations' },
  { title: 'Multi-threaded Merge Sort', order: 26, icon: '🔀', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Parallel divide-and-conquer sort using ForkJoinPool for efficient multi-core sorting' },
  { title: 'Rate Limiter', order: 48, icon: '🚧', difficulty: 'Medium', category: 'Concurrency',
    desc: 'Per-client throttling with Token Bucket and Sliding Window Counter strategies' },
  { title: 'Meeting Scheduler', order: 32, icon: '📅', difficulty: 'Medium', category: 'Core',
    desc: 'Room booking with room- and attendee-level conflict detection across overlapping time ranges' },
  { title: 'Thread Pool', order: 49, icon: '🧵', difficulty: 'Hard', category: 'Concurrency',
    desc: 'Custom-built worker pool with core/max sizing, bounded queue, and pluggable rejection policies' },
  { title: 'Feature Flag', order: 50, icon: '🚩', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Composite targeting rules (country, user id, attribute, percentage rollout) with a race-free atomic rule swap' },
  { title: 'Notification System', order: 51, icon: '🔔', difficulty: 'Medium', category: 'Design Patterns & Systems',
    desc: 'Priority-ordered multi-channel dispatch with idempotent sends, preference-based suppression, and retry with backoff' },
  { title: 'Job Scheduler', order: 55, icon: '⏰', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Cron-expression parsing, priority-queue dispatch, and misfire policies with a race-free cancel/dispatch guard' },
  { title: 'Locker Management', order: 52, icon: '🔐', difficulty: 'Medium', category: 'Real-world',
    desc: 'Amazon-style parcel lockers with size-fit allocation strategies and a race-free deposit/pickup lifecycle' },
  { title: 'Payment Gateway', order: 59, icon: '💳', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Stripe-style charge/refund with a Chain-of-Responsibility fraud pipeline and idempotency-key-safe double-submit protection' },
  { title: 'Web Crawler', order: 56, icon: '🕷️', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'Frontier-queue worker pool with an atomic dedup claim and per-domain politeness locking, plus a Strategy-based URL filter policy' },
  { title: 'Generic Cache Library', order: 57, icon: '🧰', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'A pluggable Cache<K,V> library — Builder-composed eviction policy, TTL and stats, backed by a segment/shard-locked cache for real concurrent throughput' },
  { title: 'Key-Value Store', order: 58, icon: '🗃️', difficulty: 'Hard', category: 'Design Patterns & Systems',
    desc: 'A toy Redis-shaped store — Command-pattern write-ahead log for durability, versioned entries, and a fully lock-free compare-and-swap race' },
  { title: 'Coupon / Promotion Engine', order: 53, icon: '🏷️', difficulty: 'Medium', category: 'Real-world',
    desc: 'Percentage/flat/BOGO discount strategies, a Chain-of-Responsibility eligibility check, and a race-free per-coupon redemption limit' },
  { title: 'Blackjack / Deck of Cards', order: 54, icon: '🃏', difficulty: 'Medium', category: 'Real-world',
    desc: 'A real game loop over a Factory-shuffled shoe — Strategy dealer house rules, a declared round state machine, and a lock-free shared-shoe draw across tables' },
  { title: 'Workflow / Approval Engine', order: 60, icon: '✅', difficulty: 'Hard', category: 'Design Patterns & Systems',
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
  const [sortByOrder, setSortByOrder] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { toggle: toggleReviewed, isReviewed, reviewedAt, count: reviewedCount } = useProgress()
  const { toggleRevisit, isRevisit } = useRevisit()
  const { startTour } = useSiteTour()
  const [importStatus, setImportStatus] = useState(null)

  const searchInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cardRefs = useRef([])
  const menuRef = useRef(null)

  const filtered = useMemo(() => {
    const result = ALL_LLDS.filter(item => {
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
    return sortByOrder ? [...result].sort((a, b) => a.order - b.order) : result
  }, [query, difficulty, pattern, unreviewedOnly, revisitOnly, sortByOrder, isReviewed, isRevisit])

  useEffect(() => {
    cardRefs.current.length = filtered.length
  }, [filtered])

  const progressPct = ALL_LLDS.length > 0 ? Math.round((reviewedCount / ALL_LLDS.length) * 100) : 0

  const activeFilterCount = [pattern !== 'All', unreviewedOnly, revisitOnly, sortByOrder]
    .filter(Boolean).length

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

  // Close the actions menu on an outside click, same as any dropdown.
  useEffect(() => {
    if (!menuOpen) return undefined
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-title-row">
          <div>
            <h1>Low Level Design Patterns</h1>
            <p className="home-subtitle">60 interactive modules — each with a live UI, class diagram, and working Java backend</p>
          </div>
          <div className="home-menu" ref={menuRef}>
            <button
              type="button"
              className="menu-toggle"
              aria-label="More actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              ☰
            </button>
            {menuOpen && (
              <div className="home-menu-panel" role="menu">
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); handleSurpriseMe() }}>
                  🎲 Surprise me
                </button>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); downloadProgress() }}>
                  ⬇️ Export progress
                </button>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); handleImportClick() }}>
                  ⬆️ Import progress
                </button>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); startTour() }}>
                  🧭 Take a tour
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              hidden
            />
          </div>
        </div>

        {importStatus && (
          <p className={`import-status import-status-${importStatus.type}`}>{importStatus.message}</p>
        )}

        <div className="progress-summary" data-tour="progress">
          <button
            type="button"
            className="progress-summary-label progress-toggle"
            aria-expanded={progressOpen}
            onClick={() => setProgressOpen(o => !o)}
          >
            <span>📈 Your progress</span>
            <span>{reviewedCount} / {ALL_LLDS.length} reviewed {progressOpen ? '▲' : '▾'}</span>
          </button>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          {progressOpen && (
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
          )}
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

          <button
            type="button"
            className={`filters-toggle${activeFilterCount > 0 ? ' has-active' : ''}`}
            data-tour="filters-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(o => !o)}
          >
            ⚙️ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {filtersOpen && (
          <div className="filters-panel">
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

            <label className="unreviewed-toggle">
              <input
                type="checkbox"
                checked={sortByOrder}
                onChange={e => setSortByOrder(e.target.checked)}
              />
              📚 Suggested learning order
            </label>
          </div>
        )}

        {sortByOrder && (
          <p className="learn-order-hint">
            Sorted beginner → advanced: simple state machines first, then one design
            pattern at a time, basic ReentrantLock usage, the raw concurrency primitives,
            booking/reservation systems, multi-actor marketplaces, graph/event platforms,
            game-tree logic, and finally the pattern-dense modules that combine a real
            concurrency race with a GoF pattern.
          </p>
        )}

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
                {sortByOrder && (
                  <span className="lld-tag lld-order-tag">Step {item.order}</span>
                )}
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
