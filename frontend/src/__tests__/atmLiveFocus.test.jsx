// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import AtmLiveTerminal from '../lld/atm/AtmLiveTerminal';

it('keeps an already visible PIN form locked until insertion settles, then focuses the ready input', async () => {
  const workspace = { sessionState: 'IDLE', pending: '', reads: { inventory: {}, balance: {}, transactions: {} },
    cardNumber: '1111222233334444', pinInput: '', amountInput: '500', mode: 'MINIMIZE_NOTES',
    transactions: [], uncertain: false, activate: () => () => {}, run: vi.fn(), load: vi.fn(), setDraft: vi.fn() };
  const view = render(<AtmLiveTerminal workspace={workspace} />);
  const inserting = { ...workspace, sessionState: 'CARD_INSERTED', pending: 'insert' };
  view.rerender(<AtmLiveTerminal workspace={inserting} />);
  expect(screen.getByRole('heading', { name: 'Enter 4-Digit PIN' })).toBeVisible();
  const pin = screen.getByLabelText('4-digit PIN');
  expect(pin).toBeDisabled(); expect(pin).not.toHaveFocus();
  view.rerender(<AtmLiveTerminal workspace={{ ...inserting, pending: '' }} />);
  await waitFor(() => { expect(pin).toBeEnabled(); expect(pin).toHaveFocus(); });
});
