package com.lld.stockbroker.strategy;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.model.*;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class MarketExecutionStrategy implements OrderExecutionStrategy {

    private final AtomicLong tradeIdGen = new AtomicLong(5001);

    @Override
    public List<Trade> execute(Order order, OrderBook book, Map<String, Account> accounts, Stock stock) {
        List<Trade> trades = new ArrayList<>();
        if (order == null || book == null || order.getRemainingQuantity() <= 0) {
            return trades;
        }

        double oldStockPrice = stock != null ? stock.getCurrentPrice() : 100.0;
        double lastExecPrice = oldStockPrice;
        int totalExecVolume = 0;

        if (order.getSide() == OrderSide.BUY) {
            // Market Buy matches against Asks in ascending price order
            NavigableMap<Double, Queue<Order>> asks = book.getAsks();
            Iterator<Map.Entry<Double, Queue<Order>>> askIterator = asks.entrySet().iterator();

            while (askIterator.hasNext() && order.getRemainingQuantity() > 0) {
                Map.Entry<Double, Queue<Order>> entry = askIterator.next();
                double askPrice = entry.getKey();
                Queue<Order> queue = entry.getValue();

                while (!queue.isEmpty() && order.getRemainingQuantity() > 0) {
                    Order restingSell = queue.peek();
                    int matchQty = Math.min(order.getRemainingQuantity(), restingSell.getRemainingQuantity());
                    double execPrice = askPrice;

                    settleTrade(order.getAccountId(), restingSell.getAccountId(), order.getSymbol(),
                            execPrice, restingSell.getLimitPrice(), matchQty, accounts);

                    order.fill(matchQty);
                    restingSell.fill(matchQty);

                    Trade trade = new Trade("TRD-" + tradeIdGen.getAndIncrement(), order.getSymbol(),
                            order.getOrderId(), restingSell.getOrderId(),
                            order.getAccountId(), restingSell.getAccountId(),
                            execPrice, matchQty);
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

            // If Market order could not be fully filled, release unexecuted funds
            if (order.getRemainingQuantity() > 0) {
                Account buyer = accounts.get(order.getAccountId());
                if (buyer != null) {
                    // Release reserved funds for unfilled quantity
                    buyer.releaseReservedFunds(order.getRemainingQuantity() * oldStockPrice);
                }
                if (order.getFilledQuantity() == 0) {
                    order.setStatus(OrderStatus.REJECTED);
                }
            }
        } else {
            // Market Sell matches against Bids in descending price order
            NavigableMap<Double, Queue<Order>> bids = book.getBids();
            Iterator<Map.Entry<Double, Queue<Order>>> bidIterator = bids.entrySet().iterator();

            while (bidIterator.hasNext() && order.getRemainingQuantity() > 0) {
                Map.Entry<Double, Queue<Order>> entry = bidIterator.next();
                double bidPrice = entry.getKey();
                Queue<Order> queue = entry.getValue();

                while (!queue.isEmpty() && order.getRemainingQuantity() > 0) {
                    Order restingBuy = queue.peek();
                    int matchQty = Math.min(order.getRemainingQuantity(), restingBuy.getRemainingQuantity());
                    double execPrice = bidPrice;

                    settleTrade(restingBuy.getAccountId(), order.getAccountId(), order.getSymbol(),
                            execPrice, restingBuy.getLimitPrice(), matchQty, accounts);

                    order.fill(matchQty);
                    restingBuy.fill(matchQty);

                    Trade trade = new Trade("TRD-" + tradeIdGen.getAndIncrement(), order.getSymbol(),
                            restingBuy.getOrderId(), order.getOrderId(),
                            restingBuy.getAccountId(), order.getAccountId(),
                            execPrice, matchQty);
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

            // Release remaining reserved shares if unfilled
            if (order.getRemainingQuantity() > 0) {
                Account seller = accounts.get(order.getAccountId());
                if (seller != null) {
                    seller.getPortfolio().releaseReservedShares(order.getSymbol(), order.getRemainingQuantity());
                }
                if (order.getFilledQuantity() == 0) {
                    order.setStatus(OrderStatus.REJECTED);
                }
            }
        }

        if (!trades.isEmpty() && stock != null) {
            stock.notifyPriceUpdate(oldStockPrice, lastExecPrice, totalExecVolume);
        }

        return trades;
    }

    private void settleTrade(String buyerAccountId, String sellerAccountId, String symbol,
                             double execPrice, double restingLimitPrice,
                             int quantity, Map<String, Account> accounts) {
        Account buyer = accounts.get(buyerAccountId);
        Account seller = accounts.get(sellerAccountId);

        double totalCost = execPrice * quantity;

        if (buyer != null) {
            buyer.settleBuy(totalCost, totalCost);
            buyer.getPortfolio().executeBuy(symbol, quantity, execPrice);
        }

        if (seller != null) {
            seller.settleSell(totalCost);
            seller.getPortfolio().executeSell(symbol, quantity);
        }
    }
}
