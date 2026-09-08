// Sequence diagram content for workflow.
// Grounded directly in WorkflowService#doApprove/#doTriggerEscalation and
// WorkflowConcurrencyTest#approveAndEscalateRaceNeverBothTakeEffect: a human approval and an
// automatic timeout escalation racing on the SAME pending step of the SAME instance. A class
// diagram shows WorkflowInstance owns a lock, a currentStepIndex and a status; it does not show
// why triggerEscalation() must re-validate its stepIndex is still current INSIDE the lock, or why
// that re-check is what keeps the race exclusive on a single step rather than just "some action
// happens."
export default {
  title: 'Workflow / Approval Engine — Approve vs. Timeout-Escalate Race on a Pending Step',
  description:
    'A $1,500 expense needs Manager -> Director. The Manager has already approved, so the workflow is IN_REVIEW with the Director step (index 1) pending. A human Director approval and an automatic timeout escalation for that SAME step index fire at the same instant. Both must acquire the instance\'s own lock before touching anything -- whichever acquires it first re-checks "is step 1 still the current, still-pending step?" as one atomic block and decides it; the loser\'s re-check inside the lock sees the step already decided (or, for a stale escalation, sees routing already moved past its stepIndex) and is cleanly rejected, never silently acting on the wrong step.',
  flows: [
    {
      id: 'approve-vs-escalate-race',
      label: 'Director approval racing a timeout escalation on step 1',
      description:
        'Both threads start together via a CountDownLatch (see WorkflowConcurrencyTest, run for 300 rounds). Exactly one of approve()/triggerEscalation() ever takes effect on step 1 -- the other is cleanly rejected, and the instance lands in a single well-defined status: IN_REVIEW->APPROVED if approve won and this was the last step, or ESCALATED if escalation won.',
      participants: [
        { id: 'director', name: 'Director\n(human approval)', kind: 'actor' },
        { id: 'timeout', name: 'TimeoutMonitor\n(automatic escalation)', kind: 'actor' },
        { id: 'service', name: 'WorkflowService', kind: 'component', stereotype: 'facade' },
        { id: 'strategy', name: 'AutoEscalateStrategy', kind: 'component' },
        { id: 'instance', name: 'WorkflowInstance "WF-1001"\n(step 1 = Director, PENDING)', kind: 'component' },
        { id: 'lock', name: 'instance.instanceLock\n(ReentrantLock, fair)', kind: 'component', stereotype: 'lock' },
      ],
      steps: [
        { type: 'note', over: ['instance'], text: 'status=IN_REVIEW, currentStepIndex=1, steps[1]={role:DIRECTOR, decision:PENDING} -- both racers target stepIndex=1.' },
        { from: 'director', to: 'service', text: 'approve("WF-1001", "director-raj", DIRECTOR)' },
        { from: 'timeout', to: 'service', text: 'triggerEscalation("WF-1001", stepIndex=1)  -- ~simultaneously' },
        { from: 'service', to: 'lock', text: '[Director] lock.lock()  -- wins the race', activate: 'lock' },
        { from: 'service', to: 'instance', text: '[Director] requirePending(): status IN_REVIEW, not terminal -- OK' },
        { from: 'service', to: 'instance', text: '[Director] currentStep(): steps[1], requireStepPending(): PENDING -- OK' },
        { from: 'service', to: 'instance', text: '[Director] step.decision = APPROVED; isLastStep() -> transitionTo(APPROVED)', deactivate: 'lock' },
        { from: 'service', to: 'director', text: 'return WorkflowInstance{status: APPROVED}', type: 'return' },
        { from: 'service', to: 'lock', text: '[TimeoutMonitor] lock.lock()  -- only now, after Director already decided', activate: 'lock' },
        { type: 'note', over: ['instance'], text: 'This is the re-check a two-locked-steps design would get wrong: TimeoutMonitor must see the CURRENT state now, under the SAME lock -- not a stale "still pending" snapshot taken before blocking.' },
        { from: 'service', to: 'instance', text: '[TimeoutMonitor] requirePending(): status APPROVED IS terminal -- FAIL' },
        { from: 'service', to: 'timeout', text: 'throw InvalidStepTransitionException("WF-1001 is already APPROVED")', type: 'return', deactivate: 'lock' },
        { type: 'note', over: ['director', 'timeout'], text: 'Exactly one action took effect. See WorkflowConcurrencyTest, 300 rounds: successes.get() == 1 every round, never 0, never 2.' },
      ],
    },
    {
      id: 'stale-escalation-rejected',
      label: 'A stale escalation for a step routing already moved past',
      description:
        'The mirror case: TimeoutMonitor was armed against step 0 (Manager) at the moment it went pending, but by the time it acquires the lock, approve() has already advanced routing to step 1. Escalating "whatever is current now" would silently act on the wrong step -- requireStepStillCurrent rejects it instead.',
      participants: [
        { id: 'manager', name: 'Manager\n(human approval)', kind: 'actor' },
        { id: 'timeout2', name: 'TimeoutMonitor\n(armed for step 0)', kind: 'actor' },
        { id: 'service2', name: 'WorkflowService', kind: 'component', stereotype: 'facade' },
        { id: 'instance2', name: 'WorkflowInstance\n(step 0 = Manager)', kind: 'component' },
      ],
      steps: [
        { from: 'manager', to: 'service2', text: 'approve(id, "mgr-1", MANAGER)  -- acquires the lock first' },
        { from: 'service2', to: 'instance2', text: 'step[0].decision = APPROVED; currentStepIndex advances to 1' },
        { from: 'service2', to: 'manager', text: 'return WorkflowInstance{currentStepIndex: 1}', type: 'return' },
        { from: 'timeout2', to: 'service2', text: 'triggerEscalation(id, stepIndex=0)  -- arrives after, still targeting step 0' },
        { from: 'service2', to: 'instance2', text: 'requireStepStillCurrent(0): currentStepIndex is now 1, not 0 -- FAIL' },
        { from: 'service2', to: 'timeout2', text: 'throw InvalidStepTransitionException("step 0 is no longer the current step")', type: 'return' },
        { type: 'note', over: ['instance2'], text: 'Without this re-check, the stale escalation would have silently escalated step 1 (Director) instead of the step-0 timeout it was actually armed for.' },
      ],
    },
  ],
};
