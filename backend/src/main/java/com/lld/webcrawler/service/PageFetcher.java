package com.lld.webcrawler.service;

import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.util.UrlUtils;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Deterministic, entirely simulated "fetch" — this module is about the crawl machinery
 * (frontier, dedup, politeness), not real networking. Never issues an outbound HTTP request.
 * Every fetched page deterministically discovers two child links, which is enough to drive the
 * frontier without needing a fake HTML corpus.
 */
@Component
public class PageFetcher {

    public Page fetch(String url, String jobId) {
        String domain = UrlUtils.extractDomain(url);
        String content = "Simulated content for " + url;
        List<String> links = List.of(url + "/child1", url + "/child2");
        return Page.builder()
                .url(url)
                .jobId(jobId)
                .domain(domain)
                .content(content)
                .links(links)
                .fetchedAtEpoch(System.currentTimeMillis())
                .build();
    }
}
