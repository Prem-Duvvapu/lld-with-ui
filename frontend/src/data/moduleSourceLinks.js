// Maps each module's `module` prop value (as passed to LldPage / ClassDiagram / DesignDetails)
// to its actual GitHub source folders on `main`. Kept as an explicit table rather than a string
// template because the mapping is NOT uniform: the 9 concurrency primitives nest under
// backend/.../com/lld/concurrency/<key>/ instead of a top-level package, `logging-framework`'s
// backend package is just `logging`, `lru-cache`'s is `lrucache`, `parking`'s is `parkinglot`,
// and the frontend folder for `stockbroker` is `stock-brokerage` -- none of that is derivable
// from the module key alone.

export const GITHUB_REPO_URL = 'https://github.com/Prem-Duvvapu/lld-with-ui';
const BRANCH = 'main';

// module key -> { backend: 'com/lld/<path>', frontend: '<frontend/src/lld folder>' }
const SOURCE_PATHS = {
  airline: { backend: 'com/lld/airline', frontend: 'airline' },
  atm: { backend: 'com/lld/atm', frontend: 'atm' },
  auction: { backend: 'com/lld/auction', frontend: 'auction' },
  blackjack: { backend: 'com/lld/blackjack', frontend: 'blackjack' },
  'blocking-queue': { backend: 'com/lld/concurrency/blockingqueue', frontend: 'blocking-queue' },
  'bloom-filter': { backend: 'com/lld/concurrency/bloomfilter', frontend: 'bloom-filter' },
  cachelibrary: { backend: 'com/lld/cachelibrary', frontend: 'cachelibrary' },
  'car-rental': { backend: 'com/lld/carrental', frontend: 'car-rental' },
  chess: { backend: 'com/lld/chess', frontend: 'chess' },
  'circuit-breaker': { backend: 'com/lld/circuitbreaker', frontend: 'circuit-breaker' },
  coffeemachine: { backend: 'com/lld/coffeemachine', frontend: 'coffeemachine' },
  'concert-ticket': { backend: 'com/lld/concertticket', frontend: 'concert-ticket' },
  'concurrent-hashmap': { backend: 'com/lld/concurrency/concurrenthashmap', frontend: 'concurrent-hashmap' },
  coupon: { backend: 'com/lld/coupon', frontend: 'coupon' },
  'course-registration': { backend: 'com/lld/courseregistration', frontend: 'course-registration' },
  cricinfo: { backend: 'com/lld/cricinfo', frontend: 'cricinfo' },
  digitalwallet: { backend: 'com/lld/digitalwallet', frontend: 'digitalwallet' },
  elevator: { backend: 'com/lld/elevator', frontend: 'elevator' },
  featureflag: { backend: 'com/lld/featureflag', frontend: 'featureflag' },
  'fizz-buzz': { backend: 'com/lld/concurrency/fizzbuzz', frontend: 'fizz-buzz' },
  'foo-bar': { backend: 'com/lld/concurrency/foobar', frontend: 'foo-bar' },
  h2o: { backend: 'com/lld/concurrency/h2o', frontend: 'h2o' },
  hotel: { backend: 'com/lld/hotel', frontend: 'hotel' },
  inventory: { backend: 'com/lld/inventory', frontend: 'inventory' },
  jobscheduler: { backend: 'com/lld/jobscheduler', frontend: 'jobscheduler' },
  kvstore: { backend: 'com/lld/kvstore', frontend: 'kvstore' },
  library: { backend: 'com/lld/library', frontend: 'library' },
  linkedin: { backend: 'com/lld/linkedin', frontend: 'linkedin' },
  locker: { backend: 'com/lld/locker', frontend: 'locker' },
  'logging-framework': { backend: 'com/lld/logging', frontend: 'logging-framework' },
  'lru-cache': { backend: 'com/lld/lrucache', frontend: 'lru-cache' },
  ludo: { backend: 'com/lld/ludo', frontend: 'ludo' },
  'meeting-scheduler': { backend: 'com/lld/meetingscheduler', frontend: 'meeting-scheduler' },
  'merge-sort': { backend: 'com/lld/concurrency/mergesort', frontend: 'merge-sort' },
  minesweeper: { backend: 'com/lld/minesweeper', frontend: 'minesweeper' },
  movieticket: { backend: 'com/lld/movieticket', frontend: 'movieticket' },
  'music-streaming': { backend: 'com/lld/musicstreaming', frontend: 'music-streaming' },
  notification: { backend: 'com/lld/notification', frontend: 'notification' },
  parking: { backend: 'com/lld/parkinglot', frontend: 'parking' },
  payment: { backend: 'com/lld/payment', frontend: 'payment' },
  pubsub: { backend: 'com/lld/pubsub', frontend: 'pubsub' },
  'rate-limiter': { backend: 'com/lld/ratelimiter', frontend: 'rate-limiter' },
  restaurant: { backend: 'com/lld/restaurant', frontend: 'restaurant' },
  shoppingcart: { backend: 'com/lld/shoppingcart', frontend: 'shoppingcart' },
  snakeladders: { backend: 'com/lld/snakeladders', frontend: 'snakeladders' },
  'social-network': { backend: 'com/lld/socialnetwork', frontend: 'social-network' },
  splitwise: { backend: 'com/lld/splitwise', frontend: 'splitwise' },
  stackoverflow: { backend: 'com/lld/stackoverflow', frontend: 'stackoverflow' },
  stockbroker: { backend: 'com/lld/stockbroker', frontend: 'stock-brokerage' },
  'task-management': { backend: 'com/lld/taskmanagement', frontend: 'task-management' },
  'thread-pool': { backend: 'com/lld/threadpool', frontend: 'thread-pool' },
  tictactoe: { backend: 'com/lld/tictactoe', frontend: 'tictactoe' },
  'traffic-signal': { backend: 'com/lld/trafficsignal', frontend: 'traffic-signal' },
  'ttl-cache': { backend: 'com/lld/concurrency/ttlcache', frontend: 'ttl-cache' },
  uber: { backend: 'com/lld/uber', frontend: 'uber' },
  vendingmachine: { backend: 'com/lld/vendingmachine', frontend: 'vendingmachine' },
  webcrawler: { backend: 'com/lld/webcrawler', frontend: 'webcrawler' },
  workflow: { backend: 'com/lld/workflow', frontend: 'workflow' },
  'zero-even-odd': { backend: 'com/lld/concurrency/zeroevenodd', frontend: 'zero-even-odd' },
  zomato: { backend: 'com/lld/zomato', frontend: 'zomato' },
};

/** Resolve a module key to its {backendUrl, frontendUrl} on GitHub, or null if unknown. */
export function getModuleSourceLinks(module) {
  const paths = SOURCE_PATHS[module];
  if (!paths) return null;
  return {
    backendUrl: `${GITHUB_REPO_URL}/tree/${BRANCH}/backend/src/main/java/${paths.backend}`,
    frontendUrl: `${GITHUB_REPO_URL}/tree/${BRANCH}/frontend/src/lld/${paths.frontend}`,
  };
}
