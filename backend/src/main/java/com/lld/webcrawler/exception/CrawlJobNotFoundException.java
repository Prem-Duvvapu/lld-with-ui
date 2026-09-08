package com.lld.webcrawler.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class CrawlJobNotFoundException extends WebCrawlerException {
    public CrawlJobNotFoundException(String message) {
        super(message);
    }
}
