// Maps each module's route `path` (as used in Home.jsx's ALL_LLDS/routeMap) to the real
// GoF design patterns it implements -- extracted directly from each module's own
// `data/design/<key>.js` `designPatterns` array (only entries marked `used: true`), then
// normalized to a small canonical set (e.g. "Strategy Pattern (MisfirePolicy)" -> "Strategy").
// Deliberately excludes patterns every module claims by project convention (Facade, Repository,
// Dependency Injection) -- those don't discriminate anything, so including them would make every
// filter match nearly every module. A module with an empty array here (course-registration,
// library, shopping-cart, stock-brokerage) genuinely has no standout GoF pattern in its own
// design doc -- that's accurate, not a bug; see AUDIT.md for the modules already flagged as
// weaker on this exact criterion.
//
// Regenerate by re-running the extraction if a module's designPatterns array changes.

export const ALL_DESIGN_PATTERNS = [
  'Builder', 'Chain of Responsibility', 'Command', 'Composite', 'Decorator',
  'Factory', 'Observer', 'Singleton', 'State', 'Strategy', 'Template Method',
];

const MODULE_PATTERNS = {
  'airline-reservation': ['Factory', 'Strategy'],
  'atm': ['Factory', 'Singleton', 'State', 'Strategy', 'Template Method'],
  'auction': ['Factory', 'Observer', 'Strategy'],
  'blackjack': ['Factory', 'State', 'Strategy'],
  'blocking-queue': ['Observer'],
  'bloom-filter': ['Observer', 'State', 'Strategy'],
  'cachelibrary': ['Builder', 'Decorator', 'Factory', 'Strategy'],
  'car-rental': ['Factory', 'State', 'Strategy'],
  'chess': ['Command', 'Factory', 'State', 'Strategy'],
  'circuit-breaker': ['State', 'Strategy'],
  'coffee-machine': ['Decorator', 'Factory', 'Singleton', 'State'],
  'concert-ticket': ['Singleton', 'State', 'Strategy'],
  'concurrent-hashmap': ['Observer'],
  'coupon': ['Chain of Responsibility', 'Factory', 'Strategy'],
  'course-registration': [],
  'cricinfo': ['Observer', 'Singleton', 'State'],
  'digital-wallet': ['Command'],
  'elevator': ['Factory', 'Observer', 'State', 'Strategy'],
  'featureflag': ['Composite', 'Factory'],
  'fizz-buzz': ['Observer', 'Strategy'],
  'foo-bar': ['Observer'],
  'h2o': ['Observer'],
  'hotel-management': ['State', 'Strategy'],
  'inventory-management': ['Factory', 'Observer', 'Strategy'],
  'jobscheduler': ['Factory', 'Strategy'],
  'kvstore': ['Command', 'Template Method'],
  'library': [],
  'linkedin': ['Observer', 'Singleton', 'Strategy'],
  'locker': ['Factory', 'State', 'Strategy'],
  'logging-framework': ['Chain of Responsibility', 'Decorator', 'Observer', 'Singleton', 'Strategy'],
  'lru-cache': ['Strategy'],
  'ludo': ['State', 'Strategy'],
  'meeting-scheduler': ['State'],
  'merge-sort': ['Observer'],
  'minesweeper': ['Strategy'],
  'movie-ticket': ['Factory', 'Singleton', 'Strategy'],
  'music-streaming': ['Factory', 'Observer', 'Singleton', 'Strategy'],
  'notification': ['Factory', 'Strategy'],
  'parking-lot': ['Factory', 'Singleton', 'Strategy'],
  'payment': ['Chain of Responsibility', 'Factory', 'State', 'Strategy'],
  'pub-sub': ['Factory', 'Observer', 'Singleton'],
  'rate-limiter': ['Factory', 'Strategy'],
  'restaurant': ['State', 'Strategy'],
  'shopping-cart': [],
  'snakeladders': ['Strategy'],
  'social-network': ['Observer'],
  'splitwise': ['Factory', 'Strategy'],
  'stackoverflow': ['Factory', 'State', 'Strategy'],
  'stock-brokerage': [],
  'task-management': ['Factory', 'Singleton', 'State', 'Strategy'],
  'thread-pool': ['Factory', 'Strategy'],
  'tictactoe': ['Command'],
  'traffic-signal': ['Observer', 'State', 'Strategy'],
  'ttl-cache': ['Observer'],
  'uber': ['State', 'Strategy'],
  'vending-machine': ['Chain of Responsibility', 'Command', 'Singleton', 'State'],
  'webcrawler': ['Factory', 'Strategy'],
  'workflow': ['Chain of Responsibility', 'Factory', 'State', 'Strategy'],
  'zero-even-odd': ['Observer'],
  'zomato': ['Factory', 'State', 'Strategy'],
};

/** Patterns a module (by its route path) implements, or an empty array if none/unknown. */
export function getModulePatterns(path) {
  return MODULE_PATTERNS[path] || [];
}
