package com.lld.kvstore.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single stored value. {@code version} starts at 1 on a key's first SET and increments by
 * exactly 1 on every successful write (SET or a winning CAS) to that key — the field the
 * optimistic-concurrency CAS race hinges on. {@code expiresAtEpoch} is {@code null} for an
 * entry with no TTL.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KvEntry {
    private String value;
    private long version;
    private Long expiresAtEpoch;
}
