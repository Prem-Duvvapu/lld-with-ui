package com.lld.threadpool.config;

import com.lld.threadpool.model.CustomThreadPool;
import com.lld.threadpool.repository.ThreadPoolRepository;
import com.lld.threadpool.strategy.RejectionPolicyFactory;
import com.lld.threadpool.strategy.RejectionPolicyType;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Seeds two demo pools on different rejection policies, so the live App tab shows something
 *  meaningful on first load and both policies are exercised, not just declared. */
@Component
public class ThreadPoolInitializer {

    private final ThreadPoolRepository repository;
    private final RejectionPolicyFactory policyFactory;

    @Autowired
    public ThreadPoolInitializer(ThreadPoolRepository repository, RejectionPolicyFactory policyFactory) {
        this.repository = repository;
        this.policyFactory = policyFactory;
    }

    @PostConstruct
    public void init() {
        repository.register(new CustomThreadPool(
                "web-server-pool", 2, 4, 3, 5_000,
                policyFactory.create(RejectionPolicyType.ABORT)));

        repository.register(new CustomThreadPool(
                "batch-worker-pool", 1, 2, 2, 5_000,
                policyFactory.create(RejectionPolicyType.CALLER_RUNS)));
    }
}
