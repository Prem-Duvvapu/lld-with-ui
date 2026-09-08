// classDiagrams — webcrawler
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Web Crawler — Class Diagram',
  classes: [
    {
      name: 'WebCrawlerService',
      stereotype: 'service',
      fields: [
        '- repository: WebCrawlerRepository',
        '- filterStrategyFactory: UrlFilterStrategyFactory',
        '- fetcher: PageFetcher',
      ],
      methods: [
        '+ startCrawl(seedUrls, maxPages, filterPolicy): CrawlJob',
        '+ getJob(jobId): CrawlJob',
        '+ getPagesForJob(jobId): List<Page>',
        '- runCrawlToCompletion(...): CrawlJob',
        '- processUrl(url, engine, job, filterStrategy, repo): ProcessOutcome',
      ],
    },
    {
      name: 'WebCrawlerRepository',
      stereotype: 'repository',
      fields: [
        '- jobs: ConcurrentHashMap<String, CrawlJob>',
        '- pages: ConcurrentHashMap<String, Page>',
        '- engines: ConcurrentHashMap<String, CrawlEngine>',
      ],
      methods: [
        '+ saveJob(job): void',
        '+ getJob(jobId): CrawlJob',
        '+ savePage(page): void',
        '+ getPagesForJob(jobId): List<Page>',
        '+ putEngine(jobId, engine): void',
        '+ getEngine(jobId): CrawlEngine',
        '+ reset(): void',
      ],
    },
    {
      name: 'CrawlEngine',
      stereotype: 'internal',
      fields: [
        '- frontier: LinkedBlockingQueue<String>',
        '- visited: ConcurrentHashMap<String, Boolean>',
        '- domainLocks: ConcurrentHashMap<String, ReentrantLock>',
        '- lastFetchTimeByDomain: ConcurrentHashMap<String, Long>',
        '- pagesFetched: AtomicInteger',
        '- seedDomains: Set<String>',
      ],
      methods: [
        '+ claimUrl(url): boolean  // atomic putIfAbsent',
        '+ domainLockFor(domain): ReentrantLock',
        '+ offer(url): void',
        '+ poll(): String',
      ],
    },
    {
      name: 'CrawlJob',
      fields: [
        '- id: String',
        '- seedUrls: List<String>',
        '- maxPages: int',
        '- filterPolicy: UrlFilterPolicy',
        '- status: CrawlJobStatus',
        '- pagesFetched: int',
        '- createdAtEpoch: long',
      ],
      methods: [],
    },
    {
      name: 'CrawlJobStatus',
      stereotype: 'enum',
      fields: ['PENDING', 'RUNNING', 'COMPLETED'],
      methods: [],
    },
    {
      name: 'Page',
      fields: [
        '- url: String',
        '- jobId: String',
        '- domain: String',
        '- content: String',
        '- links: List<String>',
        '- fetchedAtEpoch: long',
      ],
      methods: [],
    },
    {
      name: 'PageFetcher',
      stereotype: 'component',
      fields: [],
      methods: ['+ fetch(url, jobId): Page  // deterministic, simulated -- never a real HTTP call'],
    },
    {
      name: 'UrlFilterPolicy',
      stereotype: 'enum',
      fields: ['ALLOW_ALL', 'RESPECT_ROBOTS_TXT', 'DOMAIN_ALLOWLIST'],
      methods: [],
    },
    {
      name: 'UrlFilterStrategy',
      stereotype: 'interface',
      fields: [],
      methods: ['+ isAllowed(url, seedDomains): boolean'],
    },
    {
      name: 'AllowAllStrategy',
      fields: ['implements UrlFilterStrategy'],
      methods: ['+ isAllowed(...): boolean'],
    },
    {
      name: 'RespectRobotsTxtStrategy',
      fields: ['implements UrlFilterStrategy'],
      methods: ['+ isAllowed(...): boolean  // rejects simulated /admin, /private paths'],
    },
    {
      name: 'DomainAllowlistStrategy',
      fields: ['implements UrlFilterStrategy'],
      methods: ['+ isAllowed(...): boolean  // only same-domain-as-seed'],
    },
    {
      name: 'UrlFilterStrategyFactory',
      stereotype: 'resolver',
      fields: [],
      methods: ['+ forPolicy(policy): UrlFilterStrategy'],
    },
    {
      name: 'UrlUtils',
      stereotype: 'utility',
      fields: [],
      methods: ['+ extractDomain(url): String', '+ isWellFormed(url): boolean'],
    },
  ],
  relationships: [
    { from: 'WebCrawlerService', to: 'WebCrawlerRepository', label: 'reads/writes' },
    { from: 'WebCrawlerService', to: 'CrawlEngine', label: 'drives per-job worker waves against' },
    { from: 'WebCrawlerService', to: 'UrlFilterStrategyFactory', label: 'resolves filter via' },
    { from: 'WebCrawlerService', to: 'PageFetcher', label: 'fetches pages via' },
    { from: 'UrlFilterStrategyFactory', to: 'UrlFilterStrategy', label: 'resolves' },
    { from: 'AllowAllStrategy', to: 'UrlFilterStrategy', label: 'implements', dashed: true },
    { from: 'RespectRobotsTxtStrategy', to: 'UrlFilterStrategy', label: 'implements', dashed: true },
    { from: 'DomainAllowlistStrategy', to: 'UrlFilterStrategy', label: 'implements', dashed: true },
    { from: 'WebCrawlerRepository', to: 'CrawlJob', label: 'stores' },
    { from: 'WebCrawlerRepository', to: 'Page', label: 'stores' },
    { from: 'WebCrawlerRepository', to: 'CrawlEngine', label: 'stores one per job' },
    { from: 'CrawlJob', to: 'CrawlJobStatus', label: 'has' },
    { from: 'CrawlJob', to: 'UrlFilterPolicy', label: 'has' },
    { from: 'Page', to: 'CrawlJob', label: 'belongs to' },
    { from: 'DomainAllowlistStrategy', to: 'UrlUtils', label: 'uses' },
  ],
};
