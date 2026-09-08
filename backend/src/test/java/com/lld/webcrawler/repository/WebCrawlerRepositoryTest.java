package com.lld.webcrawler.repository;

import com.lld.webcrawler.exception.CrawlJobNotFoundException;
import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.CrawlJobStatus;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.model.UrlFilterPolicy;
import com.lld.webcrawler.service.CrawlEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class WebCrawlerRepositoryTest {

    private WebCrawlerRepository repository;

    @BeforeEach
    void setUp() {
        repository = new WebCrawlerRepository();
    }

    @Test
    void unknownJobThrowsCrawlJobNotFoundException() {
        assertThrows(CrawlJobNotFoundException.class, () -> repository.getJob("nope"));
    }

    @Test
    void saveAndGetJobRoundTrips() {
        CrawlJob job = CrawlJob.builder().id("JOB-1").seedUrls(List.of("http://a.com")).maxPages(5)
                .filterPolicy(UrlFilterPolicy.ALLOW_ALL).status(CrawlJobStatus.PENDING).build();
        repository.saveJob(job);

        assertEquals(job, repository.getJob("JOB-1"));
    }

    @Test
    void getPagesForJobFiltersByJobIdOnly() {
        repository.savePage(Page.builder().url("http://a.com").jobId("JOB-1").domain("a.com").links(List.of()).build());
        repository.savePage(Page.builder().url("http://b.com").jobId("JOB-1").domain("b.com").links(List.of()).build());
        repository.savePage(Page.builder().url("http://c.com").jobId("JOB-2").domain("c.com").links(List.of()).build());

        assertEquals(2, repository.getPagesForJob("JOB-1").size());
        assertEquals(1, repository.getPagesForJob("JOB-2").size());
    }

    @Test
    void engineIsStoredAndRetrievedPerJob() {
        CrawlEngine engine = new CrawlEngine(Set.of("a.com"));
        repository.putEngine("JOB-1", engine);

        assertSame(engine, repository.getEngine("JOB-1"));
        assertNull(repository.getEngine("no-such-job"));
    }

    @Test
    void resetWipesEverything() {
        repository.saveJob(CrawlJob.builder().id("JOB-1").status(CrawlJobStatus.PENDING).build());
        repository.savePage(Page.builder().url("http://a.com").jobId("JOB-1").domain("a.com").links(List.of()).build());
        repository.putEngine("JOB-1", new CrawlEngine(Set.of("a.com")));

        repository.reset();

        assertTrue(repository.getAllJobs().isEmpty());
        assertTrue(repository.getPagesForJob("JOB-1").isEmpty());
        assertNull(repository.getEngine("JOB-1"));
    }
}
