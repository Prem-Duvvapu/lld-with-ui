package com.lld.coupon.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** What applying a coupon actually did — a response shape, never persisted. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyResult {
    private String code;
    private DiscountType discountType;
    private double originalTotal;
    private double discountedTotal;
}
