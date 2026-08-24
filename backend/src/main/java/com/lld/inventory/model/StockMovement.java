package com.lld.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovement {

    public enum StockMovementType {
        INBOUND, OUTBOUND, TRANSFER
    }

    private long id;
    private long productId;
    private StockMovementType type;
    private int quantity;
    private LocalDateTime timestamp;
    private String reason;
    private String referenceId;
}
