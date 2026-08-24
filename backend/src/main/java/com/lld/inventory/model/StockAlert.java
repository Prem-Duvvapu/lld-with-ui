package com.lld.inventory.model;

import com.lld.inventory.model.StockMovement.StockMovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** One stock-alert event produced by the {@code observer} package. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAlert {

    public enum AlertType { LOW_STOCK, OUT_OF_STOCK, RESTOCKED, REORDER_PLACED }

    private long id;
    private AlertType type;
    private long productId;
    private String sku;
    private String productName;
    private int currentStock;
    private int reorderLevel;
    private int quantityChanged;
    private StockMovementType movementType;
    private String message;
    private LocalDateTime timestamp;
}
