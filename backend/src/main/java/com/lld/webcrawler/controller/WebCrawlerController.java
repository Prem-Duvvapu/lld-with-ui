package com.lld.webcrawler.controller;

import com.lld.webcrawler.model.CrawlJob;
import com.lld.webcrawler.model.Page;
import com.lld.webcrawler.model.SimEvent;
import com.lld.webcrawler.model.UrlFilterPolicy;
import com.lld.webcrawler.service.WebCrawlerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/webcrawler")
@CrossOrigin(origins = "*")
public class WebCrawlerController {

    private final WebCrawlerService service;

    public WebCrawlerController(WebCrawlerService service) {
        this.service = service;
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/jobs")
    public CrawlJob startCrawl(@RequestBody Map<String, Object> body) {
        List<String> seedUrls = (List<String>) body.get("seedUrls");
        int maxPages = Integer.parseInt(body.get("maxPages").toString());
        UrlFilterPolicy filterPolicy = UrlFilterPolicy.valueOf(body.getOrDefault("filterPolicy", "ALLOW_ALL").toString());
        return service.startCrawl(seedUrls, maxPages, filterPolicy);
    }

    @GetMapping("/jobs")
    public List<CrawlJob> getAllJobs() {
        return service.getAllJobs();
    }

    @GetMapping("/jobs/{jobId}")
    public CrawlJob getJob(@PathVariable String jobId) {
        return service.getJob(jobId);
    }

    @GetMapping("/jobs/{jobId}/pages")
    public List<Page> getPages(@PathVariable String jobId) {
        return service.getPagesForJob(jobId);
    }

    // =========================================================================
    // ISOLATED SIMULATION ENDPOINTS
    // =========================================================================

    @PostMapping("/sim/reset")
    public Map<String, Object> simReset() {
        service.initSimState();
        return service.getSimSnapshots();
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/sim/seed")
    public Map<String, Object> simSeed(@RequestBody Map<String, Object> body) {
        List<String> seedUrls = (List<String>) body.get("seedUrls");
        int maxPages = Integer.parseInt(body.get("maxPages").toString());
        UrlFilterPolicy filterPolicy = UrlFilterPolicy.valueOf(body.getOrDefault("filterPolicy", "ALLOW_ALL").toString());
        return service.simSeed(seedUrls, maxPages, filterPolicy);
    }

    @PostMapping("/sim/{jobId}/dispatch")
    public Map<String, Object> simDispatchWave(@PathVariable String jobId) {
        return service.simDispatchWave(jobId);
    }

    @PostMapping("/sim/race")
    public Map<String, Object> simRace(@RequestBody Map<String, Object> body) throws InterruptedException {
        String url = body.get("url").toString();
        int workerCount = Integer.parseInt(body.getOrDefault("workerCount", "6").toString());
        return service.simRace(url, workerCount);
    }

    @GetMapping("/sim/events")
    public List<SimEvent> simGetEvents() {
        return service.getSimEvents();
    }

    @GetMapping("/sim/snapshot")
    public Map<String, Object> simGetSnapshot() {
        return service.getSimSnapshots();
    }
}
