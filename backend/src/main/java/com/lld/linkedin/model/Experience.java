package com.lld.linkedin.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class Experience {
    private final String id;
    private String title;
    private String company;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isCurrent;
    private String description;

    public Experience(String title, String company, String location, LocalDate startDate, LocalDate endDate, boolean isCurrent, String description) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be null or empty");
        }
        if (company == null || company.trim().isEmpty()) {
            throw new IllegalArgumentException("Company cannot be null or empty");
        }
        if (startDate == null) {
            throw new IllegalArgumentException("Start date cannot be null");
        }
        if (!isCurrent && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
        this.id = UUID.randomUUID().toString();
        this.title = title.trim();
        this.company = company.trim();
        this.location = location != null ? location.trim() : "";
        this.startDate = startDate;
        this.endDate = isCurrent ? null : endDate;
        this.isCurrent = isCurrent;
        this.description = description != null ? description.trim() : "";
    }

    public boolean isCurrent() {
        return isCurrent;
    }

    public void setCurrent(boolean current) {
        isCurrent = current;
        if (current) {
            this.endDate = null;
        }
    }
}
