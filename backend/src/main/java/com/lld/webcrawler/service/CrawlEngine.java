package com.lld.webcrawler.service;

import com.lld.webcrawler.util.UrlUtils;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Per-job working state for a single crawl — plain object, not a Spring bean, since a fresh
 * instance is created for every {@code CrawlJob} (and a second one per {@code /sim/*} run).
 * Not exposed through the API; {@link WebCrawlerService} owns the only references.
 *
 * <p>Two independent races are closed here:
 * <ul>
 *   <li><b>URL dedup</b> — naive "if not in visited, add and fetch" is a check-then-act race
 *   where two workers can both check before either adds. {@link #claimUrl} closes it with a
 *   single atomic {@code ConcurrentHashMap.putIfAbsent} rather than a separate
 *   {@code containsKey} + {@code put}.</li>
 *   <li><b>Per-domain politeness</b> — two workers assigned URLs from the same domain must not
 *   both fetch inside the politeness window. {@link #domainLockFor} hands out one
 *   {@link ReentrantLock} per domain (lazily, via {@code computeIfAbsent}) that the caller holds
 *   across the whole "check {@code lastFetchTime}, then update it" sequence.</li>
 * </ul>
 */
public class CrawlEngine {

    private final LinkedBlockingQueue<String> frontier = new LinkedBlockingQueue<>();
    private final ConcurrentHashMap<String, Boolean> visited = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ReentrantLock> domainLocks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> lastFetchTimeByDomain = new ConcurrentHashMap<>();
    private final AtomicInteger pagesFetched = new AtomicInteger(0);
    private final Set<String> seedDomains;

    public CrawlEngine(Set<String> seedDomains) {
        this.seedDomains = seedDomains;
    }

    public void offer(String url) {
        frontier.offer(url);
    }

    public String poll() {
        return frontier.poll();
    }

    public boolean isFrontierEmpty() {
        return frontier.isEmpty();
    }

    /** Atomic claim: true only for the single caller that first claims this URL. */
    public boolean claimUrl(String url) {
        return visited.putIfAbsent(url, Boolean.TRUE) == null;
    }

    public void unclaim(String url) {
        visited.remove(url);
    }

    public boolean isClaimed(String url) {
        return visited.containsKey(url);
    }

    public ReentrantLock domainLockFor(String domain) {
        return domainLocks.computeIfAbsent(domain, d -> new ReentrantLock());
    }

    public Long getLastFetchTime(String domain) {
        return lastFetchTimeByDomain.get(domain);
    }

    public void recordFetchTime(String domain, long epochMillis) {
        lastFetchTimeByDomain.put(domain, epochMillis);
    }

    public int incrementAndGetPagesFetched() {
        return pagesFetched.incrementAndGet();
    }

    public int getPagesFetched() {
        return pagesFetched.get();
    }

    public Set<String> getSeedDomains() {
        return seedDomains;
    }

    public int getVisitedCount() {
        return visited.size();
    }
}
