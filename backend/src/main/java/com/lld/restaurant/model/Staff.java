package com.lld.restaurant.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Staff {
    private String id;
    private String name;
    private StaffRole role;
    @Builder.Default
    private boolean active = true;
}
