// designDetails — workflow
// Single source of truth for this module. One file per module: duplicate keys in a
// shared object literal previously let JavaScript silently discard the richer entry.

export default {
  title: 'Workflow / Approval Engine — Design Details',
  requirements: [
    'Route an expense through a multi-step approval chain resolved by amount: a $50 expense needs only a Manager; a $1,500 expense needs Manager -> Director; a $7,500 expense needs Manager -> Director -> Finance.',
    'Chain of Responsibility for resolving WHICH steps are required for a given amount — cumulative, not claim-and-stop: every applicable threshold handler contributes its role, unlike a chain that stops at the first match.',
    'A declared-transition-table state machine for instance lifecycle: PENDING -> IN_REVIEW -> APPROVED/REJECTED/ESCALATED, with ESCALATED deliberately non-terminal so an escalated step can still be resolved by the next approver.',
    'Strategy for the timeout/escalation policy: AutoEscalateStrategy routes the step to the next approver automatically; NotifyOnlyStrategy flags it without touching routing at all — genuinely different policies, not two names for the same behavior.',
    'The concurrency centerpiece: a human approve() and an automatic timeout triggerEscalation() racing on the SAME pending step of the SAME instance must serialize through a single, well-defined outcome — never both take effect, never neither.',
    'Isolated Concurrency Simulation: an isolated /api/workflow/sim/* sandbox (a second WorkflowRepository instance) with a live approve-vs-escalate race, so the demo can never touch live workflow state.',
  ],
  entities: [
    {
      name: 'WorkflowService',
      description: 'Spring @Service facade owning submission, approval/rejection, escalation, and the isolated simulation engine. Centralizes every WorkflowStatus transition in one place rather than spreading it across the strategies.',
      fields: [
        { name: 'repository', type: 'WorkflowRepository', description: 'Live instance ledger' },
        { name: 'chainFactory', type: 'ApprovalChainFactory', description: 'Resolves the required approval roles for an amount' },
        { name: 'escalationStrategyFactory', type: 'EscalationStrategyFactory', description: 'Resolves EscalationStrategyType to a concrete strategy' },
      ],
      methods: [
        { name: 'approve(id, approverId, role)', returns: 'WorkflowInstance', description: 'Under the instance lock: validates status/step/role, decides the step APPROVED, advances or closes the workflow' },
        { name: 'triggerEscalation(id, stepIndex)', returns: 'WorkflowInstance', description: 'Under the instance lock: re-validates stepIndex is still the CURRENT step before escalating — a stale escalation for a step routing already moved past is rejected' },
      ],
    },
    {
      name: 'WorkflowInstance',
      description: 'A single approval request. instanceLock is a fair, per-instance ReentrantLock — this module\'s concurrency centerpiece, matching locker.model.Locker and coupon.model.Coupon precedent.',
      fields: [
        { name: 'currentStepIndex', type: 'volatile int', description: 'Which step of steps is currently pending' },
        { name: 'status', type: 'volatile WorkflowStatus', description: 'Mutated only through transitionTo(), which validates against the declared transition table' },
        { name: 'instanceLock', type: 'ReentrantLock', description: 'Fair, per-instance lock — held across the whole "is this step still pending? decide it if so" sequence' },
      ],
      methods: [
        { name: 'transitionTo(target)', returns: 'void', description: 'Throws IllegalStateException if the transition is not in WorkflowStatus\'s declared table. Callers must already hold getLock().' },
        { name: 'currentStep()', returns: 'ApprovalStep', description: 'steps.get(currentStepIndex)' },
      ],
    },
    {
      name: 'ApprovalStep',
      description: 'One required step in an instance\'s chain. decision starts PENDING and is the field approve()/reject()/triggerEscalation() all race to mutate.',
      fields: [
        { name: 'role', type: 'ApproverRole', description: 'Which role must act on this step (final)' },
        { name: 'decision', type: 'volatile StepDecision', description: 'PENDING/APPROVED/REJECTED/ESCALATED' },
      ],
      methods: [],
    },
    {
      name: 'ApprovalThresholdHandler (Chain of Responsibility, abstract)',
      description: 'Unlike a claim-and-stop chain (e.g. coupon.chain.EligibilityHandler), this chain deliberately lets EVERY handler contribute: a $7,500 expense needs Manager AND Director AND Finance, not just whichever threshold matches first.',
      fields: [],
      methods: [
        { name: 'collectRequiredRoles(amount, roles)', returns: 'void', description: 'Final template method: append this handler\'s role if isRequired(amount), then always delegate onward' },
        { name: 'isRequired(amount)', returns: 'boolean', description: 'Abstract — ManagerThresholdHandler: always true. DirectorThresholdHandler: amount > 1000. FinanceThresholdHandler: amount > 5000.' },
      ],
    },
    {
      name: 'EscalationStrategy (Strategy)',
      description: 'AutoEscalateStrategy advances the current step to the next approver in the chain (a no-op on the last step, rather than silently closing the workflow). NotifyOnlyStrategy never touches the step at all.',
      fields: [],
      methods: [
        { name: 'escalate(instance)', returns: 'boolean', description: 'true if routing actually changed' },
      ],
    },
  ],
  designPatterns: [
    {
      name: 'Chain of Responsibility (cumulative)',
      used: true,
      explanation: 'ManagerThresholdHandler -> DirectorThresholdHandler -> FinanceThresholdHandler, wired by ApprovalChainFactory with the same setNext-linking shape as logging.chain.LogHandler, payment.fraud.FraudCheckHandler, and this repo\'s own coupon.chain.EligibilityHandler — a fourth genuine use of this exact shape, because it is the actually-right pattern for this domain. The variant differs deliberately: every handler contributes rather than the first match short-circuiting the rest.',
    },
    {
      name: 'State Machine (declared transition table)',
      used: true,
      explanation: 'WorkflowStatus declares its legal transitions in a Map<WorkflowStatus, Set<WorkflowStatus>>, the same idiom as uber.model.RideStatus. ESCALATED is deliberately non-terminal — it marks "this step\'s timeout fired," not "this workflow is done," so the escalation target can still resolve the chain.',
    },
    {
      name: 'Strategy + Factory-shaped Resolver',
      used: true,
      explanation: 'EscalationStrategyFactory resolves EscalationStrategyType (AUTO_ESCALATE/NOTIFY_ONLY) to an EscalationStrategy via an EnumMap built once from every injected strategy bean — the same shape as locker.strategy.LockerAllocationStrategyFactory.',
    },
  ],
  principles: [
    { name: 'Single Responsibility Principle (SRP)', description: 'WorkflowRepository is pure CRUD; which roles are required lives in the chain handlers; escalation routing lives in the strategies; every WorkflowStatus transition is centralized in WorkflowService alone.' },
    { name: 'Open/Closed Principle (OCP)', description: 'A fourth approval tier (e.g. a CEO threshold above $50,000) is one new handler class and one line in ApprovalChainFactory\'s constructor — no existing handler changes. A third escalation policy is one new EscalationStrategy bean and one EnumMap entry.' },
    { name: 'Liskov Substitution Principle (LSP)', description: 'Every ApprovalThresholdHandler honors the same collectRequiredRoles contract; ApprovalChainFactory never needs to know which concrete handler it is talking to. Every EscalationStrategy honors the same escalate(instance) contract regardless of how differently AutoEscalate and NotifyOnly behave.' },
  ],
  oopConcepts: [
    { name: 'Encapsulation', description: 'A WorkflowInstance\'s ReentrantLock and currentStepIndex/status fields are private; every status mutation goes through transitionTo(), which validates against the declared table.' },
    { name: 'Polymorphism', description: 'WorkflowService calls chainFactory.resolveRequiredRoles(...) and escalationStrategyFactory.forType(...).escalate(...) without knowing which concrete handlers or strategy are involved.' },
    { name: 'Template Method', description: 'ApprovalThresholdHandler#collectRequiredRoles is a template method: it always evaluates isRequired() then unconditionally delegates onward, with only isRequired() varying per subclass.' },
  ],
  extensibility: [
    { area: 'Per-role delegate approvers', description: 'Today a role must act in person; adding "any of these three people can approve as Director" would need ApprovalStep to hold a Set of eligible approverIds rather than validating purely by role.', difficulty: 'Medium' },
    { area: 'Parallel (non-sequential) steps', description: 'Steps resolve strictly in order today; requiring Director AND Finance to both sign off independently (rather than sequentially) would need currentStepIndex replaced with a set of outstanding step indices — a genuinely different data shape.', difficulty: 'Hard' },
    { area: 'A real timeout scheduler', description: 'triggerEscalation() is invoked on demand today (by the UI or a test); a production system would need a scheduled job that calls it automatically once a step has been PENDING past some duration, reusing the exact same stepIndex-scoped call this module already exposes.', difficulty: 'Easy' },
  ],
  tradeoffs: [
    'triggerEscalation(id, stepIndex) takes the step index explicitly rather than just "escalate whatever is current" — an early version without this re-validation let a stale escalation (armed against a step that approve() had already moved past) succeed against the wrong step. Re-checking stepIndex against the current index inside the lock is what makes the approve-vs-escalate race genuinely exclusive on a single step, not just "some action happens."',
    'ESCALATED is intentionally non-terminal, unlike APPROVED/REJECTED. This costs a slightly more complex transition table but avoids the alternative: an auto-escalated request that could never actually be approved, which would defeat the entire point of routing it forward instead of just rejecting it.',
    'The Chain of Responsibility here is deliberately cumulative (every handler contributes) rather than claim-and-stop (coupon\'s EligibilityHandler shape) — forcing the claim-and-stop shape onto amount-based role resolution would mean only ONE role is ever required, which is wrong for this domain.',
  ],
  summary: 'A multi-step approval engine whose centerpiece is a human decision racing an automatic timeout on the exact same pending step. WorkflowInstance#transitionTo holds every status change to one validated, declared-table transition; WorkflowService#approve/reject/triggerEscalation each hold "is this step (and, for escalation, this exact stepIndex) still pending? decide it if so" as one atomic block under the instance\'s own fair ReentrantLock. A cumulative Chain of Responsibility resolves which roles an amount requires, and a Strategy-resolved escalation policy governs what a timeout actually does to routing.',
  highlights: [
    'The approve-vs-escalate race proven directly: a 300-round repeated test races one thread calling approve() against another calling triggerEscalation() on the identical pending step, asserting exactly one of the two ever takes effect — never both, never neither, every round.',
    'A real, independently-provable cumulative Chain of Responsibility: ApprovalChainFactoryTest proves a $1,000 expense needs only Manager (threshold exclusive, not inclusive) while $1,500 needs Manager AND Director, in that order.',
    'The stale-escalation bug this module\'s own test suite caught during development: an escalation armed against step 0 that arrives after approve() has already advanced routing to step 1 is now cleanly rejected, rather than silently escalating the wrong step — see requireStepStillCurrent in WorkflowService.',
  ],
};
