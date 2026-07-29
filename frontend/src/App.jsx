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
  { path: 'minesweeper', title: 'Minesweeper', module: './lld/minesweeper/MinesweeperPage.jsx' },
  { path: 'vending-machine', title: 'Vending Machine', module: './lld/vendingmachine/VendingMachinePage.jsx' },
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
        <Route path="/" element={<Home llds={LLD_ROUTES} />} />
        {LLD_ROUTES.map(({ path, module }) => {
          const Page = lldModules[module]?.default
          return Page ? <Route key={path} path={`/${path}`} element={<Page />} /> : null
        })}
      </Routes>
    </Layout>
  )
}
