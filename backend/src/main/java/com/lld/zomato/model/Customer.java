package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Customer {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String deliveryAddress;
}
