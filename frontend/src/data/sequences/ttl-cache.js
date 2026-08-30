// Sequence diagram content for ttl-cache.
// Grounded directly in TtlCacheService#run / TtlCache (ConcurrentHashMap + a real
// ScheduledExecutorService sweeper) — corrected after an earlier version invented a
// free-form live put()/get() demo. The real design is a single POST /run that plays a
// fixed scripted scenario (DEFAULT_PUTS at t=0, DEFAULT_GETS at scripted offsets on a
// dedicated driver thread) against one TtlCache, while a genuine background sweep thread
// evicts expired entries independently — both eviction paths (lazy-on-read AND proactive
// sweep) are exercised for real, not simulated.
export default {
  title: 'TTL Cache — Scripted Scenario, Lazy Expiry-on-Read & Background Sweep',
  description:
    'How TtlCacheService#run seeds one TtlCache with a fixed PutSpec batch, then drives a fixed GetSpec batch on a dedicated driver thread (each get() issued after a genuine Thread.sleep at its scripted offset) while a real ScheduledExecutorService sweeps expired entries on its own daemon thread at a fixed period — proving both eviction paths hold: a get() after TTL elapses but before the next sweep still sees the entry as gone (lazy expiry-on-read), and an entry nobody ever reads again is still evicted by the background sweep.',
  flows: [
    {
      id: 'ttl-cache-scripted-scenario',
      label: 'POST /run — seed 4 keys, scripted gets on a driver thread, background sweep evicts independently',
      description:
        'Default scenario: 4 keys are put at t=0 with different TTLs ("temp_flag" TTL=250ms, "rate_limit_counter" TTL=500ms, "session_token"/"user_profile" TTL=6000ms) against a 600ms sweep interval. A driver thread then issues 6 scripted get()s at fixed offsets: "temp_flag" at t=400ms is already past its 250ms TTL but the first sweep (t=600ms) hasn\'t run yet — get() catches it lazily and evicts it on read. "rate_limit_counter"\'s 500ms TTL elapses before anyone reads it again — the background sweeper evicts it on its own at the t=600ms tick (TtlCacheServiceTest asserts both EventTypes appear in the trace).',
      participants: [
        { id: 'client', name: 'Client', kind: 'actor' },
        { id: 'controller', name: 'TtlCacheController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'TtlCacheService', kind: 'component', stereotype: 'facade' },
        { id: 'driver', name: 'Driver Thread\n(scripted gets)', kind: 'actor' },
        { id: 'cache', name: 'TtlCache', kind: 'component', stereotype: 'primitive' },
        { id: 'sweeper', name: 'ttl-cache-sweeper\n(ScheduledExecutorService)', kind: 'actor' },
      ],
      steps: [
        { from: 'client', to: 'controller', text: 'POST /api/concurrency/ttl-cache/run {sweepIntervalMillis:600}' },
        { from: 'controller', to: 'service', text: 'run(request)', activate: 'service' },
        { from: 'service', to: 'cache', text: 'new TtlCache(600, recorder) — starts sweeper.scheduleAtFixedRate(sweepExpired, 600, 600ms)', activate: 'sweeper' },
        { from: 'service', to: 'cache', text: 'put("temp_flag", "on", ttl=250ms) ; put("rate_limit_counter", "1", ttl=500ms) ; put("session_token", ..., ttl=6000ms) ; put("user_profile", ..., ttl=6000ms)' },
        { from: 'service', to: 'driver', text: 'start driver thread — plays DEFAULT_GETS at scripted offsets' },
        { from: 'driver', to: 'driver', text: 'Thread.sleep(400ms) — advances to t=400ms' },
        { from: 'driver', to: 'cache', text: 'get("temp_flag") [t=400ms]', activate: 'cache' },
        { from: 'cache', to: 'cache', text: 'now(400) >= expiresAt(250) -> lazily expired: remove entry now, record LAZY_EXPIRY' },
        { from: 'cache', to: 'driver', text: 'return null (expired-on-read, before the sweeper ever touched this key)', type: 'return', deactivate: 'cache' },
        { type: 'note', over: ['sweeper'], text: 'At t=600ms the first sweep tick fires independently.' },
        { from: 'sweeper', to: 'cache', text: 'sweepExpired() — scans all entries; "rate_limit_counter" expired at t=500ms, nobody read it since' },
        { from: 'sweeper', to: 'cache', text: 'remove("rate_limit_counter"); record BACKGROUND_EVICTION', deactivate: 'sweeper' },
        { from: 'driver', to: 'driver', text: 'Thread.sleep to t=1000ms' },
        { from: 'driver', to: 'cache', text: 'get("rate_limit_counter") [t=1000ms]', activate: 'cache' },
        { from: 'cache', to: 'driver', text: 'return null (already gone — evicted by the sweep, not this read)', type: 'return', deactivate: 'cache' },
        { from: 'driver', to: 'cache', text: 'get("session_token") [t=2600ms] — well within its 6000ms TTL', activate: 'cache' },
        { from: 'cache', to: 'driver', text: 'return "tok-9f8a3c" (still valid)', type: 'return', deactivate: 'cache' },
        { from: 'service', to: 'driver', text: 'driver.join() — waits for the scripted scenario to finish' },
        { from: 'service', to: 'cache', text: 'close() — shuts down the sweeper daemon thread cleanly' },
        { from: 'service', to: 'controller', text: 'return RunResult {orderedTrace[]} — interleaves lazy-expiry and background-eviction events in true timestamp order', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'client', text: '200 OK — full scripted-scenario trace for replay', type: 'return' },
      ],
    },
  ],
};
