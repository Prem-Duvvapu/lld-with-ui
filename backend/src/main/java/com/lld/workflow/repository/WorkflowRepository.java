package com.lld.workflow.repository;

import com.lld.workflow.exception.WorkflowNotFoundException;
import com.lld.workflow.model.WorkflowInstance;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store for live workflow instances — pure CRUD, the same shape as
 * {@code coupon.repository.CouponRepository}. No approval or escalation logic lives here; that
 * belongs to {@code WorkflowService}, which owns a second, independently constructed instance of
 * this class for its isolated {@code /sim/*} sandbox.
 */
@Repository
public class WorkflowRepository {

    private final Map<String, WorkflowInstance> instances = new ConcurrentHashMap<>();

    public void save(WorkflowInstance instance) {
        instances.put(instance.getId(), instance);
    }

    public WorkflowInstance get(String id) {
        WorkflowInstance instance = instances.get(id);
        if (instance == null) {
            throw new WorkflowNotFoundException("Workflow not found: " + id);
        }
        return instance;
    }

    public List<WorkflowInstance> getAll() {
        return new ArrayList<>(instances.values());
    }

    public void reset() {
        instances.clear();
    }
}
