package com.lld.locker.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A courier-deposited parcel. {@code pickedUpAtEpoch} stays {@code null} until collected. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Parcel {
    private String id;
    private LockerSize size;
    private String courierId;
    private String recipientId;
    private String assignedLockerId;
    private String pickupCode;
    private long depositedAtEpoch;
    private long expiresAtEpoch;
    private Long pickedUpAtEpoch;
}
