package com.lld.webcrawler;

import com.lld.webcrawler.exception.CrawlJobNotFoundException;
import com.lld.webcrawler.exception.InvalidSeedUrlException;
import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.CrawlJobStatus;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.model.UrlFilterPolicy;
import com.lld.webcrawler.repository.WebCrawlerRepository;
import com.lld.webcrawler.service.PageFetcher;
import com.lld.webcrawler.service.WebCrawlerService;
import com.lld.webcrawler.strategy.AllowAllStrategy;
import com.lld.webcrawler.strategy.DomainAllowlistStrategy;
import com.lld.webcrawler.strategy.RespectRobotsTxtStrategy;
import com.lld.webcrawler.strategy.UrlFilterStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class WebCrawlerServiceTest {

    private WebCrawlerService service;

    @BeforeEach
    void setUp() {
        UrlFilterStrategyFactory factory = new UrlFilterStrategyFactory(
                new AllowAllStrategy(), new RespectRobotsTxtStrategy(), new DomainAllowlistStrategy());
        service = new WebCrawlerService(new WebCrawlerRepository(), factory, new PageFetcher());
    }

    @Test
    void startCrawlFetchesUpToMaxPagesAndCompletesTheJob() {
        CrawlJob job = service.startCrawl(List.of("http://a.com"), 2, UrlFilterPolicy.ALLOW_ALL);

        assertEquals(CrawlJobStatus.COMPLETED, job.getStatus());
        assertEquals(2, job.getPagesFetched());

        List<Page> pages = service.getPagesForJob(job.getId());
        assertEquals(2, pages.size());
    }

    @Test
    void startCrawlNeverFetchesTheSameUrlTwiceEvenWhenSeededWithDuplicates() {
        CrawlJob job = service.startCrawl(List.of("http://a.com/x", "http://a.com/x", "http://a.com/x"), 2, UrlFilterPolicy.ALLOW_ALL);

        List<Page> pages = service.getPagesForJob(job.getId());
        long distinctUrls = pages.stream().map(Page::getUrl).distinct().count();
        assertEquals(pages.size(), distinctUrls, "no URL may ever be fetched twice");
        assertEquals(2, pages.size());
    }

    @Test
    void filterPolicyChosenAtStartIsPreservedOnTheJob() {
        CrawlJob job = service.startCrawl(List.of("http://a.com"), 1, UrlFilterPolicy.DOMAIN_ALLOWLIST);

        assertEquals(UrlFilterPolicy.DOMAIN_ALLOWLIST, job.getFilterPolicy());
    }

    @Test
    void emptySeedListThrowsInvalidSeedUrlException() {
        assertThrows(InvalidSeedUrlException.class, () -> service.startCrawl(List.of(), 5, UrlFilterPolicy.ALLOW_ALL));
    }

    @Test
    void malformedSeedUrlThrowsInvalidSeedUrlException() {
        assertThrows(InvalidSeedUrlException.class, () -> service.startCrawl(List.of(""), 5, UrlFilterPolicy.ALLOW_ALL));
    }

    @Test
    void nonPositiveMaxPagesThrowsInvalidSeedUrlException() {
        assertThrows(InvalidSeedUrlException.class, () -> service.startCrawl(List.of("http://a.com"), 0, UrlFilterPolicy.ALLOW_ALL));
    }

    @Test
    void unknownJobIdThrowsCrawlJobNotFoundException() {
        assertThrows(CrawlJobNotFoundException.class, () -> service.getJob("no-such-job"));
        assertThrows(CrawlJobNotFoundException.class, () -> service.getPagesForJob("no-such-job"));
    }

    @Test
    void simEngineIsFullyIsolatedFromLiveState() {
        service.startCrawl(List.of("http://a.com"), 2, UrlFilterPolicy.ALLOW_ALL);

        Map<String, Object> snapshot = service.simSeed(List.of("http://sim.com"), 1, UrlFilterPolicy.ALLOW_ALL);
        String simJobId = (String) snapshot.get("jobId");
        Map<String, Object> afterDispatch = service.simDispatchWave(simJobId);

        @SuppressWarnings("unchecked")
        List<Page> simPages = (List<Page>) afterDispatch.get("pages");
        assertEquals(1, simPages.size(), "the sim sandbox must only ever see its own crawl");
        assertTrue(simPages.stream().allMatch(p -> p.getDomain().equals("sim.com")));

        // Live jobs are untouched by the sim run above.
        assertEquals(1, service.getAllJobs().size());
    }

    @Test
    void simResetWipesSimStateBackToClean() {
        Map<String, Object> snapshot = service.simSeed(List.of("http://sim.com"), 1, UrlFilterPolicy.ALLOW_ALL);
        service.simDispatchWave((String) snapshot.get("jobId"));

        service.initSimState();

        Map<String, Object> afterReset = service.getSimSnapshots();
        @SuppressWarnings("unchecked")
        List<Page> pages = (List<Page>) afterReset.get("pages");
        assertTrue(pages.isEmpty(), "reset must wipe every previously-crawled sim page");
    }

    @Test
    void simRaceOnASingleUrlFetchesItExactlyOnce() throws InterruptedException {
        Map<String, Object> result = service.simRace("http://race.com/target", 6);

        @SuppressWarnings("unchecked")
        Map<String, Object> raceResult = (Map<String, Object>) result.get("raceResult");
        assertEquals(1, raceResult.get("fetched"));
        assertEquals(5, raceResult.get("deduped"));
    }
}
