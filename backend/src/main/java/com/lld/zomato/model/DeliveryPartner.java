package com.lld.zomato.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryPartner {
    private String id;
    private String name;
    private String phone;
    @Builder.Default
    private boolean available = true;

    public DeliveryPartner(String id, String name, String phone) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.available = true;
    }
}
