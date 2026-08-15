package com.lld.stockbroker.strategy;

import com.lld.stockbroker.model.*;

import java.util.List;
import java.util.Map;

public interface OrderExecutionStrategy {
    List<Trade> execute(Order order, OrderBook book, Map<String, Account> accounts, Stock stock);
}
