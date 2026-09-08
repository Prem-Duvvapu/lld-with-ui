// Sequence diagram content for webcrawler.
// Grounded directly in WebCrawlerService#processUrl and
// WebCrawlerConcurrencyTest#repeatedDedupAndPolitenessRaceNeverProducesADoubleFetch: one wave
// seeded with an exact-duplicate URL on domain A (a pure dedup race) and two distinct URLs on
// domain B (a pure politeness race), submitted to the worker pool at the same instant. A class
// diagram shows CrawlEngine owns a visited map and per-domain locks; it does not show why the
// domain-B loser gets re-queued instead of failing outright, or why the domain-A loser never
// even touches the domain lock.
export default {
  title: 'Web Crawler — One Wave Closing Both the Dedup Race and the Politeness Race',
  description:
    'A single wave submits four URLs to the worker pool at once: "http://a.com/p" twice (an exact duplicate) and "http://b.com/p1" / "http://b.com/p2" (two different URLs on the same domain). The two workers racing on the exact duplicate never even reach the domain lock — CrawlEngine#claimUrl is a single atomic ConcurrentHashMap.putIfAbsent, so the loser returns immediately. The two workers on domain B DO both claim successfully (different URLs), so they race for that domain\'s ReentrantLock instead; whichever acquires it first records the fetch time and proceeds, and the second sees "too soon" under the SAME lock, releases its claim, and re-queues itself for a later wave rather than fetching within the politeness window.',
  flows: [
    {
      id: 'one-wave-dedup-and-politeness-race',
      label: 'Domain A: exact-duplicate URL (dedup race) — Domain B: same-domain siblings (politeness race)',
      description:
        'startCrawl seeds the frontier with ["http://a.com/p", "http://a.com/p", "http://b.com/p1", "http://b.com/p2"], maxPages=2. All four fit in one wave (WORKER_COUNT=8) and are submitted to the pool together, so every race below is genuinely concurrent, not simulated by test-only locking. See WebCrawlerConcurrencyTest, run for 300 rounds.',
      participants: [
        { id: 'workerA1', name: 'Worker\n(a.com/p, copy 1)', kind: 'actor' },
        { id: 'workerA2', name: 'Worker\n(a.com/p, copy 2)', kind: 'actor' },
        { id: 'workerB1', name: 'Worker\n(b.com/p1)', kind: 'actor' },
        { id: 'workerB2', name: 'Worker\n(b.com/p2)', kind: 'actor' },
        { id: 'engine', name: 'CrawlEngine', kind: 'component' },
        { id: 'visited', name: 'visited\n(ConcurrentHashMap)', kind: 'component', stereotype: 'claim-set' },
        { id: 'domainLockB', name: 'domainLocks["b.com"]\n(ReentrantLock)', kind: 'component', stereotype: 'lock' },
        { id: 'fetcher', name: 'PageFetcher', kind: 'component' },
      ],
      steps: [
        { type: 'note', over: ['workerA1', 'workerA2', 'workerB1', 'workerB2'], text: 'All four workers start together via a CountDownLatch — this is one wave, not four separate calls.' },
        { from: 'workerA1', to: 'visited', text: 'claimUrl("a.com/p")  — putIfAbsent, wins' },
        { from: 'visited', to: 'workerA1', text: 'return true', type: 'return' },
        { from: 'workerA2', to: 'visited', text: 'claimUrl("a.com/p")  — putIfAbsent, ALREADY PRESENT' },
        { from: 'visited', to: 'workerA2', text: 'return false', type: 'return' },
        { from: 'workerA2', to: 'workerA2', text: 'DEDUPED — return immediately, never touches any domain lock' },
        { from: 'workerB1', to: 'visited', text: 'claimUrl("b.com/p1")  — different URL, wins' },
        { from: 'visited', to: 'workerB1', text: 'return true', type: 'return' },
        { from: 'workerB2', to: 'visited', text: 'claimUrl("b.com/p2")  — different URL, also wins' },
        { from: 'visited', to: 'workerB2', text: 'return true', type: 'return' },
        { type: 'note', over: ['workerB1', 'workerB2'], text: 'Both B workers claimed successfully -- the dedup step alone does not stop them. The politeness race is a SEPARATE mechanism.' },
        { from: 'workerB1', to: 'domainLockB', text: 'domainLockFor("b.com").lock()  — acquired', activate: 'domainLockB' },
        { from: 'workerB2', to: 'domainLockB', text: 'domainLockFor("b.com").lock()  — BLOCKS, B1 holds it' },
        { from: 'workerB1', to: 'domainLockB', text: 'lastFetchTime["b.com"] == null -> politenessOk, record now' },
        { from: 'workerA1', to: 'domainLockB', text: '(meanwhile) A1 uses its OWN domain lock for "a.com" -- no contention with B at all' },
        { from: 'workerB1', to: 'domainLockB', text: 'unlock()', deactivate: 'domainLockB' },
        { from: 'workerB1', to: 'fetcher', text: 'fetch("b.com/p1", jobId)  — outside the lock' },
        { from: 'fetcher', to: 'workerB1', text: 'return Page(links=[p1/child1, p1/child2])', type: 'return' },
        { from: 'domainLockB', to: 'workerB2', text: 'lock() finally returns — B2 is now inside', activate: 'domainLockB' },
        { type: 'note', over: ['domainLockB'], text: 'This is the step the claim alone does not guarantee: B2 must re-check the fetch time NOW, under the SAME lock B1 just held.' },
        { from: 'workerB2', to: 'domainLockB', text: 'now - lastFetchTime["b.com"] < POLITENESS_WINDOW_MILLIS -> NOT politenessOk' },
        { from: 'workerB2', to: 'domainLockB', text: 'unlock()', deactivate: 'domainLockB' },
        { from: 'workerB2', to: 'visited', text: 'unclaim("b.com/p2")  — release the claim' },
        { from: 'workerB2', to: 'engine', text: 'offer("b.com/p2")  — re-queued for a LATER wave, not failed' },
        { type: 'note', over: ['workerA1', 'workerA2', 'workerB1', 'workerB2'], text: 'This wave: 2 pages fetched (a.com/p, b.com/p1). maxPages=2 is now reached, so the loop exits before b.com/p2 is ever retried. Exactly one page per domain, no URL ever fetched twice.' },
      ],
    },
  ],
};
