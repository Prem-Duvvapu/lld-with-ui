import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ThemeToggle from './components/ThemeToggle'

const lldModules = import.meta.glob('./lld/**/*.jsx', { eager: true })

const LLD_ROUTES = [
  { path: 'parking-lot', title: 'Parking Lot', module: './lld/parking/ParkingLotPage.jsx' },
  { path: 'zomato', title: 'Zomato', module: './lld/zomato/ZomatoPage.jsx' },
  { path: 'uber', title: 'Uber', module: './lld/uber/UberPage.jsx' },
  { path: 'stackoverflow', title: 'Stack Overflow', module: './lld/stackoverflow/StackOverflowPage.jsx' },
  { path: 'tic-tac-toe', title: 'Tic Tac Toe', module: './lld/tictactoe/TicTacToePage.jsx' },
  { path: 'tictactoe', title: 'Tic Tac Toe', module: './lld/tictactoe/TicTacToePage.jsx' },
  { path: 'snake-ladders', title: 'Snake & Ladders', module: './lld/snakeladders/SnakeLaddersPage.jsx' },
  { path: 'atm', title: 'ATM', module: './lld/atm/AtmPage.jsx' },
  { path: 'splitwise', title: 'Splitwise', module: './lld/splitwise/SplitwisePage.jsx' },
  { path: 'elevator', title: 'Elevator', module: './lld/elevator/ElevatorPage.jsx' },
  { path: 'library', title: 'Library', module: './lld/library/LibraryPage.jsx' },
  { path: 'movie-ticket', title: 'Movie Ticket', module: './lld/movieticket/MovieTicketPage.jsx' },
  { path: 'hotel', title: 'Hotel Management', module: './lld/hotel/HotelPage.jsx' },
  { path: 'airline', title: 'Airline Reservation', module: './lld/airline/AirlinePage.jsx' },
  { path: 'coffee-machine', title: 'Coffee Machine', module: './lld/coffeemachine/CoffeeMachinePage.jsx' },
  { path: 'digital-wallet', title: 'Digital Wallet', module: './lld/digitalwallet/DigitalWalletPage.jsx' },
  { path: 'chess', title: 'Chess', module: './lld/chess/ChessPage.jsx' },
  { path: 'ludo', title: 'Ludo', module: './lld/ludo/LudoPage.jsx' },
  { path: 'inventory', title: 'Inventory Management', module: './lld/inventory/InventoryPage.jsx' },
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
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        {LLD_ROUTES.map(({ path, module }) => {
          const Page = lldModules[module]?.default
          return Page ? <Route key={path} path={`/${path}`} element={<Page />} /> : null
        })}
      </Routes>
    </Layout>
  )
}
