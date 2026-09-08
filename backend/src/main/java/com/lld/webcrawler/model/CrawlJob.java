package com.lld.webcrawler.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrawlJob {
    private String id;
    private List<String> seedUrls;
    private int maxPages;
    private UrlFilterPolicy filterPolicy;
    private CrawlJobStatus status;
    private int pagesFetched;
    private long createdAtEpoch;
}
