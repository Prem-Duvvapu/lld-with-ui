// Sequence diagram content for atm (Automated Teller Machine).
// Grounded directly in AtmService, BankingService, and Chain of Responsibility Cash Dispenser.
export default {
  title: 'ATM — Card Authentication, Balance Debit & Chain of Responsibility Cash Dispense',
  description:
    'How AtmService handles cash withdrawal workflows: card insertion & PIN validation with BankingService, account balance validation and atomic debit, and greedy note dispensing across ₹2000, ₹500, and ₹100 note handlers via the Chain of Responsibility pattern.',
  flows: [
    {
      id: 'atm-cash-withdrawal',
      label: 'PIN authentication → Balance debit → Chain of Responsibility note dispense',
      description:
        'Cardholder inserts card (CARD-1001), enters PIN, and requests ₹3700 withdrawal. AtmService authenticates via BankingService, debits account balance, and cascades through ₹2000, ₹500, and ₹100 dispensers to dispense 1x₹2000, 3x₹500, and 2x₹100.',
      participants: [
        { id: 'user', name: 'Cardholder', kind: 'actor' },
        { id: 'controller', name: 'AtmController', kind: 'component', stereotype: 'controller' },
        { id: 'atm', name: 'AtmService / \nAtmMachine', kind: 'component', stereotype: 'facade' },
        { id: 'bank', name: 'BankingService\n/ Core Bank', kind: 'component' },
        { id: 'dispenser', name: 'CashDispenser\n(Chain of Resp.)', kind: 'component', stereotype: 'chain' },
        { id: 'cashVault', name: 'CashVault\n(Inventory)', kind: 'store' },
      ],
      steps: [
        { from: 'user', to: 'controller', text: 'POST /api/atm/withdraw {cardNo: "CARD-1001", pin: "1234", amount: 3700}' },
        { from: 'controller', to: 'atm', text: 'withdraw("CARD-1001", "1234", 3700)', activate: 'atm' },
        { from: 'atm', to: 'bank', text: 'authenticateAndDebit("CARD-1001", "1234", 3700)', activate: 'bank' },
        { from: 'bank', to: 'bank', text: 'verifyPin() ✓ ; checkSufficientBalance(₹15,000 >= ₹3700) ✓' },
        { from: 'bank', to: 'bank', text: 'debitAccount(3700) → remainingBalance = ₹11,300' },
        { from: 'bank', to: 'atm', text: 'DebitAuthorized {txId: "TXN-ATM-88", balance: 11300}', type: 'return', deactivate: 'bank' },
        { from: 'atm', to: 'dispenser', text: 'dispenseCash(3700)', activate: 'dispenser' },
        { from: 'dispenser', to: 'dispenser', text: 'TwoThousandHandler: 3700 / 2000 = 1 note (rem: 1700)' },
        { from: 'dispenser', to: 'dispenser', text: 'FiveHundredHandler: 1700 / 500 = 3 notes (rem: 200)' },
        { from: 'dispenser', to: 'dispenser', text: 'OneHundredHandler: 200 / 100 = 2 notes (rem: 0)' },
        { from: 'dispenser', to: 'cashVault', text: 'deductNotes({₹2000: 1, ₹500: 3, ₹100: 2})' },
        { from: 'dispenser', to: 'atm', text: 'DispensePlan {[2000x1, 500x3, 100x2]}', type: 'return', deactivate: 'dispenser' },
        { from: 'atm', to: 'controller', text: 'WithdrawalResult {status: SUCCESS, dispensed: {2000:1, 500:3, 100:2}, balance: 11300}', type: 'return', deactivate: 'atm' },
        { from: 'controller', to: 'user', text: '200 OK — ₹3700 dispensed (6 notes) & receipt printed', type: 'return' },
      ],
    },
  ],
};
