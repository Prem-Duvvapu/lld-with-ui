package com.lld.stockbroker.strategy;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.OrderExecutionException;
import com.lld.stockbroker.model.*;

import java.util.Map;
import java.util.List;
import java.util.Queue;

public interface OrderExecutionStrategy {
    List<Trade> execute(Order order, OrderBook book, Map<String, Account> accounts, Stock stock);

    /**
     * Self-trade prevention (Cancel-Newest policy): rejects the incoming order outright if the
     * best available counter-price on the opposite side of the book is a resting order placed by
     * the same account. Real matching engines guard against wash trading the same way — this is a
     * top-of-book check only (it does not walk every price level), so a self-order resting deeper
     * in the book is still reachable and matched normally, same as a real engine's "check the
     * inside market" fast path.
     */
    default void guardSelfTrade(Order order, OrderBook book) {
        if (order == null || book == null) {
            return;
        }
        Map.Entry<Double, Queue<Order>> bestOpposite = (order.getSide() == OrderSide.BUY)
                ? book.getAsks().firstEntry()
                : book.getBids().firstEntry();
        if (bestOpposite == null) {
            return;
        }

        double bestPrice = bestOpposite.getKey();
        boolean crosses = (order.getType() == OrderType.MARKET)
                || (order.getSide() == OrderSide.BUY ? bestPrice <= order.getLimitPrice() : bestPrice >= order.getLimitPrice());
        if (!crosses) {
            return;
        }

        boolean selfOwned = bestOpposite.getValue().stream()
                .anyMatch(resting -> resting.getRemainingQuantity() > 0
                        && resting.getAccountId().equalsIgnoreCase(order.getAccountId()));
        if (selfOwned) {
            throw new OrderExecutionException("Self-trade prevented: account " + order.getAccountId() +
                    " already holds the best resting " + (order.getSide() == OrderSide.BUY ? "ask" : "bid") +
                    " for " + order.getSymbol() + " at the crossing price — order rejected.");
        }
    }
}
