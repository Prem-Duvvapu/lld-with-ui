// sequenceDiagrams — lazy barrel index.
// Content lives in ./sequences/<module>.js, one file per module.
//
// Each value is a LOADER, not the data: these files total ~1.7 MB across the three
// barrels, and static imports pulled all 60 modules into one shared chunk that every
// module page downloaded (1,142 kB / 317 kB gzip) to show exactly one of them.
// Dynamic import gives each module its own chunk, fetched only when opened.
// Read them through hooks/useModuleData.js; resolveModuleKey still works unchanged
// because the keys here are identical to the ones the static barrel used.
//
// Add a module by creating its file and registering it here.

const sequenceDiagrams = {
  airline: () => import('./sequences/airline.js'),
  atm: () => import('./sequences/atm.js'),
  auction: () => import('./sequences/auction.js'),
  blockingQueue: () => import('./sequences/blocking-queue.js'),
  bloomFilter: () => import('./sequences/bloom-filter.js'),
  carRental: () => import('./sequences/car-rental.js'),
  meetingScheduler: () => import('./sequences/meeting-scheduler.js'),
  chess: () => import('./sequences/chess.js'),
  circuitBreaker: () => import('./sequences/circuit-breaker.js'),
  coffee: () => import('./sequences/coffee.js'),
  concertTicket: () => import('./sequences/concert-ticket.js'),
  concurrentHashmap: () => import('./sequences/concurrent-hashmap.js'),
  courseRegistration: () => import('./sequences/course-registration.js'),
  cricinfo: () => import('./sequences/cricinfo.js'),
  elevator: () => import('./sequences/elevator.js'),
  fizzBuzz: () => import('./sequences/fizz-buzz.js'),
  fooBar: () => import('./sequences/foo-bar.js'),
  h2o: () => import('./sequences/h2o.js'),
  hotel: () => import('./sequences/hotel.js'),
  inventory: () => import('./sequences/inventory.js'),
  library: () => import('./sequences/library.js'),
  linkedin: () => import('./sequences/linkedin.js'),
  locker: () => import('./sequences/locker.js'),
  payment: () => import('./sequences/payment.js'),
  webcrawler: () => import('./sequences/webcrawler.js'),
  cachelibrary: () => import('./sequences/cachelibrary.js'),
  kvstore: () => import('./sequences/kvstore.js'),
  coupon: () => import('./sequences/coupon.js'),
  blackjack: () => import('./sequences/blackjack.js'),
  workflow: () => import('./sequences/workflow.js'),
  loggingFramework: () => import('./sequences/logging-framework.js'),
  'lru-cache': () => import('./sequences/lru-cache.js'),
  ludo: () => import('./sequences/ludo.js'),
  mergeSort: () => import('./sequences/merge-sort.js'),
  minesweeper: () => import('./sequences/minesweeper.js'),
  movieticket: () => import('./sequences/movieticket.js'),
  musicStreaming: () => import('./sequences/music-streaming.js'),
  parking: () => import('./sequences/parking.js'),
  pubsub: () => import('./sequences/pubsub.js'),
  restaurant: () => import('./sequences/restaurant.js'),
  shoppingcart: () => import('./sequences/shoppingcart.js'),
  snakeladders: () => import('./sequences/snakeladders.js'),
  socialNetwork: () => import('./sequences/social-network.js'),
  splitwise: () => import('./sequences/splitwise.js'),
  stackoverflow: () => import('./sequences/stackoverflow.js'),
  stockbroker: () => import('./sequences/stock-brokerage.js'),
  taskManagement: () => import('./sequences/task-management.js'),
  'task-management': () => import('./sequences/task-management.js'),
  tictactoe: () => import('./sequences/tictactoe.js'),
  trafficSignal: () => import('./sequences/traffic-signal.js'),
  ttlCache: () => import('./sequences/ttl-cache.js'),
  uber: () => import('./sequences/uber.js'),
  vendingmachine: () => import('./sequences/vendingmachine.js'),
  wallet: () => import('./sequences/wallet.js'),
  zeroEvenOdd: () => import('./sequences/zero-even-odd.js'),
  zomato: () => import('./sequences/zomato.js'),
  threadPool: () => import('./sequences/thread-pool.js'),
};

export default sequenceDiagrams;
