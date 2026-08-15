package com.lld.stockbroker.service;

import com.lld.stockbroker.enums.OrderSide;
import com.lld.stockbroker.enums.OrderStatus;
import com.lld.stockbroker.enums.OrderType;
import com.lld.stockbroker.exception.AccountNotFoundException;
import com.lld.stockbroker.exception.InvalidOrderException;
import com.lld.stockbroker.exception.StockNotFoundException;
import com.lld.stockbroker.factory.OrderFactory;
import com.lld.stockbroker.model.*;
import com.lld.stockbroker.observer.InAppPriceObserver;
import com.lld.stockbroker.observer.LoggingPriceObserver;
import com.lld.stockbroker.strategy.LimitExecutionStrategy;
import com.lld.stockbroker.strategy.MarketExecutionStrategy;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class StockBrokerService {

    private static volatile StockBrokerService instance;

    // Repositories
    private final Map<String, Stock> stocks = new ConcurrentHashMap<>();
    private final Map<String, Account> accounts = new ConcurrentHashMap<>();
    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, OrderBook> orderBooks = new ConcurrentHashMap<>();
    private final Map<String, Order> ordersById = new ConcurrentHashMap<>();
    private final Map<String, ReentrantLock> symbolLocks = new ConcurrentHashMap<>();
    private final AtomicLong orderIdGen = new AtomicLong(1001);

    private final MarketExecutionStrategy marketStrategy;
    private final LimitExecutionStrategy limitStrategy;
    private final InAppPriceObserver inAppPriceObserver;
    private final LoggingPriceObserver loggingPriceObserver;

    // Simulation Sandbox State
    private final Map<String, Stock> simStocks = new ConcurrentHashMap<>();
    private final Map<String, Account> simAccounts = new ConcurrentHashMap<>();
    private final Map<String, OrderBook> simOrderBooks = new ConcurrentHashMap<>();
    private final Map<String, Order> simOrdersById = new ConcurrentHashMap<>();
    private final List<SimEvent> simEventLog = new CopyOnWriteArrayList<>();
    private final AtomicLong simEventIdGen = new AtomicLong(1);
    private final AtomicLong simOrderIdGen = new AtomicLong(7001);

    public StockBrokerService(MarketExecutionStrategy marketStrategy,
                              LimitExecutionStrategy limitStrategy,
                              InAppPriceObserver inAppPriceObserver,
                              LoggingPriceObserver loggingPriceObserver) {
        this.marketStrategy = marketStrategy != null ? marketStrategy : new MarketExecutionStrategy();
        this.limitStrategy = limitStrategy != null ? limitStrategy : new LimitExecutionStrategy();
        this.inAppPriceObserver = inAppPriceObserver != null ? inAppPriceObserver : new InAppPriceObserver();
        this.loggingPriceObserver = loggingPriceObserver != null ? loggingPriceObserver : new LoggingPriceObserver();

        initDefaultData();
        simReset();
    }

    public static StockBrokerService getInstance() {
        if (instance == null) {
            synchronized (StockBrokerService.class) {
                if (instance == null) {
                    instance = new StockBrokerService(new MarketExecutionStrategy(), new LimitExecutionStrategy(),
                            new InAppPriceObserver(), new LoggingPriceObserver());
                }
            }
        }
        return instance;
    }

    private ReentrantLock getLockForSymbol(String symbol) {
        return symbolLocks.computeIfAbsent(symbol.toUpperCase(), k -> new ReentrantLock(true));
    }

    // =========================================================================
    // STOCK & ACCOUNT MANAGEMENT
    // =========================================================================

    public Stock registerStock(String symbol, String name, double initialPrice) {
        String sym = symbol.toUpperCase().trim();
        Stock stock = new Stock(sym, name, initialPrice);
        stock.registerObserver(inAppPriceObserver);
        stock.registerObserver(loggingPriceObserver);

        stocks.put(sym, stock);
        orderBooks.put(sym, new OrderBook(sym));
        return stock;
    }

    public Account createAccount(String userId, String name, String email, double initialDeposit) {
        String accountId = "ACC-" + userId;
        Account account = new Account(accountId, userId, initialDeposit);
        User user = new User(userId, name, email, accountId);

        accounts.put(accountId, account);
        users.put(userId, user);
        return account;
    }

    public Stock getStock(String symbol) {
        Stock s = stocks.get(symbol.toUpperCase().trim());
        if (s == null) {
            throw new StockNotFoundException("Stock not found with symbol: " + symbol);
        }
        return s;
    }

    public Account getAccount(String accountId) {
        Account a = accounts.get(accountId);
        if (a == null) {
            throw new AccountNotFoundException("Account not found: " + accountId);
        }
        return a;
    }

    public List<Stock> getAllStocks() {
        return new ArrayList<>(stocks.values());
    }

    public OrderBook getOrderBook(String symbol) {
        OrderBook ob = orderBooks.get(symbol.toUpperCase().trim());
        if (ob == null) {
            throw new StockNotFoundException("Order book not found for symbol: " + symbol);
        }
        return ob;
    }

    public List<Order> getAccountOrders(String accountId) {
        return ordersById.values().stream()
                .filter(o -> o.getAccountId().equalsIgnoreCase(accountId))
                .sorted(Comparator.comparing(Order::getCreatedAt).reversed())
                .toList();
    }

    // =========================================================================
    // ORDER EXECUTION & MATCHING ENGINE
    // =========================================================================

    public Order placeOrder(String accountId, String symbol, OrderSide side, OrderType type, double price, int quantity) {
        String sym = symbol.toUpperCase().trim();
        Stock stock = getStock(sym);
        Account account = getAccount(accountId);
        OrderBook book = getOrderBook(sym);

        // 1. Determine Reservation Amount & Perform Atomic Pre-Check
        double effectivePrice = (type == OrderType.LIMIT) ? price : stock.getCurrentPrice();
        if (side == OrderSide.BUY) {
            double requiredFunds = effectivePrice * quantity;
            account.reserveFunds(requiredFunds);
        } else {
            account.getPortfolio().reserveShares(sym, quantity);
        }

        // 2. Instantiate Order Object via Factory
        String orderId = "ORD-" + orderIdGen.getAndIncrement();
        Order order = OrderFactory.createOrder(orderId, accountId, sym, side, type, price, quantity);
        ordersById.put(orderId, order);

        // 3. Execute Matching under Per-Symbol ReentrantLock
        ReentrantLock lock = getLockForSymbol(sym);
        lock.lock();
        try {
            if (type == OrderType.LIMIT) {
                limitStrategy.execute(order, book, accounts, stock);
            } else {
                marketStrategy.execute(order, book, accounts, stock);
            }
        } finally {
            lock.unlock();
        }

        return order;
    }

    public Order cancelOrder(String orderId) {
        Order order = ordersById.get(orderId);
        if (order == null) {
            throw new InvalidOrderException("Order not found: " + orderId);
        }

        if (order.getStatus() == OrderStatus.EXECUTED || order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.REJECTED) {
            throw new InvalidOrderException("Cannot cancel order with status: " + order.getStatus());
        }

        ReentrantLock lock = getLockForSymbol(order.getSymbol());
        lock.lock();
        try {
            OrderBook book = orderBooks.get(order.getSymbol());
            if (book != null) {
                book.removeOrder(order);
            }

            int unexecutedQty = order.getRemainingQuantity();
            Account account = accounts.get(order.getAccountId());
            if (account != null && unexecutedQty > 0) {
                if (order.getSide() == OrderSide.BUY) {
                    double releaseAmount = unexecutedQty * order.getLimitPrice();
                    account.releaseReservedFunds(releaseAmount);
                } else {
                    account.getPortfolio().releaseReservedShares(order.getSymbol(), unexecutedQty);
                }
            }

            order.setStatus(OrderStatus.CANCELLED);
        } finally {
            lock.unlock();
        }

        return order;
    }

    public InAppPriceObserver getInAppPriceObserver() {
        return inAppPriceObserver;
    }

    // =========================================================================
    // ISOLATED SIMULATION ENGINE (/api/stockbroker/sim/*)
    // =========================================================================

    public synchronized void simReset() {
        simEventLog.clear();
        simStocks.clear();
        simAccounts.clear();
        simOrderBooks.clear();
        simOrdersById.clear();

        // 1. Register Simulation Stocks
        Stock inft = new Stock("INFY", "Infosys Ltd", 1500.00);
        Stock rel = new Stock("RELIANCE", "Reliance Industries", 2500.00);
        Stock tcs = new Stock("TCS", "Tata Consultancy Services", 3800.00);

        simStocks.put("INFY", inft);
        simStocks.put("RELIANCE", rel);
        simStocks.put("TCS", tcs);

        simOrderBooks.put("INFY", new OrderBook("INFY"));
        simOrderBooks.put("RELIANCE", new OrderBook("RELIANCE"));
        simOrderBooks.put("TCS", new OrderBook("TCS"));

        // 2. Register Demo Accounts
        Account alpha = new Account("SIM-ACC-ALPHA", "trader-alpha", 500000.0);
        alpha.getPortfolio().addInitialHolding("INFY", 100, 1480.0);
        alpha.getPortfolio().addInitialHolding("RELIANCE", 50, 2450.0);

        Account beta = new Account("SIM-ACC-BETA", "trader-beta", 500000.0);
        beta.getPortfolio().addInitialHolding("INFY", 50, 1490.0);
        beta.getPortfolio().addInitialHolding("RELIANCE", 100, 2460.0);

        simAccounts.put(alpha.getAccountId(), alpha);
        simAccounts.put(beta.getAccountId(), beta);

        // 3. Seed Order Book with a 4-Level Bid/Ask Ladder for INFY
        OrderBook infyBook = simOrderBooks.get("INFY");

        // Resting Bids (Beta buying below market)
        Order b1 = OrderFactory.createOrder("SIM-ORD-B1", "SIM-ACC-BETA", "INFY", OrderSide.BUY, OrderType.LIMIT, 1495.00, 20);
        Order b2 = OrderFactory.createOrder("SIM-ORD-B2", "SIM-ACC-BETA", "INFY", OrderSide.BUY, OrderType.LIMIT, 1490.00, 30);
        beta.reserveFunds(1495.00 * 20 + 1490.00 * 30);
        infyBook.addRestingOrder(b1);
        infyBook.addRestingOrder(b2);
        simOrdersById.put(b1.getOrderId(), b1);
        simOrdersById.put(b2.getOrderId(), b2);

        // Resting Asks (Alpha selling above market)
        Order s1 = OrderFactory.createOrder("SIM-ORD-S1", "SIM-ACC-ALPHA", "INFY", OrderSide.SELL, OrderType.LIMIT, 1505.00, 15);
        Order s2 = OrderFactory.createOrder("SIM-ORD-S2", "SIM-ACC-ALPHA", "INFY", OrderSide.SELL, OrderType.LIMIT, 1510.00, 25);
        alpha.getPortfolio().reserveShares("INFY", 40);
        infyBook.addRestingOrder(s1);
        infyBook.addRestingOrder(s2);
        simOrdersById.put(s1.getOrderId(), s1);
        simOrdersById.put(s2.getOrderId(), s2);

        logSimEvent("SIM_RESET", "System",
                "Initialized simulation sandbox with INFY (@ ₹1,500), RELIANCE (@ ₹2,500), TCS (@ ₹3,800) and seeded 4-level INFY Order Book ladder.", null);
    }

    public synchronized Map<String, Object> simPlaceOrder(String accountId, String symbol, OrderSide side,
                                                          OrderType type, double price, int quantity) {
        String sym = symbol.toUpperCase().trim();
        Stock stock = simStocks.get(sym);
        Account account = simAccounts.get(accountId);
        OrderBook book = simOrderBooks.get(sym);

        if (stock == null || account == null || book == null) {
            logSimEvent("ORDER_REJECTED", accountId, "Invalid symbol or account in simulation.", null);
            return getSimSnapshots();
        }

        try {
            double effPrice = (type == OrderType.LIMIT) ? price : stock.getCurrentPrice();
            if (side == OrderSide.BUY) {
                account.reserveFunds(effPrice * quantity);
            } else {
                account.getPortfolio().reserveShares(sym, quantity);
            }

            String orderId = "SIM-ORD-" + simOrderIdGen.getAndIncrement();
            Order order = OrderFactory.createOrder(orderId, accountId, sym, side, type, price, quantity);
            simOrdersById.put(orderId, order);

            List<Trade> trades;
            if (type == OrderType.LIMIT) {
                trades = limitStrategy.execute(order, book, simAccounts, stock);
            } else {
                trades = marketStrategy.execute(order, book, simAccounts, stock);
            }

            if (!trades.isEmpty()) {
                logSimEvent("TRADES_EXECUTED", accountId,
                        String.format("Order %s executed %d trade(s). Last Executed Price: ₹%.2f. New Current Price: ₹%.2f.",
                                orderId, trades.size(), stock.getCurrentPrice(), stock.getCurrentPrice()),
                        Map.of("trades", trades, "orderId", orderId));
            } else {
                logSimEvent("ORDER_RESTING", accountId,
                        String.format("Limit Order %s added to Order Book (%s side @ ₹%.2f). Status: %s.",
                                orderId, side, price, order.getStatus()),
                        Map.of("orderId", orderId, "status", order.getStatus().toString()));
            }
        } catch (Exception e) {
            logSimEvent("ORDER_FAILED", accountId, "Order failed: " + e.getMessage(), null);
        }

        return getSimSnapshots();
    }

    public synchronized Map<String, Object> simCancelOrder(String orderId) {
        Order order = simOrdersById.get(orderId);
        if (order == null || order.getStatus() == OrderStatus.EXECUTED || order.getStatus() == OrderStatus.CANCELLED) {
            logSimEvent("CANCEL_REJECTED", "System", "Cannot cancel order: " + orderId, null);
            return getSimSnapshots();
        }

        OrderBook book = simOrderBooks.get(order.getSymbol());
        if (book != null) {
            book.removeOrder(order);
        }

        int unexecuted = order.getRemainingQuantity();
        Account account = simAccounts.get(order.getAccountId());
        if (account != null && unexecuted > 0) {
            if (order.getSide() == OrderSide.BUY) {
                account.releaseReservedFunds(unexecuted * order.getLimitPrice());
            } else {
                account.getPortfolio().releaseReservedShares(order.getSymbol(), unexecuted);
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        logSimEvent("ORDER_CANCELLED", order.getAccountId(),
                String.format("Cancelled resting order %s (%s %d shares). Unexecuted reservation released.",
                        orderId, order.getSymbol(), unexecuted), null);

        return getSimSnapshots();
    }

    public Map<String, Object> getSimSnapshots() {
        Map<String, Object> res = new HashMap<>();
        res.put("stocks", simStocks.values());
        res.put("accounts", simAccounts.values());

        Map<String, Object> booksDepth = new HashMap<>();
        for (Map.Entry<String, OrderBook> entry : simOrderBooks.entrySet()) {
            booksDepth.put(entry.getKey(), entry.getValue().getDepthSnapshot(10));
        }
        res.put("orderBooks", booksDepth);
        res.put("orders", simOrdersById.values());
        res.put("events", simEventLog);
        return res;
    }

    public List<SimEvent> getSimEvents() {
        return simEventLog;
    }

    private void logSimEvent(String type, String actor, String desc, Map<String, Object> data) {
        String ts = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
        SimEvent event = new SimEvent(simEventIdGen.getAndIncrement(), ts, type, actor, desc, data);
        simEventLog.add(event);
    }

    // =========================================================================
    // DEFAULT DATA INITIALIZATION
    // =========================================================================

    private void initDefaultData() {
        registerStock("INFY", "Infosys Ltd", 1500.00);
        registerStock("RELIANCE", "Reliance Industries", 2500.00);
        registerStock("TCS", "Tata Consultancy Services", 3800.00);
        registerStock("HDFCBANK", "HDFC Bank Ltd", 1650.00);

        Account accAlice = createAccount("user-alice", "Alice Vance", "alice@example.com", 250000.0);
        accAlice.getPortfolio().addInitialHolding("INFY", 50, 1450.0);
        accAlice.getPortfolio().addInitialHolding("RELIANCE", 20, 2400.0);

        Account accBob = createAccount("user-bob", "Bob Smith", "bob@example.com", 300000.0);
        accBob.getPortfolio().addInitialHolding("TCS", 30, 3700.0);
        accBob.getPortfolio().addInitialHolding("HDFCBANK", 100, 1600.0);
    }
}
