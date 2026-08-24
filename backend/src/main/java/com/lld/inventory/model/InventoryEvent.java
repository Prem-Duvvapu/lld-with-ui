package com.lld.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Type-safe audit event appended by every live and sim mutation. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryEvent {

    public enum EventType {
        PRODUCT_ADDED, STOCK_MOVED, TRANSFER, LOW_STOCK_ALERT, OUT_OF_STOCK_ALERT,
        RESTOCK_ALERT, REORDER_PLACED, SIM_RACE
    }

    private long id;
    private EventType type;
    private String message;
    private LocalDateTime timestamp;
}
