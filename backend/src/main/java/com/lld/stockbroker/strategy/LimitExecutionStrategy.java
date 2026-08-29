package com.lld.stockbroker.strategy;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.model.*;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class LimitExecutionStrategy implements OrderExecutionStrategy {

    private final AtomicLong tradeIdGen = new AtomicLong(1001);

    @Override
    public List<Trade> execute(Order order, OrderBook book, Map<String, Account> accounts, Stock stock) {
        List<Trade> trades = new ArrayList<>();
        if (order == null || book == null || order.getRemainingQuantity() <= 0) {
            return trades;
        }
        guardSelfTrade(order, book);

        double oldStockPrice = stock != null ? stock.getCurrentPrice() : order.getLimitPrice();
        double lastExecPrice = oldStockPrice;
        int totalExecVolume = 0;

        if (order.getSide() == OrderSide.BUY) {
            // Match against Asks (lowest price first)
            NavigableMap<Double, Queue<Order>> asks = book.getAsks();
            Iterator<Map.Entry<Double, Queue<Order>>> askIterator = asks.entrySet().iterator();

            while (askIterator.hasNext() && order.getRemainingQuantity() > 0) {
                Map.Entry<Double, Queue<Order>> entry = askIterator.next();
                double askPrice = entry.getKey();

                // Stop if lowest ask is higher than buyer's limit price
                if (askPrice > order.getLimitPrice()) {
                    break;
                }

                Queue<Order> queue = entry.getValue();
                while (!queue.isEmpty() && order.getRemainingQuantity() > 0) {
                    Order restingSell = queue.peek();
                    int matchQty = Math.min(order.getRemainingQuantity(), restingSell.getRemainingQuantity());
                    double execPrice = askPrice; // Maker price priority

                    // Settle financial accounts
                    settleTrade(order.getAccountId(), restingSell.getAccountId(), order.getSymbol(),
                            execPrice, order.getLimitPrice(), restingSell.getLimitPrice(), matchQty, accounts);

                    order.fill(matchQty);
                    restingSell.fill(matchQty);

                    Trade trade = Trade.builder()
                            .tradeId("TRD-" + tradeIdGen.getAndIncrement())
                            .symbol(order.getSymbol())
                            .buyOrderId(order.getOrderId())
                            .sellOrderId(restingSell.getOrderId())
                            .buyerAccountId(order.getAccountId())
                            .sellerAccountId(restingSell.getAccountId())
                            .price(execPrice)
                            .quantity(matchQty)
                            .build();
                    trades.add(trade);
                    book.recordTrade(trade);

                    lastExecPrice = execPrice;
                    totalExecVolume += matchQty;

                    if (restingSell.getRemainingQuantity() == 0) {
                        queue.poll();
                    }
                }

                if (queue.isEmpty()) {
                    askIterator.remove();
                }
            }

            // If quantity remains, rest in the OrderBook Bids
            if (order.getRemainingQuantity() > 0) {
                book.addRestingOrder(order);
            }
        } else {
            // Sell Order matches against Bids (highest price first)
            NavigableMap<Double, Queue<Order>> bids = book.getBids();
            Iterator<Map.Entry<Double, Queue<Order>>> bidIterator = bids.entrySet().iterator();

            while (bidIterator.hasNext() && order.getRemainingQuantity() > 0) {
                Map.Entry<Double, Queue<Order>> entry = bidIterator.next();
                double bidPrice = entry.getKey();

                // Stop if highest bid is lower than seller's limit price
                if (bidPrice < order.getLimitPrice()) {
                    break;
                }

                Queue<Order> queue = entry.getValue();
                while (!queue.isEmpty() && order.getRemainingQuantity() > 0) {
                    Order restingBuy = queue.peek();
                    int matchQty = Math.min(order.getRemainingQuantity(), restingBuy.getRemainingQuantity());
                    double execPrice = bidPrice; // Maker price priority

                    // Settle financial accounts
                    settleTrade(restingBuy.getAccountId(), order.getAccountId(), order.getSymbol(),
                            execPrice, restingBuy.getLimitPrice(), order.getLimitPrice(), matchQty, accounts);

                    order.fill(matchQty);
                    restingBuy.fill(matchQty);

                    Trade trade = Trade.builder()
                            .tradeId("TRD-" + tradeIdGen.getAndIncrement())
                            .symbol(order.getSymbol())
                            .buyOrderId(restingBuy.getOrderId())
                            .sellOrderId(order.getOrderId())
                            .buyerAccountId(restingBuy.getAccountId())
                            .sellerAccountId(order.getAccountId())
                            .price(execPrice)
                            .quantity(matchQty)
                            .build();
                    trades.add(trade);
                    book.recordTrade(trade);

                    lastExecPrice = execPrice;
                    totalExecVolume += matchQty;

                    if (restingBuy.getRemainingQuantity() == 0) {
                        queue.poll();
                    }
                }

                if (queue.isEmpty()) {
                    bidIterator.remove();
                }
            }

            // If quantity remains, rest in the OrderBook Asks
            if (order.getRemainingQuantity() > 0) {
                book.addRestingOrder(order);
            }
        }

        // Notify observers if trades executed
        if (!trades.isEmpty() && stock != null) {
            stock.notifyPriceUpdate(oldStockPrice, lastExecPrice, totalExecVolume);
        }

        return trades;
    }

    private void settleTrade(String buyerAccountId, String sellerAccountId, String symbol,
                             double execPrice, double buyerLimitPrice, double sellerLimitPrice,
                             int quantity, Map<String, Account> accounts) {
        Account buyer = accounts.get(buyerAccountId);
        Account seller = accounts.get(sellerAccountId);

        double totalCost = execPrice * quantity;
        double reservedCostToRelease = (buyerLimitPrice > 0 ? buyerLimitPrice : execPrice) * quantity;

        if (buyer != null) {
            buyer.settleBuy(totalCost, reservedCostToRelease);
            buyer.getPortfolio().executeBuy(symbol, quantity, execPrice);
        }

        if (seller != null) {
            seller.settleSell(totalCost);
            seller.getPortfolio().executeSell(symbol, quantity);
        }
    }
}
