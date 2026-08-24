package com.lld.concertticket.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Venue {
    private long id;
    private String name;
    private String location;
    private int capacity;
    private List<Section> sections;
}
