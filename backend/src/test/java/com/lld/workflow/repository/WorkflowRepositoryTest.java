package com.lld.workflow.repository;

import com.lld.workflow.exception.WorkflowNotFoundException;
import com.lld.workflow.model.ApprovalStep;
import com.lld.workflow.model.ApproverRole;
import com.lld.workflow.model.EscalationStrategyType;
import com.lld.workflow.model.WorkflowInstance;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class WorkflowRepositoryTest {

    private WorkflowRepository repository;

    @BeforeEach
    void setUp() {
        repository = new WorkflowRepository();
    }

    private WorkflowInstance newInstance(String id) {
        return new WorkflowInstance(id, "alice", 50.0, EscalationStrategyType.AUTO_ESCALATE,
                List.of(new ApprovalStep(ApproverRole.MANAGER)));
    }

    @Test
    void unknownIdThrowsWorkflowNotFoundException() {
        assertThrows(WorkflowNotFoundException.class, () -> repository.get("nope"));
    }

    @Test
    void saveAndGetRoundTrips() {
        WorkflowInstance instance = newInstance("WF-1");
        repository.save(instance);
        assertSame(instance, repository.get("WF-1"));
    }

    @Test
    void getAllReturnsEverySavedInstance() {
        repository.save(newInstance("WF-1"));
        repository.save(newInstance("WF-2"));
        assertEquals(2, repository.getAll().size());
    }

    @Test
    void resetWipesEverything() {
        repository.save(newInstance("WF-1"));
        repository.reset();
        assertTrue(repository.getAll().isEmpty());
    }
}
