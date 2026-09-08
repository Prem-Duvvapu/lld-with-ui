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
public class Page {
    private String url;
    private String jobId;
    private String domain;
    private String content;
    private List<String> links;
    private long fetchedAtEpoch;
}
