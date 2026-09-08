package com.lld.workflow.chain;

import com.lld.workflow.model.ApproverRole;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Proves the threshold chain is cumulative (Manager AND Director AND Finance as amount grows),
 * not claim-and-stop -- every applicable handler must contribute, not just the first match.
 */
public class ApprovalChainFactoryTest {

    private ApprovalChainFactory newFactory() {
        return new ApprovalChainFactory(new ManagerThresholdHandler(), new DirectorThresholdHandler(), new FinanceThresholdHandler());
    }

    @Test
    void aSmallAmountOnlyRequiresManager() {
        List<ApproverRole> roles = newFactory().resolveRequiredRoles(50.0);
        assertEquals(List.of(ApproverRole.MANAGER), roles);
    }

    @Test
    void anAmountJustOverTheDirectorThresholdRequiresManagerAndDirector() {
        List<ApproverRole> roles = newFactory().resolveRequiredRoles(1500.0);
        assertEquals(List.of(ApproverRole.MANAGER, ApproverRole.DIRECTOR), roles);
    }

    @Test
    void aLargeAmountRequiresTheFullChainInOrder() {
        List<ApproverRole> roles = newFactory().resolveRequiredRoles(7500.0);
        assertEquals(List.of(ApproverRole.MANAGER, ApproverRole.DIRECTOR, ApproverRole.FINANCE), roles);
    }

    @Test
    void amountsExactlyAtAThresholdDoNotYetRequireThatRole() {
        List<ApproverRole> roles = newFactory().resolveRequiredRoles(1000.0);
        assertEquals(List.of(ApproverRole.MANAGER), roles, "threshold is exclusive -- exactly $1000 must not require a Director");
    }
}
