package com.lld.webcrawler.service;

import com.lld.webcrawler.exception.InvalidSeedUrlException;
import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.CrawlJobStatus;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.model.SimEvent;
import com.lld.webcrawler.model.UrlFilterPolicy;
import com.lld.webcrawler.repository.WebCrawlerRepository;
import com.lld.webcrawler.strategy.UrlFilterStrategy;
import com.lld.webcrawler.strategy.UrlFilterStrategyFactory;
import com.lld.webcrawler.util.UrlUtils;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

/**
 * Facade for the whole crawl. {@link #processUrl} is the concurrency centerpiece and closes two
 * independent races — see {@link CrawlEngine}'s javadoc for the full explanation of both. Each
 * job gets its own worker pool that drains the frontier in waves (batches of up to
 * {@link #WORKER_COUNT} URLs submitted concurrently), which is what makes the races real: two
 * workers in the same wave can genuinely land on the same URL, or on two different URLs from the
 * same domain, at the same instant.
 */
@Service
public class WebCrawlerService {

    private static final int WORKER_COUNT = 8;
    private static final long POLITENESS_WINDOW_MILLIS = 100;

    private final WebCrawlerRepository repository;
    private final UrlFilterStrategyFactory filterStrategyFactory;
    private final PageFetcher fetcher;
    private final AtomicLong jobIdGen = new AtomicLong(1001);

    // Isolated Simulation Engine State
    private final WebCrawlerRepository simRepository = new WebCrawlerRepository();
    private final AtomicLong simJobIdGen = new AtomicLong(1);
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);

    private enum ProcessOutcome { FETCHED, DEDUPED, POLITENESS_DEFERRED, CAPPED }

    public WebCrawlerService(WebCrawlerRepository repository,
                              UrlFilterStrategyFactory filterStrategyFactory,
                              PageFetcher fetcher) {
        this.repository = repository;
        this.filterStrategyFactory = filterStrategyFactory;
        this.fetcher = fetcher;
        initSimState();
    }

    public CrawlJob startCrawl(List<String> seedUrls, int maxPages, UrlFilterPolicy filterPolicy) {
        validateSeedUrls(seedUrls, maxPages);
        String jobId = "JOB-" + jobIdGen.getAndIncrement();
        return runCrawlToCompletion(repository, jobId, seedUrls, maxPages, filterPolicy);
    }

    public CrawlJob getJob(String jobId) {
        return repository.getJob(jobId);
    }

    public List<CrawlJob> getAllJobs() {
        return repository.getAllJobs();
    }

    public List<Page> getPagesForJob(String jobId) {
        repository.getJob(jobId);
        return repository.getPagesForJob(jobId);
    }

    private void validateSeedUrls(List<String> seedUrls, int maxPages) {
        if (seedUrls == null || seedUrls.isEmpty()) {
            throw new InvalidSeedUrlException("At least one seed URL is required");
        }
        for (String url : seedUrls) {
            if (!UrlUtils.isWellFormed(url)) {
                throw new InvalidSeedUrlException("Malformed seed URL: " + url);
            }
        }
        if (maxPages <= 0) {
            throw new InvalidSeedUrlException("maxPages must be positive, got " + maxPages);
        }
    }

    private CrawlJob runCrawlToCompletion(WebCrawlerRepository targetRepository, String jobId,
                                           List<String> seedUrls, int maxPages, UrlFilterPolicy filterPolicy) {
        CrawlJob job = seedJob(targetRepository, jobId, seedUrls, maxPages, filterPolicy);
        CrawlEngine engine = targetRepository.getEngine(jobId);
        UrlFilterStrategy filterStrategy = filterStrategyFactory.forPolicy(filterPolicy);

        job.setStatus(CrawlJobStatus.RUNNING);
        targetRepository.saveJob(job);

        ExecutorService executor = Executors.newFixedThreadPool(WORKER_COUNT);
        try {
            while (engine.getPagesFetched() < maxPages && !engine.isFrontierEmpty()) {
                runWave(engine, job, filterStrategy, targetRepository, executor, null);
            }
        } finally {
            executor.shutdown();
        }

        job.setStatus(CrawlJobStatus.COMPLETED);
        job.setPagesFetched(engine.getPagesFetched());
        targetRepository.saveJob(job);
        return job;
    }

    private CrawlJob seedJob(WebCrawlerRepository targetRepository, String jobId, List<String> seedUrls,
                              int maxPages, UrlFilterPolicy filterPolicy) {
        Set<String> seedDomains = seedUrls.stream().map(UrlUtils::extractDomain).collect(Collectors.toSet());
        CrawlEngine engine = new CrawlEngine(seedDomains);
        CrawlJob job = CrawlJob.builder()
                .id(jobId)
                .seedUrls(seedUrls)
                .maxPages(maxPages)
                .filterPolicy(filterPolicy)
                .status(CrawlJobStatus.PENDING)
                .pagesFetched(0)
                .createdAtEpoch(System.currentTimeMillis())
                .build();
        targetRepository.saveJob(job);
        targetRepository.putEngine(jobId, engine);
        seedUrls.forEach(engine::offer);
        return job;
    }

    /** Drains one wave (up to {@link #WORKER_COUNT} URLs) and processes it concurrently. */
    private void runWave(CrawlEngine engine, CrawlJob job, UrlFilterStrategy filterStrategy,
                          WebCrawlerRepository targetRepository, ExecutorService executor, List<SimEvent> eventSink) {
        List<String> batch = drainBatch(engine);
        if (batch.isEmpty()) {
            return;
        }
        CountDownLatch waveLatch = new CountDownLatch(batch.size());
        for (String url : batch) {
            executor.submit(() -> {
                try {
                    ProcessOutcome outcome = processUrl(url, engine, job, filterStrategy, targetRepository);
                    if (eventSink != null) {
                        logSimEvent(outcomeEventType(outcome), "Worker", outcomeDescription(outcome, url), null);
                    }
                } finally {
                    waveLatch.countDown();
                }
            });
        }
        try {
            waveLatch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private List<String> drainBatch(CrawlEngine engine) {
        List<String> batch = new ArrayList<>();
        for (int i = 0; i < WORKER_COUNT; i++) {
            String url = engine.poll();
            if (url == null) {
                break;
            }
            batch.add(url);
        }
        return batch;
    }

    private ProcessOutcome processUrl(String url, CrawlEngine engine, CrawlJob job,
                                       UrlFilterStrategy filterStrategy, WebCrawlerRepository targetRepository) {
        if (engine.getPagesFetched() >= job.getMaxPages()) {
            return ProcessOutcome.CAPPED;
        }
        // Atomic claim -- ConcurrentHashMap#putIfAbsent, not containsKey()+put(), which would be
        // a check-then-act race letting two workers both fetch the same URL.
        if (!engine.claimUrl(url)) {
            return ProcessOutcome.DEDUPED;
        }

        String domain = UrlUtils.extractDomain(url);
        ReentrantLock domainLock = engine.domainLockFor(domain);
        boolean politenessOk;
        domainLock.lock();
        try {
            Long lastFetch = engine.getLastFetchTime(domain);
            long now = System.currentTimeMillis();
            politenessOk = lastFetch == null || now - lastFetch >= POLITENESS_WINDOW_MILLIS;
            if (politenessOk) {
                // The check and the update happen under the same lock -- a second worker for this
                // domain can only observe the update after this one has fully committed to it.
                engine.recordFetchTime(domain, now);
            }
        } finally {
            domainLock.unlock();
        }

        if (!politenessOk) {
            // Too soon after this domain's last fetch. Release the claim and re-queue for a
            // later wave rather than blocking this worker thread on a real sleep.
            engine.unclaim(url);
            engine.offer(url);
            return ProcessOutcome.POLITENESS_DEFERRED;
        }

        Page page = fetcher.fetch(url, job.getId());
        targetRepository.savePage(page);
        engine.incrementAndGetPagesFetched();

        for (String link : page.getLinks()) {
            if (!engine.isClaimed(link) && filterStrategy.isAllowed(link, engine.getSeedDomains())) {
                engine.offer(link);
            }
        }
        return ProcessOutcome.FETCHED;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE
    // =========================================================================

    public final synchronized void initSimState() {
        simRepository.reset();
        simEventLog.clear();
        logSimEvent("SIM_RESET", "System", "Sandbox reset -- no active crawl job", null);
    }

    public Map<String, Object> simSeed(List<String> seedUrls, int maxPages, UrlFilterPolicy filterPolicy) {
        validateSeedUrls(seedUrls, maxPages);
        String jobId = "SIM-JOB-" + simJobIdGen.getAndIncrement();
        CrawlJob job = seedJob(simRepository, jobId, seedUrls, maxPages, filterPolicy);
        logSimEvent("SEEDED", "System", String.format(
                "Seeded job %s with %d URL(s), maxPages=%d, policy=%s", jobId, seedUrls.size(), maxPages, filterPolicy), null);
        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("jobId", jobId);
        return snapshot;
    }

    /** Runs exactly one wave (a batch of concurrently-processed URLs) for step-by-step UI playback. */
    public Map<String, Object> simDispatchWave(String jobId) {
        CrawlJob job = simRepository.getJob(jobId);
        CrawlEngine engine = simRepository.getEngine(jobId);
        UrlFilterStrategy filterStrategy = filterStrategyFactory.forPolicy(job.getFilterPolicy());

        if (job.getStatus() == CrawlJobStatus.PENDING) {
            job.setStatus(CrawlJobStatus.RUNNING);
            simRepository.saveJob(job);
        }

        if (job.getStatus() != CrawlJobStatus.COMPLETED
                && engine.getPagesFetched() < job.getMaxPages() && !engine.isFrontierEmpty()) {
            ExecutorService executor = Executors.newFixedThreadPool(WORKER_COUNT);
            try {
                runWave(engine, job, filterStrategy, simRepository, executor, simEventLog);
            } finally {
                executor.shutdown();
            }
        }

        job.setPagesFetched(engine.getPagesFetched());
        if (engine.getPagesFetched() >= job.getMaxPages() || engine.isFrontierEmpty()) {
            job.setStatus(CrawlJobStatus.COMPLETED);
            logSimEvent("JOB_COMPLETE", "System", String.format(
                    "Job %s completed -- %d page(s) fetched", jobId, engine.getPagesFetched()), null);
        }
        simRepository.saveJob(job);
        return getSimSnapshots();
    }

    /**
     * Live demonstration of the URL-dedup race: {@code workerCount} threads all race to claim the
     * exact same URL. Not {@code synchronized} -- a method-level lock here would serialize every
     * worker before any of them reached {@link CrawlEngine#claimUrl}, and the race this module
     * exists to demonstrate would never actually happen.
     */
    public Map<String, Object> simRace(String url, int workerCount) throws InterruptedException {
        Set<String> seedDomains = Set.of(UrlUtils.extractDomain(url));
        CrawlEngine engine = new CrawlEngine(seedDomains);
        CrawlJob raceJob = CrawlJob.builder()
                .id("SIM-RACE")
                .seedUrls(List.of(url))
                .maxPages(Integer.MAX_VALUE)
                .filterPolicy(UrlFilterPolicy.ALLOW_ALL)
                .status(CrawlJobStatus.RUNNING)
                .pagesFetched(0)
                .createdAtEpoch(System.currentTimeMillis())
                .build();
        UrlFilterStrategy filterStrategy = filterStrategyFactory.forPolicy(UrlFilterPolicy.ALLOW_ALL);
        simRepository.saveJob(raceJob);

        ExecutorService executor = Executors.newFixedThreadPool(workerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(workerCount);
        AtomicInteger fetched = new AtomicInteger(0);
        AtomicInteger deduped = new AtomicInteger(0);

        for (int i = 0; i < workerCount; i++) {
            String workerId = "RaceWorker-" + (i + 1);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    ProcessOutcome outcome = processUrl(url, engine, raceJob, filterStrategy, simRepository);
                    if (outcome == ProcessOutcome.FETCHED) {
                        fetched.incrementAndGet();
                        logSimEvent("CLAIM_WON", workerId, workerId + " won the claim race for " + url, null);
                    } else {
                        deduped.incrementAndGet();
                        logSimEvent("CLAIM_LOST", workerId, workerId + " lost the claim race for " + url + " (already visited)", null);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        raceJob.setStatus(CrawlJobStatus.COMPLETED);
        raceJob.setPagesFetched(engine.getPagesFetched());
        simRepository.saveJob(raceJob);

        Map<String, Object> details = new HashMap<>();
        details.put("workers", workerCount);
        details.put("fetched", fetched.get());
        details.put("deduped", deduped.get());
        logSimEvent("RACE_COMPLETE", "System", String.format(
                "%d workers raced for %s -- %d fetched, %d deduped", workerCount, url, fetched.get(), deduped.get()), details);

        Map<String, Object> snapshot = getSimSnapshots();
        snapshot.put("raceResult", details);
        return snapshot;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("jobs", simRepository.getAllJobs());
        List<Page> allPages = simRepository.getAllJobs().stream()
                .flatMap(j -> simRepository.getPagesForJob(j.getId()).stream())
                .collect(Collectors.toList());
        res.put("pages", allPages);
        res.put("events", simEventLog);
        return res;
    }

    private String outcomeEventType(ProcessOutcome outcome) {
        return switch (outcome) {
            case FETCHED -> "FETCHED";
            case DEDUPED -> "DEDUPED";
            case POLITENESS_DEFERRED -> "POLITENESS_DEFERRED";
            case CAPPED -> "CAPPED";
        };
    }

    private String outcomeDescription(ProcessOutcome outcome, String url) {
        return switch (outcome) {
            case FETCHED -> "Fetched " + url;
            case DEDUPED -> "Skipped " + url + " -- already claimed by another worker";
            case POLITENESS_DEFERRED -> "Deferred " + url + " -- domain fetched too recently, re-queued";
            case CAPPED -> "Skipped " + url + " -- maxPages already reached";
        };
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }
}
