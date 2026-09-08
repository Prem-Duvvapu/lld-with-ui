package com.lld.payment.fraud;

import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Rejects a charge from a payer id known to be blacklisted. A single no-arg constructor avoids
 *  the "two constructors, neither @Autowired" Spring wiring trap (see RCA-054) entirely. */
@Component
public class BlacklistCheckHandler extends FraudCheckHandler {

    private final Set<String> blacklistedPayerIds = ConcurrentHashMap.newKeySet();

    public BlacklistCheckHandler() {
        blacklistedPayerIds.add("payer-blacklisted-1");
    }

    public void addToBlacklist(String payerId) {
        blacklistedPayerIds.add(payerId);
    }

    @Override
    protected Optional<String> evaluate(FraudCheckContext context) {
        if (blacklistedPayerIds.contains(context.getPayerId())) {
            return Optional.of("Blacklist check failed: payer " + context.getPayerId() + " is blacklisted");
        }
        return Optional.empty();
    }
}
