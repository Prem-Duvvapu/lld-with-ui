// classDiagrams — lazy barrel index.
// Content lives in ./diagrams/<module>.js, one file per module.
//
// Each value is a LOADER, not the data: these files total ~1.7 MB across the three
// barrels, and static imports pulled all 60 modules into one shared chunk that every
// module page downloaded (1,142 kB / 317 kB gzip) to show exactly one of them.
// Dynamic import gives each module its own chunk, fetched only when opened.
// Read them through hooks/useModuleData.js; resolveModuleKey still works unchanged
// because the keys here are identical to the ones the static barrel used.
//
// Add a module by creating its file and registering it here.

const classDiagrams = {
  airline: () => import('./diagrams/airline.js'),
  atm: () => import('./diagrams/atm.js'),
  auction: () => import('./diagrams/auction.js'),
  blockingQueue: () => import('./diagrams/blocking-queue.js'),
  bloomFilter: () => import('./diagrams/bloom-filter.js'),
  carRental: () => import('./diagrams/car-rental.js'),
  meetingScheduler: () => import('./diagrams/meeting-scheduler.js'),
  chess: () => import('./diagrams/chess.js'),
  circuitBreaker: () => import('./diagrams/circuit-breaker.js'),
  coffee: () => import('./diagrams/coffee.js'),
  concertTicket: () => import('./diagrams/concert-ticket.js'),
  concurrentHashmap: () => import('./diagrams/concurrent-hashmap.js'),
  courseRegistration: () => import('./diagrams/course-registration.js'),
  cricinfo: () => import('./diagrams/cricinfo.js'),
  elevator: () => import('./diagrams/elevator.js'),
  featureflag: () => import('./diagrams/featureflag.js'),
  fizzBuzz: () => import('./diagrams/fizz-buzz.js'),
  fooBar: () => import('./diagrams/foo-bar.js'),
  h2o: () => import('./diagrams/h2o.js'),
  hotel: () => import('./diagrams/hotel.js'),
  inventory: () => import('./diagrams/inventory.js'),
  jobscheduler: () => import('./diagrams/jobscheduler.js'),
  locker: () => import('./diagrams/locker.js'),
  payment: () => import('./diagrams/payment.js'),
  webcrawler: () => import('./diagrams/webcrawler.js'),
  cachelibrary: () => import('./diagrams/cachelibrary.js'),
  kvstore: () => import('./diagrams/kvstore.js'),
  coupon: () => import('./diagrams/coupon.js'),
  blackjack: () => import('./diagrams/blackjack.js'),
  workflow: () => import('./diagrams/workflow.js'),
  library: () => import('./diagrams/library.js'),
  linkedin: () => import('./diagrams/linkedin.js'),
  loggingFramework: () => import('./diagrams/logging-framework.js'),
  'lru-cache': () => import('./diagrams/lru-cache.js'),
  ludo: () => import('./diagrams/ludo.js'),
  mergeSort: () => import('./diagrams/merge-sort.js'),
  minesweeper: () => import('./diagrams/minesweeper.js'),
  notification: () => import('./diagrams/notification.js'),
  movieticket: () => import('./diagrams/movieticket.js'),
  musicStreaming: () => import('./diagrams/music-streaming.js'),
  parking: () => import('./diagrams/parking.js'),
  pubsub: () => import('./diagrams/pubsub.js'),
  rateLimiter: () => import('./diagrams/rate-limiter.js'),
  restaurant: () => import('./diagrams/restaurant.js'),
  shoppingcart: () => import('./diagrams/shoppingcart.js'),
  snakeladders: () => import('./diagrams/snakeladders.js'),
  socialNetwork: () => import('./diagrams/social-network.js'),
  splitwise: () => import('./diagrams/splitwise.js'),
  stackoverflow: () => import('./diagrams/stackoverflow.js'),
  stockbroker: () => import('./diagrams/stockbroker.js'),
  taskManagement: () => import('./diagrams/task-management.js'),
  tictactoe: () => import('./diagrams/tictactoe.js'),
  trafficSignal: () => import('./diagrams/traffic-signal.js'),
  ttlCache: () => import('./diagrams/ttl-cache.js'),
  uber: () => import('./diagrams/uber.js'),
  vendingmachine: () => import('./diagrams/vendingmachine.js'),
  wallet: () => import('./diagrams/wallet.js'),
  zeroEvenOdd: () => import('./diagrams/zero-even-odd.js'),
  zomato: () => import('./diagrams/zomato.js'),
  threadPool: () => import('./diagrams/thread-pool.js'),
};

export default classDiagrams;
