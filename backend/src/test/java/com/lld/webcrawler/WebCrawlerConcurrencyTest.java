package com.lld.webcrawler;

import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.model.UrlFilterPolicy;
import com.lld.webcrawler.repository.WebCrawlerRepository;
import com.lld.webcrawler.service.PageFetcher;
import com.lld.webcrawler.service.WebCrawlerService;
import com.lld.webcrawler.strategy.AllowAllStrategy;
import com.lld.webcrawler.strategy.DomainAllowlistStrategy;
import com.lld.webcrawler.strategy.RespectRobotsTxtStrategy;
import com.lld.webcrawler.strategy.UrlFilterStrategyFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves {@code WebCrawlerService#processUrl}'s two independent race fixes actually close the
 * check-then-act bugs the module is built around:
 * <ul>
 *   <li>Naive "if not visited, add and fetch" lets two workers both check before either adds,
 *   fetching the same URL twice. The fix is an atomic {@code ConcurrentHashMap.putIfAbsent}
 *   claim.</li>
 *   <li>Naive "if enough time has passed, fetch" (checked and updated as two separate steps)
 *   lets two workers assigned different URLs on the same domain both slip inside the politeness
 *   window. The fix is a per-domain {@code ReentrantLock} held across the whole
 *   check-then-update sequence.</li>
 * </ul>
 * A single {@code startCrawl} call already drives real concurrency: internally it submits a
 * whole wave of frontier URLs to a fixed worker pool at once, so seeding a job with duplicate
 * URLs and same-domain siblings puts genuine racing workers on the same contested state.
 */
public class WebCrawlerConcurrencyTest {

    private static WebCrawlerService newService() {
        UrlFilterStrategyFactory factory = new UrlFilterStrategyFactory(
                new AllowAllStrategy(), new RespectRobotsTxtStrategy(), new DomainAllowlistStrategy());
        return new WebCrawlerService(new WebCrawlerRepository(), factory, new PageFetcher());
    }

    @Test
    @DisplayName("Repeated dedup + politeness race: exactly one winner per domain, 300 rounds")
    void repeatedDedupAndPolitenessRaceNeverProducesADoubleFetch() {
        for (int round = 0; round < 300; round++) {
            WebCrawlerService service = newService();

            // Domain A: the exact same URL seeded twice -- a pure dedup race.
            // Domain B: two DIFFERENT URLs on the same domain -- a pure politeness race.
            CrawlJob job = service.startCrawl(List.of(
                    "http://a.com/p", "http://a.com/p",
                    "http://b.com/p1", "http://b.com/p2"
            ), 2, UrlFilterPolicy.ALLOW_ALL);

            List<Page> pages = service.getPagesForJob(job.getId());
            assertEquals(2, pages.size(), "round " + round + ": exactly one page per domain must be fetched");

            Map<String, Long> pagesByDomain = pages.stream()
                    .collect(Collectors.groupingBy(Page::getDomain, Collectors.counting()));
            assertEquals(Set.of("a.com", "b.com"), pagesByDomain.keySet(), "round " + round + ": both domains must be represented");
            assertEquals(1L, pagesByDomain.get("a.com"), "round " + round + ": domain a.com must never be fetched twice within the politeness window");
            assertEquals(1L, pagesByDomain.get("b.com"), "round " + round + ": domain b.com must never be fetched twice within the politeness window");

            long distinctUrls = pages.stream().map(Page::getUrl).distinct().count();
            assertEquals(pages.size(), distinctUrls, "round " + round + ": no URL may ever be fetched twice");
        }
    }

    @Test
    @DisplayName("N workers racing the same URL through the live sim engine: exactly one wins")
    void simRaceOnSameUrlAlwaysHasExactlyOneWinner() throws InterruptedException {
        WebCrawlerService service = newService();
        int workerCount = 12;

        for (int round = 0; round < 100; round++) {
            service.initSimState();
            Map<String, Object> result = service.simRace("http://race.com/target-" + round, workerCount);

            @SuppressWarnings("unchecked")
            Map<String, Object> raceResult = (Map<String, Object>) result.get("raceResult");
            assertEquals(1, raceResult.get("fetched"), "round " + round + ": exactly one worker must win the claim");
            assertEquals(workerCount - 1, raceResult.get("deduped"), "round " + round + ": every other worker must lose the dedup race");
        }
    }

    @Test
    @DisplayName("Two truly concurrent startCrawl calls on independent jobs never interfere")
    void twoIndependentJobsRunningConcurrentlyStaySeparate() throws InterruptedException {
        WebCrawlerService service = newService();
        int jobCount = 6;

        ExecutorService pool = Executors.newFixedThreadPool(jobCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(jobCount);
        AtomicInteger failures = new AtomicInteger();

        for (int i = 0; i < jobCount; i++) {
            final int idx = i;
            pool.submit(() -> {
                try {
                    start.await();
                    CrawlJob job = service.startCrawl(List.of("http://job" + idx + ".com"), 1, UrlFilterPolicy.ALLOW_ALL);
                    List<Page> pages = service.getPagesForJob(job.getId());
                    if (pages.size() != 1 || !pages.get(0).getDomain().equals("job" + idx + ".com")) {
                        failures.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertTrue(done.await(10, TimeUnit.SECONDS), "race timed out");
        pool.shutdown();

        assertEquals(0, failures.get(), "every independently-run job must fetch exactly its own single page");
        assertEquals(jobCount, service.getAllJobs().size());
    }
}
