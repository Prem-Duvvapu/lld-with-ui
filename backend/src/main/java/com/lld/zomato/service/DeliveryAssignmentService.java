package com.lld.zomato.service;

import com.lld.zomato.exception.DeliveryAgentNotFoundException;
import com.lld.zomato.exception.InvalidOrderTransitionException;
import com.lld.zomato.exception.NoAgentAvailableException;
import com.lld.zomato.exception.OrderNotFoundException;
import com.lld.zomato.model.DeliveryAgent;
import com.lld.zomato.model.Order;
import com.lld.zomato.model.OrderStatus;
import com.lld.zomato.repository.ZomatoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Serialises delivery agent assignment so one agent cannot be assigned to multiple orders.
 *
 * <p>Fixes the check-then-act race by acquiring a per-agent lock and re-checking
 * agent availability inside the lock.
 */
@Service
public class DeliveryAssignmentService {

    private final ZomatoRepository repository;
    private final ConcurrentMap<String, ReentrantLock> agentLocks = new ConcurrentHashMap<>();

    /**
     * Per-order locks, held around the whole claim.
     *
     * <p>The agent lock alone is not enough: two threads assigning the *same* order pick two
     * *different* candidates, take two different agent locks and never contend. Both mark their
     * agent unavailable while the order keeps only the second — leaking the first agent out of
     * the pool permanently. The order lock is what makes "one order gets exactly one agent" true.
     *
     * <p>Lock ordering is always order-then-agent; nothing takes them the other way round, so
     * the pair cannot deadlock.
     */
    private final ConcurrentMap<String, ReentrantLock> orderLocks = new ConcurrentHashMap<>();

    public DeliveryAssignmentService(ZomatoRepository repository) {
        this.repository = repository;
    }

    private ReentrantLock lockFor(String agentId) {
        return agentLocks.computeIfAbsent(agentId, k -> new ReentrantLock());
    }

    private ReentrantLock orderLockFor(String orderId) {
        return orderLocks.computeIfAbsent(orderId, k -> new ReentrantLock());
    }

    /**
     * Re-read inside the order lock and refuse if the order has already moved on — this is what
     * stops a second concurrent claim on an order that is already OUT_FOR_DELIVERY.
     */
    private Order claimableOrder(String orderId) {
        Order order = repository.getOrder(orderId);
        if (order == null) {
            throw new OrderNotFoundException("Order not found: " + orderId);
        }
        if (!order.getStatus().canTransitionTo(OrderStatus.OUT_FOR_DELIVERY)) {
            throw new InvalidOrderTransitionException(
                    "Order " + orderId + " cannot go OUT_FOR_DELIVERY from " + order.getStatus());
        }
        return order;
    }

    /**
     * Finds an available delivery agent and atomically claims them for the given order.
     *
     * @param orderId the order requiring delivery
     * @return the assigned delivery agent
     * @throws OrderNotFoundException if order does not exist
     * @throws NoAgentAvailableException if no available agent could be claimed
     */
    public DeliveryAgent assignAgent(String orderId) {
        Order order = repository.getOrder(orderId);
        if (order == null) {
            throw new OrderNotFoundException("Order not found: " + orderId);
        }

        ReentrantLock orderLock = orderLockFor(orderId);
        orderLock.lock();
        try {
            order = claimableOrder(orderId);

            List<DeliveryAgent> candidates = repository.getAvailableDeliveryAgents();
            for (DeliveryAgent candidate : candidates) {
                ReentrantLock lock = lockFor(candidate.getId());
                lock.lock();
                try {
                    // Re-read and re-check INSIDE the lock
                    DeliveryAgent current = repository.getDeliveryAgent(candidate.getId());
                    if (current != null && current.isAvailable()) {
                        current.setAvailable(false);
                        repository.saveDeliveryAgent(current);

                        order.setDeliveryAgentId(current.getId());
                        order.setDeliveryAgentName(current.getName());
                        order.setDeliveryAgentPhone(current.getPhone());
                        order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
                        repository.saveOrder(order);

                        return current;
                    }
                } finally {
                    lock.unlock();
                }
            }

            throw new NoAgentAvailableException("No delivery agent available for order: " + orderId);
        } finally {
            orderLock.unlock();
        }
    }

    /**
     * Atomically assigns a specific delivery agent to an order.
     */
    public DeliveryAgent assign(String orderId, String agentId) {
        Order order = repository.getOrder(orderId);
        if (order == null) {
            throw new OrderNotFoundException("Order not found: " + orderId);
        }

        DeliveryAgent agent = repository.getDeliveryAgent(agentId);
        if (agent == null) {
            throw new DeliveryAgentNotFoundException("Delivery agent not found: " + agentId);
        }

        ReentrantLock orderLock = orderLockFor(orderId);
        orderLock.lock();
        ReentrantLock lock = lockFor(agentId);
        lock.lock();
        try {
            order = claimableOrder(orderId);

            DeliveryAgent current = repository.getDeliveryAgent(agentId);
            if (current == null) {
                throw new DeliveryAgentNotFoundException("Delivery agent not found: " + agentId);
            }
            if (!current.isAvailable()) {
                throw new NoAgentAvailableException("Delivery agent " + agentId + " is no longer available");
            }

            current.setAvailable(false);
            repository.saveDeliveryAgent(current);

            order.setDeliveryAgentId(current.getId());
            order.setDeliveryAgentName(current.getName());
            order.setDeliveryAgentPhone(current.getPhone());
            order.setStatus(OrderStatus.OUT_FOR_DELIVERY);
            repository.saveOrder(order);

            return current;
        } finally {
            lock.unlock();
            orderLock.unlock();
        }
    }

    /**
     * Releases a delivery agent back to the available pool.
     */
    public void releaseAgent(String agentId) {
        if (agentId == null) {
            return;
        }
        ReentrantLock lock = lockFor(agentId);
        lock.lock();
        try {
            DeliveryAgent agent = repository.getDeliveryAgent(agentId);
            if (agent != null) {
                agent.setAvailable(true);
                repository.saveDeliveryAgent(agent);
            }
        } finally {
            lock.unlock();
        }
    }
}
