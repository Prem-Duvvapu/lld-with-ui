package com.lld.vendingmachine.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    private long id;
    private String code;
    private String name;
    private double price;
    private String category;
    private String emoji;
}
