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
