package com.lld.shoppingcart.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class User {
    private final String id;
    private final String name;
    private final String email;
    private final String address;
}
