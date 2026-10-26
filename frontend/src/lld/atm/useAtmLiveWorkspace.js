import { useCallback, useRef, useState } from 'react';
import * as api from './api';

const initial = {
  sessionState: 'IDLE', cardNumber: '1111222233334444', pinInput: '',
  activeAccount: null, currentBalance: null, amountInput: '500', mode: 'MINIMIZE_NOTES',
  transactions: null, dispenser: null, receipt: null, errorMsg: '', successMsg: '', uncertain: false,
};
const emptyReads = { inventory: {}, balance: {}, transactions: {} };
const operationNames = { insert: 'Card insertion', authenticate: 'PIN authentication', withdraw: 'Withdrawal', deposit: 'Deposit', eject: 'Card ejection' };

function unknownOutcome(name) {
  return `The ${operationNames[name].toLowerCase()} outcome is unknown. It may have completed. Check balance and transactions before another transaction; eject the card before starting a new session.`;
}

// The live Java terminal outlives a tab. Keep its last confirmed UI snapshot in AtmPage.
export function useAtmLiveWorkspace() {
  const [state, setState] = useState(initial);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [pending, setPending] = useState('');
  const [reads, setReads] = useState(emptyReads);
  const lifecycle = useRef({ active: false, epoch: 0, operation: null, reads: new Map() });

  const cancelReads = useCallback(() => {
    for (const request of lifecycle.current.reads.values()) request.controller.abort();
    lifecycle.current.reads.clear();
    setReads(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, loading: false }])));
  }, []);

  const load = useCallback(async (resource, accountNumber = stateRef.current.activeAccount?.accountNumber) => {
    const life = lifecycle.current;
    if (!life.active || life.operation || life.reads.has(resource)) return;
    if (resource !== 'inventory' && !accountNumber) return;
    const request = { controller: new AbortController(), epoch: life.epoch };
    life.reads.set(resource, request);
    const current = () => life.active && life.epoch === request.epoch && life.reads.get(resource) === request && !request.controller.signal.aborted;
    setReads(previous => ({ ...previous, [resource]: { loading: true, error: '' } }));
    try {
      const options = { signal: request.controller.signal };
      const result = resource === 'inventory' ? await api.getDispenserStatus(options)
        : resource === 'balance' ? await api.getBalance(accountNumber, options)
          : await api.getTransactions(accountNumber, options);
      if (!current()) return;
      setState(previous => ({
        ...previous,
        ...(resource === 'inventory' ? { dispenser: result }
          : resource === 'balance' ? { currentBalance: result.balance }
            : { transactions: result }),
      }));
    } catch (error) {
      if (current()) setReads(previous => ({ ...previous, [resource]: { loading: false, error: error.message || 'Request failed. Please retry.' } }));
    } finally {
      if (current()) {
        life.reads.delete(resource);
        setReads(previous => ({ ...previous, [resource]: { ...previous[resource], loading: false } }));
      }
    }
  }, []);

  const activate = useCallback(() => {
    const life = lifecycle.current;
    life.active = true;
    load('inventory');
    if (stateRef.current.activeAccount) { load('balance'); load('transactions'); }
    return () => {
      life.active = false;
      life.epoch += 1;
      cancelReads();
      if (life.operation) {
        const name = life.operation.name;
        life.operation.controller.abort();
        life.operation = null;
        setPending('');
        setState(previous => ({ ...previous, uncertain: name, errorMsg: unknownOutcome(name), successMsg: '' }));
      }
    };
  }, [cancelReads, load]);

  const run = async name => {
    const life = lifecycle.current;
    const snapshot = stateRef.current;
    if (!life.active || life.operation || (snapshot.uncertain && name !== 'eject')) return;
    if (name === 'insert' && snapshot.sessionState !== 'IDLE') return;
    if (name === 'authenticate' && snapshot.sessionState !== 'CARD_INSERTED') return;
    if (['withdraw', 'deposit'].includes(name) && (!snapshot.activeAccount || snapshot.sessionState !== 'AUTHENTICATED')) return;
    const request = { name, controller: new AbortController(), epoch: life.epoch };
    life.operation = request; // Guard before React can render disabled controls.
    cancelReads(); // A pre-mutation snapshot must never overwrite the resulting reads.
    setPending(name);
    setState(previous => ({ ...previous, errorMsg: '', successMsg: '' }));
    const current = () => life.active && life.epoch === request.epoch && life.operation === request && !request.controller.signal.aborted;
    let refreshAccount = false;
    let accountNumber = snapshot.activeAccount?.accountNumber;
    try {
      const options = { signal: request.controller.signal };
      let result;
      if (name === 'insert') result = await api.insertCard(snapshot.cardNumber, options);
      else if (name === 'authenticate') result = await api.authenticate(snapshot.cardNumber, snapshot.pinInput, options);
      else if (name === 'withdraw') result = await api.withdraw(snapshot.activeAccount.accountNumber, snapshot.amountInput, snapshot.mode, options);
      else if (name === 'deposit') result = await api.deposit(snapshot.activeAccount.accountNumber, snapshot.amountInput, options);
      else result = await api.ejectCard(options);
      if (!current()) return;
      if (name === 'insert') {
        setState(previous => ({ ...previous, sessionState: result.state, cardNumber: result.cardNumber, successMsg: `Card inserted for ${result.holderName}. Please enter your PIN.` }));
      } else if (name === 'authenticate') {
        accountNumber = result.accountNumber;
        setState(previous => ({ ...previous, sessionState: result.state, activeAccount: result, currentBalance: result.balance, pinInput: '', successMsg: `Welcome, ${result.holderName}! PIN verified.` }));
        refreshAccount = true;
      } else if (name === 'eject') {
        setState(previous => ({ ...previous, sessionState: result.state, activeAccount: null, currentBalance: null, pinInput: '', receipt: null, transactions: null, uncertain: false, errorMsg: '', successMsg: result.message }));
        setReads(previous => ({ ...previous, balance: {}, transactions: {} }));
      } else {
        setState(previous => ({ ...previous, receipt: result, successMsg: `${name === 'withdraw' ? 'Successfully withdrew' : 'Successfully deposited'} ₹${result.amount}.` }));
        refreshAccount = true;
      }
    } catch (error) {
      if (!current()) return;
      const uncertain = !error.status || error.status >= 500;
      setState(previous => ({
        ...previous, uncertain: previous.uncertain || (uncertain ? name : false),
        errorMsg: `${operationNames[name]} failed: ${error.message || 'Request failed.'}${previous.uncertain || uncertain ? ` ${unknownOutcome(previous.uncertain || name)}` : ''}`,
        ...(error.body?.code === 'CardBlockedException' ? { sessionState: 'CARD_BLOCKED' } : {}),
      }));
      refreshAccount = ['withdraw', 'deposit'].includes(name);
    } finally {
      if (current()) {
        life.operation = null;
        setPending('');
        load('inventory');
        if (refreshAccount) {
          if (name !== 'authenticate') load('balance', accountNumber);
          load('transactions', accountNumber);
        }
      }
    }
  };

  const setDraft = (field, value) => {
    if (lifecycle.current.operation || stateRef.current.uncertain) return;
    if (field === 'cardNumber' && stateRef.current.sessionState !== 'IDLE') return;
    setState(previous => ({ ...previous, [field]: value }));
  };

  return { ...state, pending, reads, activate, load, run, setDraft };
}

