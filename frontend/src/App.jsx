import { Suspense, lazy, useMemo } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import ThemeToggle from './components/ThemeToggle'
import Skeleton from './components/ui/Skeleton'

// Lazy on purpose: an eager glob put all 45 module pages in the entry chunk, so
// every visitor downloaded ~1.5 MB to look at one of them. Each page is now its
// own chunk, fetched when its route is first visited.
const lldModules = import.meta.glob('./lld/**/*Page.jsx')

const pageCache = new Map()

// In dev the Vite proxy fronts the API on the same origin; in the Docker image
// nginx does. Either way "same origin" is the right default, and VITE_SWAGGER_URL
// overrides it when the backend is somewhere else.
const SWAGGER_URL = import.meta.env.VITE_SWAGGER_URL || '/swagger-ui.html'

function lazyPage(modulePath) {
  if (!pageCache.has(modulePath)) {
    const loader = lldModules[modulePath]
    pageCache.set(modulePath, loader ? lazy(loader) : null)
  }
  return pageCache.get(modulePath)
}

const LLD_ROUTES = [
  { path: 'parking-lot', title: 'Parking Lot', module: './lld/parking/ParkingLotPage.jsx' },
  { path: 'zomato', title: 'Zomato', module: './lld/zomato/ZomatoPage.jsx' },
  { path: 'uber', title: 'Uber', module: './lld/uber/UberPage.jsx' },
  { path: 'stackoverflow', title: 'Stack Overflow', module: './lld/stackoverflow/StackOverflowPage.jsx' },
  { path: 'tic-tac-toe', title: 'Tic Tac Toe', module: './lld/tictactoe/TicTacToePage.jsx' },
  { path: 'tictactoe', title: 'Tic Tac Toe', module: './lld/tictactoe/TicTacToePage.jsx' },
  { path: 'snake-ladders', title: 'Snake & Ladders', module: './lld/snakeladders/SnakeLaddersPage.jsx' },
  { path: 'snakeladders', title: 'Snake & Ladders', module: './lld/snakeladders/SnakeLaddersPage.jsx' },
  { path: 'atm', title: 'ATM', module: './lld/atm/AtmPage.jsx' },
  { path: 'splitwise', title: 'Splitwise', module: './lld/splitwise/SplitwisePage.jsx' },
  { path: 'elevator', title: 'Elevator', module: './lld/elevator/ElevatorPage.jsx' },
  { path: 'library', title: 'Library', module: './lld/library/LibraryPage.jsx' },
  { path: 'movie-ticket', title: 'Movie Ticket', module: './lld/movieticket/MovieTicketPage.jsx' },
  { path: 'hotel', title: 'Hotel Management', module: './lld/hotel/HotelPage.jsx' },
  { path: 'hotel-management', title: 'Hotel Management', module: './lld/hotel/HotelPage.jsx' },
  { path: 'airline', title: 'Airline Reservation', module: './lld/airline/AirlinePage.jsx' },
  { path: 'airline-reservation', title: 'Airline Reservation', module: './lld/airline/AirlinePage.jsx' },
  { path: 'coffee-machine', title: 'Coffee Machine', module: './lld/coffeemachine/CoffeeMachinePage.jsx' },
  { path: 'digital-wallet', title: 'Digital Wallet', module: './lld/digitalwallet/DigitalWalletPage.jsx' },
  { path: 'chess', title: 'Chess', module: './lld/chess/ChessPage.jsx' },
  { path: 'ludo', title: 'Ludo', module: './lld/ludo/LudoPage.jsx' },
  { path: 'inventory', title: 'Inventory Management', module: './lld/inventory/InventoryPage.jsx' },
  { path: 'inventory-management', title: 'Inventory Management', module: './lld/inventory/InventoryPage.jsx' },
  { path: 'shopping-cart', title: 'Shopping Cart', module: './lld/shoppingcart/ShoppingCartPage.jsx' },
  { path: 'shoppingcart', title: 'Shopping Cart', module: './lld/shoppingcart/ShoppingCartPage.jsx' },
  { path: 'minesweeper', title: 'Minesweeper', module: './lld/minesweeper/MinesweeperPage.jsx' },
  { path: 'vending-machine', title: 'Vending Machine', module: './lld/vendingmachine/VendingMachinePage.jsx' },
  { path: 'logging-framework', title: 'Logging Framework', module: './lld/logging-framework/LoggingFrameworkPage.jsx' },
  { path: 'traffic-signal', title: 'Traffic Signal', module: './lld/traffic-signal/TrafficSignalPage.jsx' },
  { path: 'task-management', title: 'Task Management', module: './lld/task-management/TaskManagementPage.jsx' },
  { path: 'linkedin', title: 'LinkedIn', module: './lld/linkedin/LinkedInPage.jsx' },
  { path: 'lru-cache', title: 'LRU Cache', module: './lld/lru-cache/LruCachePage.jsx' },
  { path: 'pub-sub', title: 'Pub Sub System', module: './lld/pubsub/PubSubPage.jsx' },
  { path: 'pubsub', title: 'Pub Sub System', module: './lld/pubsub/PubSubPage.jsx' },
  { path: 'car-rental', title: 'Car Rental', module: './lld/car-rental/CarRentalPage.jsx' },
  { path: 'auction', title: 'Online Auction', module: './lld/auction/AuctionPage.jsx' },
  { path: 'restaurant', title: 'Restaurant Management', module: './lld/restaurant/RestaurantPage.jsx' },
  { path: 'social-network', title: 'Social Network', module: './lld/social-network/SocialNetworkPage.jsx' },
  { path: 'concert-ticket', title: 'Concert Ticket', module: './lld/concert-ticket/ConcertTicketPage.jsx' },
  { path: 'cricinfo', title: 'CricInfo', module: './lld/cricinfo/CricInfoPage.jsx' },
  { path: 'course-registration', title: 'Course Registration', module: './lld/course-registration/CourseRegistrationPage.jsx' },
  { path: 'stock-brokerage', title: 'Stock Brokerage', module: './lld/stock-brokerage/StockBrokeragePage.jsx' },
  { path: 'music-streaming', title: 'Music Streaming', module: './lld/music-streaming/MusicStreamingPage.jsx' },
  { path: 'foo-bar', title: 'FooBar Alternately', module: './lld/foo-bar/FooBarPage.jsx' },
  { path: 'zero-even-odd', title: 'Zero Even Odd', module: './lld/zero-even-odd/ZeroEvenOddPage.jsx' },
  { path: 'fizz-buzz', title: 'Fizz Buzz Multithreaded', module: './lld/fizz-buzz/FizzBuzzPage.jsx' },
  { path: 'h2o', title: 'Building H2O', module: './lld/h2o/H2OPage.jsx' },
  { path: 'ttl-cache', title: 'Thread-Safe TTL Cache', module: './lld/ttl-cache/TtlCachePage.jsx' },
  { path: 'concurrent-hashmap', title: 'Concurrent HashMap', module: './lld/concurrent-hashmap/ConcurrentHashMapPage.jsx' },
  { path: 'blocking-queue', title: 'Blocking Queue', module: './lld/blocking-queue/BlockingQueuePage.jsx' },
  { path: 'bloom-filter', title: 'Concurrent Bloom Filter', module: './lld/bloom-filter/BloomFilterPage.jsx' },
  { path: 'merge-sort', title: 'Multi-threaded Merge Sort', module: './lld/merge-sort/MergeSortPage.jsx' },
]

function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        position: 'fixed', top: 12, right: 12, zIndex: 1000,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <a
          href={SWAGGER_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: 'var(--bg-card)',
            color: 'var(--accent)',
            border: '1px solid var(--border-primary)',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            cursor: 'pointer',
          }}
          title="Open Swagger OpenAPI Documentation"
        >
          ⚡ Swagger API
        </a>
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}

function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
      textAlign: 'center',
    }}>
      <p style={{
        margin: 0,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
      }}>
        404
      </p>
      <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)' }}>
        No module at this address
      </h1>
      <p style={{ margin: 0, maxWidth: 460, fontSize: 14, color: 'var(--text-secondary)' }}>
        The URL <code>{window.location.pathname}</code> doesn't match any of the LLD modules.
        Pick one from the catalog.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: '8px 18px',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 700,
          background: 'var(--bg-card)',
          color: 'var(--accent)',
          border: '1px solid var(--border-primary)',
          textDecoration: 'none',
        }}
      >
        ← Back to all modules
      </Link>
    </div>
  )
}

function PageLoading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', display: 'grid', gap: 14 }}>
      <Skeleton height={34} width="42%" />
      <Skeleton height={18} width="66%" />
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={30} width={116} />)}
      </div>
      <Skeleton height={260} style={{ marginTop: 12 }} />
    </div>
  )
}

export default function App() {
  const routes = useMemo(
    () => LLD_ROUTES.map(({ path, module }) => ({ path, Page: lazyPage(module) })).filter((r) => r.Page),
    [],
  )

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          {routes.map(({ path, Page }) => (
            <Route key={path} path={`/${path}`} element={<Page />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
