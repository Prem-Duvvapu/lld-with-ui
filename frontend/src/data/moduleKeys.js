// Single resolver for module -> design-data key.
//
// Pages pass a module id in several shapes ('parking-lot', 'coffeemachine', 'tic-tac-toe').
// This maps any of them onto the one canonical key that designDetails / classDiagrams
// store content under. It used to be duplicated inside DesignDetails.jsx and
// ClassDiagram.jsx, which is how the two drifted apart.

export const ALIAS_MAP = {
  'parking-lot': 'parking',
  'coffee-machine': 'coffee',
  coffeemachine: 'coffee',
  'digital-wallet': 'wallet',
  digitalwallet: 'wallet',
  'movie-ticket': 'movieticket',
  'snake-ladders': 'snakeladders',
  'tic-tac-toe': 'tictactoe',
  // LRU Cache: LldPage passes 'lru-cache', the page body used to pass 'lrucache'.
  lrucache: 'lru-cache',
  lruCache: 'lru-cache',
  // Stock Brokerage / Pub-Sub: content was previously split across two spellings.
  stockBrokerage: 'stockbroker',
  pubSub: 'pubsub',
  'pub-sub': 'pubsub',
};

/**
 * Resolve a module id to the key its content is stored under.
 * Tries the alias map, then the id as given, then camelCase, then de-hyphenated.
 * Returns null when the store has nothing for this module.
 */
export function resolveModuleKey(store, module) {
  if (!module || !store) return null;
  const aliased = ALIAS_MAP[module] || module;
  const camel = aliased.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const noHyphen = aliased.replace(/-/g, '');
  for (const key of [aliased, camel, noHyphen]) {
    if (Object.prototype.hasOwnProperty.call(store, key)) return key;
  }
  return null;
}

/** Resolve a module id straight to its content, or null. */
export function resolveModuleData(store, module) {
  const key = resolveModuleKey(store, module);
  return key ? store[key] : null;
}
