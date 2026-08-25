package com.lld.taskmanagement.strategy;

import com.lld.taskmanagement.model.Task;

import java.util.List;

/**
 * One board-ordering algorithm. The service calls only this interface — it never branches on
 * {@link OrderingPolicy} itself, so adding a policy is one new implementation plus one factory
 * entry (the same shape as {@code inventory.strategy.ReorderStrategy}).
 */
public interface TaskOrderingStrategy {

    /** Human-readable name surfaced in the UI and sim events. */
    String name();

    /** Returns a new list containing every task in {@code tasks}, reordered. Never mutates input. */
    List<Task> order(List<Task> tasks);
}
