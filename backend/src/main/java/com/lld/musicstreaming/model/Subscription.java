package com.lld.musicstreaming.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    @Builder.Default
    private SubscriptionPlan plan = SubscriptionPlan.FREE;
    @Builder.Default
    private boolean active = true;
    @Builder.Default
    private LocalDate startDate = LocalDate.now();
    @Builder.Default
    private LocalDate renewalDate = LocalDate.now().plusMonths(1);
}
