package com.lld.auction.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A registered auction participant. Can bid on any auction and can be outbid on any auction —
 *  there is no seller/bidder role split in this module, matching the original implementation. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bidder {
    private long id;
    private String name;
    private String email;
}
