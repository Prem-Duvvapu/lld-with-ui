package com.lld.auction.observer;

import org.springframework.stereotype.Component;

/** Writes every outbid event to the server log — demonstrates that two observers with completely
 *  different sinks receive the same event without knowing each other exists. */
@Component
public class LoggingAuctionObserver implements AuctionObserver {

    @Override
    public void onOutbid(OutbidEvent event) {
        System.out.printf("[auction-outbid] auction #%d (%s): %s outbid by %s — %.2f -> %.2f%n",
                event.getAuctionId(), event.getItemName(), event.getPreviousBidderName(),
                event.getNewBidderName(), event.getPreviousAmount(), event.getNewAmount());
    }
}
