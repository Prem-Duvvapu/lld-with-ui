// designDetails — lazy barrel index.
// Content lives in ./design/<module>.js, one file per module.
//
// Each value is a LOADER, not the data: these files total ~1.7 MB across the three
// barrels, and static imports pulled all 60 modules into one shared chunk that every
// module page downloaded (1,142 kB / 317 kB gzip) to show exactly one of them.
// Dynamic import gives each module its own chunk, fetched only when opened.
// Read them through hooks/useModuleData.js; resolveModuleKey still works unchanged
// because the keys here are identical to the ones the static barrel used.
//
// Add a module by creating its file and registering it here.

const designDetails = {
  airline: () => import('./design/airline.js'),
  atm: () => import('./design/atm.js'),
  auction: () => import('./design/auction.js'),
  blockingQueue: () => import('./design/blocking-queue.js'),
  bloomFilter: () => import('./design/bloom-filter.js'),
  carRental: () => import('./design/car-rental.js'),
  meetingScheduler: () => import('./design/meeting-scheduler.js'),
  chess: () => import('./design/chess.js'),
  circuitBreaker: () => import('./design/circuit-breaker.js'),
  coffee: () => import('./design/coffee.js'),
  concertTicket: () => import('./design/concert-ticket.js'),
  concurrentHashmap: () => import('./design/concurrent-hashmap.js'),
  courseRegistration: () => import('./design/course-registration.js'),
  cricinfo: () => import('./design/cricinfo.js'),
  elevator: () => import('./design/elevator.js'),
  featureflag: () => import('./design/featureflag.js'),
  fizzBuzz: () => import('./design/fizz-buzz.js'),
  fooBar: () => import('./design/foo-bar.js'),
  h2o: () => import('./design/h2o.js'),
  hotel: () => import('./design/hotel.js'),
  inventory: () => import('./design/inventory.js'),
  jobscheduler: () => import('./design/jobscheduler.js'),
  locker: () => import('./design/locker.js'),
  payment: () => import('./design/payment.js'),
  webcrawler: () => import('./design/webcrawler.js'),
  cachelibrary: () => import('./design/cachelibrary.js'),
  kvstore: () => import('./design/kvstore.js'),
  coupon: () => import('./design/coupon.js'),
  blackjack: () => import('./design/blackjack.js'),
  workflow: () => import('./design/workflow.js'),
  library: () => import('./design/library.js'),
  linkedin: () => import('./design/linkedin.js'),
  loggingFramework: () => import('./design/logging-framework.js'),
  'lru-cache': () => import('./design/lru-cache.js'),
  ludo: () => import('./design/ludo.js'),
  mergeSort: () => import('./design/merge-sort.js'),
  minesweeper: () => import('./design/minesweeper.js'),
  notification: () => import('./design/notification.js'),
  movieticket: () => import('./design/movieticket.js'),
  musicStreaming: () => import('./design/music-streaming.js'),
  parking: () => import('./design/parking.js'),
  pubsub: () => import('./design/pubsub.js'),
  rateLimiter: () => import('./design/rate-limiter.js'),
  restaurant: () => import('./design/restaurant.js'),
  shoppingcart: () => import('./design/shoppingcart.js'),
  snakeladders: () => import('./design/snakeladders.js'),
  socialNetwork: () => import('./design/social-network.js'),
  splitwise: () => import('./design/splitwise.js'),
  stackoverflow: () => import('./design/stackoverflow.js'),
  stockbroker: () => import('./design/stockbroker.js'),
  taskManagement: () => import('./design/task-management.js'),
  tictactoe: () => import('./design/tictactoe.js'),
  trafficSignal: () => import('./design/traffic-signal.js'),
  ttlCache: () => import('./design/ttl-cache.js'),
  uber: () => import('./design/uber.js'),
  vendingmachine: () => import('./design/vendingmachine.js'),
  wallet: () => import('./design/wallet.js'),
  zeroEvenOdd: () => import('./design/zero-even-odd.js'),
  zomato: () => import('./design/zomato.js'),
  threadPool: () => import('./design/thread-pool.js'),
};

export default designDetails;
