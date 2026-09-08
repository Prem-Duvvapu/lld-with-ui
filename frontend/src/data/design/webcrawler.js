// designDetails — webcrawler
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Web Crawler — Design Details',
  requirements: [
    'A simplified multi-threaded crawler: a frontier queue of URLs to visit, a fixed worker pool that drains it in waves and fetches concurrently, a dedup set so no URL is ever fetched twice, and per-domain politeness (a domain cannot be re-hit within a fixed window of its last fetch).',
    'A fake PageFetcher returns deterministic simulated content and two child links per page — this module is about the crawl machinery, never a real outbound HTTP request.',
    'Strategy Pattern for URL filtering: UrlFilterStrategy (AllowAll / RespectRobotsTxt / DomainAllowlist), resolved by UrlFilterStrategyFactory via an EnumMap.',
    'Producer-Consumer shape at the application-domain level: the frontier queue is the buffer, a fixed ExecutorService is the consumer pool — the same idea as this repo\'s blocking-queue/thread-pool concurrency primitives, but driving an actual crawl algorithm instead of a synthetic demo.',
    'Isolated Concurrency Simulation: an isolated /api/webcrawler/sim/* sandbox (a second WebCrawlerRepository instance) with step-by-step wave dispatch and a standalone live dedup-race demo, so the walkthrough can never touch a live crawl job.',
  ],
  entities: [
    {
      name: 'WebCrawlerService',
      description: 'Spring @Service facade owning the crawl loop and the isolated simulation engine.',
      fields: [
        { name: 'repository', type: 'WebCrawlerRepository', description: 'Live job/page ledger' },
        { name: 'filterStrategyFactory', type: 'UrlFilterStrategyFactory', description: 'Resolves UrlFilterPolicy to a concrete strategy' },
        { name: 'fetcher', type: 'PageFetcher', description: 'Deterministic simulated fetch' },
      ],
      methods: [
        { name: 'startCrawl(seedUrls, maxPages, filterPolicy)', returns: 'CrawlJob', description: 'Seeds the frontier and drains it wave-by-wave until maxPages is reached or the frontier empties' },
        { name: 'processUrl(url, engine, job, filterStrategy, repo)', returns: 'ProcessOutcome', description: 'Closes both races (see Concurrency below); private, invoked once per URL per wave' },
      ],
    },
    {
      name: 'CrawlEngine',
      description: 'Per-job working state — a plain object, not a Spring bean, since a fresh instance is created for every job (and a second one per /sim/* run). Never exposed through the API.',
      fields: [
        { name: 'frontier', type: 'LinkedBlockingQueue<String>', description: 'URLs still to visit' },
        { name: 'visited', type: 'ConcurrentHashMap<String, Boolean>', description: 'Atomic claim set — putIfAbsent, never containsKey+put' },
        { name: 'domainLocks', type: 'ConcurrentHashMap<String, ReentrantLock>', description: 'One lock per domain, created lazily via computeIfAbsent' },
        { name: 'lastFetchTimeByDomain', type: 'ConcurrentHashMap<String, Long>', description: 'Checked-and-updated only while that domain\'s lock is held' },
      ],
      methods: [
        { name: 'claimUrl(url)', returns: 'boolean', description: 'True only for the single caller that first claims this URL' },
        { name: 'domainLockFor(domain)', returns: 'ReentrantLock', description: 'Lazily creates the per-domain lock' },
      ],
    },
    {
      name: 'CrawlJob',
      description: 'One crawl run. Immutable seed/policy fields; status and pagesFetched are the only fields mutated after creation, and only by the single orchestrating thread between waves.',
      fields: [
        { name: 'seedUrls', type: 'List<String>', description: 'Starting URLs' },
        { name: 'maxPages', type: 'int', description: 'Crawl stops once this many pages are fetched' },
        { name: 'filterPolicy', type: 'UrlFilterPolicy', description: 'Which UrlFilterStrategy gates newly-discovered links' },
        { name: 'status', type: 'CrawlJobStatus', description: 'PENDING / RUNNING / COMPLETED' },
      ],
      methods: [],
    },
    {
      name: 'PageFetcher',
      description: 'Deterministic, entirely simulated fetch. Never issues an outbound HTTP request.',
      fields: [],
      methods: [
        { name: 'fetch(url, jobId)', returns: 'Page', description: 'Returns fixed content and exactly two child links, url+"/child1" and url+"/child2"' },
      ],
    },
  ],
  designPatterns: [
    {
      name: 'Strategy + Factory-shaped Resolver',
      used: true,
      explanation: 'UrlFilterStrategyFactory resolves UrlFilterPolicy (ALLOW_ALL/RESPECT_ROBOTS_TXT/DOMAIN_ALLOWLIST) to a UrlFilterStrategy via an EnumMap built once from every injected strategy bean — the same shape as locker.strategy.LockerAllocationStrategyFactory.',
    },
    {
      name: 'Producer-Consumer (frontier queue + worker pool)',
      used: true,
      explanation: 'The frontier is a LinkedBlockingQueue; each wave drains up to WORKER_COUNT URLs and submits them to a fixed ExecutorService, waiting on a CountDownLatch before draining the next wave. This is what makes the dedup and politeness races genuine rather than simulated: two workers in the same wave can actually land on contested state at the same instant.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'WebCrawlerRepository is pure CRUD; URL filtering lives in the strategies; the fake fetch lives in PageFetcher; WebCrawlerService only orchestrates the wave loop.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A fourth filter policy (e.g. a max-depth cutoff) is one new UrlFilterStrategy class and one line in UrlFilterStrategyFactory\'s constructor — no existing strategy changes.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every UrlFilterStrategy honors the same isAllowed(url, seedDomains) contract; the crawl loop never needs to know which concrete strategy it is consulting.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'CrawlEngine\'s frontier, visited set and domain locks are private to the engine; WebCrawlerService only ever calls its narrow public methods (offer/poll/claimUrl/domainLockFor).' },
    { name: 'Polymorphism', description: 'WebCrawlerService calls filterStrategy.isAllowed(...) without knowing which concrete UrlFilterStrategy is behind it.' },
    { name: 'Composition', description: 'Each CrawlJob owns exactly one CrawlEngine for its lifetime, looked up by job id — the engine is never shared across jobs, which is what keeps two concurrently-running jobs (see the concurrency test) fully independent.' },
  ],
  extensibility: [
    { area: 'Real HTTP fetching', description: 'PageFetcher currently returns fixed, deterministic content — swapping in a real HTTP client would mean handling timeouts, redirects and non-2xx responses, none of which this simulated version needs to model.', difficulty: 'Hard' },
    { area: 'Depth-limited crawling', description: 'CrawlJob has no notion of link depth today; adding one would mean threading a depth counter alongside each frontier entry (the queue currently only holds bare URL strings) and checking it in processUrl alongside the maxPages cap.', difficulty: 'Medium' },
    { area: 'Persistent, resumable jobs', description: 'A crawl job\'s CrawlEngine lives only in memory and is lost on restart; resuming a large crawl would need the frontier and visited set persisted to a real store instead of ConcurrentHashMap/LinkedBlockingQueue.', difficulty: 'Hard' },
  ],
  tradeoffs: [
    'A domain that loses the politeness race is unclaimed and re-queued rather than the worker thread sleeping out the window — this keeps every worker thread free to pick up other work instead of blocking, at the cost of a busy-poll-style retry loop when a crawl is entirely single-domain (bounded by the small politeness window, but a real crawler would likely use a delay queue instead).',
    'The wave-based design checks the maxPages cap at the start of each processUrl call, not atomically against the fetch itself — a wave can therefore fetch slightly more than maxPages if many workers pass the check before any of them increments the counter. Acceptable for a demo module; a strict cap would need a CAS loop on the counter.',
    'CrawlEngine is deliberately not a Spring bean — WebCrawlerRepository holds one instance per job id in a plain map instead. Making it a singleton bean would have meant every job shared one frontier/visited set, defeating the per-job isolation the concurrency test relies on.',
  ],
  summary: 'A multi-threaded crawler whose centerpiece is closing two independent check-then-act races with the same tool used everywhere else in this portfolio for compound reads: an atomic claim for the dedup race (ConcurrentHashMap.putIfAbsent, not containsKey+put) and a per-domain ReentrantLock held across the whole check-and-update sequence for the politeness race. A single startCrawl call already drives genuine concurrency — internally it submits a whole wave of frontier URLs to a fixed worker pool at once, so seeding a job with a duplicate URL and same-domain siblings puts real racing workers on contested state without any test-only scaffolding. A Strategy-resolved URL filter (allow-all / simulated robots.txt / domain allowlist) gates which discovered links ever reach the frontier, and every fetch is a deterministic simulation — no real outbound HTTP call is ever made.',
  highlights: [
    'Two races proven in one repeated test: WebCrawlerConcurrencyTest seeds a job with an exact-duplicate URL on one domain and two distinct URLs on a second domain in the same wave, then asserts exactly one page per domain across 300 rounds — closing the dedup race and the politeness race simultaneously, with no wall-clock wait needed since the maxPages cap ends the job before any deferred retry would matter.',
    'A live, independently-provable dedup race: /sim/race fires N workers at the exact same URL through the real (non-synchronized) processUrl path; a method-level lock would have serialized every worker before any of them reached the atomic claim, making the race impossible to lose even on broken code — so the fix is proven at the CrawlEngine.claimUrl level, not by accident of scheduling.',
    'Two independently-running crawl jobs never interfere: each CrawlJob owns its own CrawlEngine, so six jobs started concurrently on six different threads each fetch exactly their own single seed page, proven directly rather than assumed from the per-job data model.',
  ],
};
