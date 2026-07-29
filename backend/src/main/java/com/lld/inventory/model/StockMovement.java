package com.lld.inventory.model;

import java.time.LocalDateTime;

public class StockMovement {
    private long id;
    private long productId;
    private StockMovementType type;
    private int quantity;
    private LocalDateTime timestamp;
    private String reason;
    private String referenceId;

    public enum StockMovementType {
        INBOUND, OUTBOUND, TRANSFER
    }

    public StockMovement() {}

    public StockMovement(long id, long productId, StockMovementType type, int quantity, LocalDateTime timestamp, String reason, String referenceId) {
        this.id = id;
        this.productId = productId;
        this.type = type;
        this.quantity = quantity;
        this.timestamp = timestamp;
        this.reason = reason;
        this.referenceId = referenceId;
    }

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public long getProductId() { return productId; }
    public void setProductId(long productId) { this.productId = productId; }
    public StockMovementType getType() { return type; }
    public void setType(StockMovementType type) { this.type = type; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
}