package com.lld.locker.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A named physical location holding many {@link Locker}s. Pure metadata — no lock of its own. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LockerBank {
    private String id;
    private String name;
    private String location;
}
