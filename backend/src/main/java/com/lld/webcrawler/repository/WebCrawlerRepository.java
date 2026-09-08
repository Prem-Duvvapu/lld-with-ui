package com.lld.webcrawler.repository;

import com.lld.webcrawler.exception.CrawlJobNotFoundException;
import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.service.CrawlEngine;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory store for live crawl state — pure CRUD, the same shape as
 * {@code locker.repository.LockerRepository}. {@code engines} holds each job's internal
 * {@link CrawlEngine}, keyed by job id; it is never returned through the API. No crawl logic or
 * locking lives here — that belongs to {@code WebCrawlerService}, which owns a second,
 * independently constructed instance of this class for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class WebCrawlerRepository {

    private final Map<String, CrawlJob> jobs = new ConcurrentHashMap<>();
    private final Map<String, Page> pages = new ConcurrentHashMap<>();
    private final Map<String, CrawlEngine> engines = new ConcurrentHashMap<>();

    public void reset() {
        jobs.clear();
        pages.clear();
        engines.clear();
    }

    public void saveJob(CrawlJob job) {
        jobs.put(job.getId(), job);
    }

    public CrawlJob getJob(String jobId) {
        CrawlJob job = jobs.get(jobId);
        if (job == null) {
            throw new CrawlJobNotFoundException("Crawl job not found: " + jobId);
        }
        return job;
    }

    public List<CrawlJob> getAllJobs() {
        return new ArrayList<>(jobs.values());
    }

    public void savePage(Page page) {
        pages.put(page.getJobId() + "|" + page.getUrl(), page);
    }

    public List<Page> getPagesForJob(String jobId) {
        return pages.values().stream()
                .filter(p -> p.getJobId().equals(jobId))
                .collect(Collectors.toList());
    }

    public void putEngine(String jobId, CrawlEngine engine) {
        engines.put(jobId, engine);
    }

    public CrawlEngine getEngine(String jobId) {
        return engines.get(jobId);
    }
}
