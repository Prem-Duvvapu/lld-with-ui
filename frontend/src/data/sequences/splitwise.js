// Sequence diagram content for splitwise.
// Grounded directly in the real classes and SplitStrategyTest / SplitwiseServiceTest#testPercentageSplit:
// SplitwiseController -> SplitwiseService -> SplitStrategyFactory -> PercentageSplitStrategy -> SplitwiseRepository.
export default {
  title: 'Splitwise — Add Expense (Strategy + Factory Dispatch)',
  description:
    'How one addExpense() call resolves to the right split algorithm without a single if/else on SplitType. The class diagram shows SplitStrategyFactory sitting between SplitwiseService and three SplitStrategy implementations — only a sequence diagram shows that the factory lookup and the strategy call are two separate hops, and that the service never learns which concrete strategy it got.',
  flows: [
    {
      id: 'add-expense-percentage',
      label: 'Add expense — percentage split',
      description:
        'Alice and Bob share a flat (SplitwiseServiceTest#testPercentageSplit). Alice pays ₹1000 rent and declares a 70/30 percentage split up front. The interesting part is not the arithmetic — it\'s that SplitwiseService#addExpense reads SplitType.PERCENTAGE off the request, asks SplitStrategyFactory for "a strategy", and never touches PercentageSplitStrategy by name.',
      participants: [
        { id: 'user', name: 'Alice — Payer', kind: 'actor' },
        { id: 'controller', name: 'SplitwiseController', kind: 'component', stereotype: 'controller' },
        { id: 'service', name: 'SplitwiseService', kind: 'component', stereotype: 'facade' },
        { id: 'factory', name: 'SplitStrategy\nFactory', kind: 'component', stereotype: 'factory' },
        { id: 'strategy', name: 'PercentageSplit\nStrategy', kind: 'component', stereotype: 'strategy' },
        { id: 'repo', name: 'SplitwiseRepository', kind: 'store' },
      ],
      steps: [
        { from: 'user', to: 'controller',
          text: 'POST /api/splitwise/expenses {desc:"Rent", amount:1000, paidBy:Alice, splits:[{Alice,70%},{Bob,30%}]}',
          detail: 'The request body carries a SplitType per split line (PERCENTAGE here) chosen by the client — there is no separate "split mode" flag on the endpoint. That field is what the whole Strategy/Factory dispatch downstream keys off of.' },
        { from: 'controller', to: 'service', text: 'addExpense("Rent", 1000.0, aliceId, groupId, splits)', activate: 'service',
          detail: 'SplitwiseController#addExpense only unpacks the request Map into typed arguments and forwards them. No split logic, no validation, no persistence lives in the controller — matching the facade split this repo enforces everywhere.' },
        { from: 'service', to: 'repo', text: 'getUser(aliceId); getGroup(groupId)' },
        { from: 'repo', to: 'service', text: 'return Alice, Group("Roommates", [Alice, Bob])', type: 'return' },
        { from: 'service', to: 'service', text: 'splitType = splits.get(0).getType()  → PERCENTAGE',
          detail: 'SplitwiseService#addExpense reads the SplitType straight off the incoming Split list instead of branching on it. That value becomes a map key one line later — the reason this method has no if/else per split mode.' },
        { from: 'service', to: 'factory', text: 'strategyFactory.getStrategy(PERCENTAGE)', activate: 'factory',
          detail: 'SplitStrategyFactory pre-populates an EnumMap<SplitType, SplitStrategy> in its constructor (EQUAL→EqualSplitStrategy, PERCENTAGE→PercentageSplitStrategy, EXACT→ExactSplitStrategy). Adding a new split mode later means one new map entry — SplitwiseService is never touched.' },
        { from: 'factory', to: 'service', text: 'return PercentageSplitStrategy instance', type: 'return', deactivate: 'factory' },
        { from: 'service', to: 'strategy', text: 'strategy.calculateSplits(1000.0, group, splits, repository)', activate: 'strategy',
          detail: 'SplitwiseService now holds only a SplitStrategy reference and calls calculateSplits() without knowing which concrete class answers. That interface boundary is the entire point of the pattern — swap the instance, keep the call site.' },
        { from: 'strategy', to: 'strategy', text: 'validate Σ percentage == 100  → 70 + 30 = 100 ✓' },
        { from: 'strategy', to: 'repo', text: 'getUser(alice.id); getUser(bob.id)' },
        { from: 'repo', to: 'strategy', text: 'return full User records', type: 'return' },
        { from: 'strategy', to: 'service', text: 'return [Split(Alice,700.0,70%), Split(Bob,300.0,30%)]', type: 'return', deactivate: 'strategy',
          detail: 'Each strategy owns its own validation and rounding contract: PercentageSplitStrategy checks percentages sum to 100 and rounds amount*pct/100 to 2dp; ExactSplitStrategy instead checks the amounts sum to the total; EqualSplitStrategy ignores splitsInput entirely and divides by group size, folding the remainder into the first share. Same method signature, three different rules — the service needs to know none of them.' },
        { type: 'note', over: ['service'], text: 'Splits resolved. Persist the expense, then post the pairwise balance.' },
        { from: 'service', to: 'repo', text: 'saveExpense(expense)  → Expense#42 created' },
        { from: 'service', to: 'repo', text: 'updateBalance(aliceId, bobId, 300.0)',
          detail: 'Only Bob\'s split reaches the ledger — the payer\'s own share nets to zero against themselves, so the loop in addExpense() skips split.getUser().getId() == paidByUserId. updateBalance() then collapses "alice:bob" and "bob:alice" onto one canonical key so a later getNetBalance() call never double-counts or contradicts itself.' },
        { from: 'service', to: 'repo', text: 'logEvent(EXPENSE_ADDED, "Alice paid ₹1000.00 for Rent (PERCENTAGE split)")' },
        { from: 'service', to: 'controller', text: 'return expense', type: 'return', deactivate: 'service' },
        { from: 'controller', to: 'user', text: '200 OK  Expense#42 {splits: [Alice 700.00, Bob 300.00]}', type: 'return' },
      ],
    },
  ],
};
