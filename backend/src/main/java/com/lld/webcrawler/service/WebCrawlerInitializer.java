package com.lld.webcrawler.service;

import com.lld.webcrawler.model.UrlFilterPolicy;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Seeds a completed demo crawl so the UI shows something meaningful on first load. */
@Component
public class WebCrawlerInitializer implements CommandLineRunner {

    private final WebCrawlerService crawlerService;

    public WebCrawlerInitializer(WebCrawlerService crawlerService) {
        this.crawlerService = crawlerService;
    }

    @Override
    public void run(String... args) {
        crawlerService.startCrawl(
                List.of("http://news.example.com", "http://blog.example.com"),
                6,
                UrlFilterPolicy.ALLOW_ALL);
    }
}
