// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useLayoutEffect, useRef } from 'react';
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

// Model another consumer focusing a ready control after the terminal's DOM commit.
// A delayed terminal focus effect must not overwrite that newer focus choice.
function ReadyScreen({ workspace }) {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (workspace.sessionState === 'AUTHENTICATED') {
      [...root.current.querySelectorAll('button')].find(button => button.textContent.includes('Refresh Balance'))?.focus();
    }
  }, [workspace.sessionState]);
  return <div ref={root}><AtmLiveTerminal workspace={workspace} /></div>;
}

it('finishes transition focus before another consumer focuses a ready balance control', () => {
  const workspace = { sessionState: 'CARD_INSERTED', pending: '', reads: { inventory: {}, balance: {}, transactions: {} },
    cardNumber: '1111222233334444', pinInput: '', amountInput: '500', mode: 'MINIMIZE_NOTES',
    transactions: [], uncertain: false, activate: () => () => {}, run: vi.fn(), load: vi.fn(), setDraft: vi.fn() };
  const view = render(<ReadyScreen workspace={workspace} />);
  view.rerender(<ReadyScreen workspace={{ ...workspace, sessionState: 'AUTHENTICATED',
    activeAccount: {accountNumber:'1234567890'}, currentBalance:10000 }} />);
  expect(screen.getByRole('button', {name:/Refresh Balance/})).toHaveFocus();
});
