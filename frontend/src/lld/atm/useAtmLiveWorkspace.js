import { useCallback, useRef, useState } from 'react';
import * as api from './api';

const STORAGE_KEY = 'lld-atm-terminal-v1';
const moneyOperations = ['withdraw', 'deposit'];
const operationNames = { insert: 'Card insertion', authenticate: 'PIN authentication', withdraw: 'Withdrawal', deposit: 'Deposit', eject: 'Card ejection' };
const emptyReads = () => ({ terminal: {}, inventory: {}, balance: {}, transactions: {} });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memorySession;

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure browser randomness is unavailable. Use a modern browser to access the terminal.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Whitelist persisted financial fields. Authentication/PIN drafts never enter storage.
function financialRecord(record) {
  const body = record?.body;
  if (!uuidPattern.test(record?.requestId) || !moneyOperations.includes(body?.operation)
    || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || typeof body.bootId !== 'string'
    || typeof body.payload?.accountNumber !== 'string' || !Number.isFinite(body.payload?.amount)) return null;
  const payload = { accountNumber: body.payload.accountNumber, amount: body.payload.amount };
  if (body.operation === 'withdraw') payload.mode = body.payload.mode;
  return Object.freeze({ requestId: record.requestId, body: Object.freeze({ operation: body.operation,
    expectedRevision: body.expectedRevision, bootId: body.bootId, payload: Object.freeze(payload) }) });
}

function restore() {
  let saved;
  let storageWarning = '';
  try { saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') || memorySession; }
  catch { saved = memorySession; storageWarning = 'Browser session storage is unavailable or unreadable. Keep this tab open; recovery after reload may be unavailable.'; }
  let token = saved?.token;
  try { if (!uuidPattern.test(token)) token = uuid(); }
  catch (error) { return { token: null, recovery: null, storageWarning: error.message }; }
  const recovery = financialRecord(saved?.command);
  if (saved?.command && !recovery) storageWarning = 'Saved transaction recovery details are unreadable. Review your account before making another transaction.';
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, command: recovery })); memorySession = undefined; }
  catch { memorySession = { token, command: recovery }; storageWarning = 'Browser session storage is unavailable. Keep this tab open; money commands require saved recovery details.'; }
  return { token, recovery, storageWarning };
}

function unknownOutcome(operation) {
  return `The ${operationNames[operation].toLowerCase()} outcome is unknown. It may have completed. Check the request outcome before another transaction. Refreshing never repeats a money command.`;
}

export function useAtmLiveWorkspace() {
  const [state, setState] = useState(() => {
    const saved = restore();
    return { ...saved, sessionState: 'UNKNOWN', cardNumber: '1111222233334444', pinInput: '',
      activeAccount: null, currentBalance: null, amountInput: saved.recovery ? String(saved.recovery.body.payload.amount) : '500', mode: saved.recovery?.body.payload.mode || 'MINIMIZE_NOTES',
      transactions: null, dispenser: null, receipt: null, errorMsg: saved.recovery ? unknownOutcome(saved.recovery.body.operation) : '',
      successMsg: '', uncertain: saved.recovery?.body.operation || false, recoveryStatus: saved.recovery ? 'UNKNOWN' : '',
      owned: false, bootId: null, revision: null, expiresAt: null, pinAttemptsRemaining: null, needsRefresh: true, endRecoveryConfirmation: false };
  });
  const stateRef = useRef(state);
  const [pending, setPending] = useState('');
  const [reads, setReads] = useState(emptyReads);
  const lifecycle = useRef({ active: false, epoch: 0, operation: null, read: null });
  const update = useCallback(change => {
    const next = typeof change === 'function' ? change(stateRef.current) : { ...stateRef.current, ...change };
    stateRef.current = next;
    setState(next);
  }, []);

  const persist = useCallback(command => {
    const saved = { token: stateRef.current.token, command: financialRecord(command) };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      memorySession = undefined;
      update({ storageWarning: '' });
      return true;
    }
    catch {
      memorySession = { token: saved.token, command: command ? stateRef.current.recovery : null };
      update({ storageWarning: 'Could not save browser recovery details. Keep this tab open. New money commands cannot be sent until session storage is available.' });
      return false;
    }
  }, [update]);

  const cancelRead = useCallback(() => {
    lifecycle.current.read?.controller.abort();
    lifecycle.current.read = null;
    setReads(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, { ...value, loading: false }])));
  }, []);

  const applySnapshot = useCallback(snapshot => {
    if (!snapshot || typeof snapshot.state !== 'string' || typeof snapshot.owned !== 'boolean'
      || typeof snapshot.bootId !== 'string' || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !snapshot.dispenser) {
      throw new Error('The terminal returned an incomplete snapshot. Refresh before making a change.');
    }
    const authenticated = snapshot.owned && snapshot.state === 'AUTHENTICATED';
    update(previous => ({ ...previous, sessionState: snapshot.state, owned: snapshot.owned,
      bootId: snapshot.bootId, revision: snapshot.revision, expiresAt: snapshot.expiresAt,
      pinAttemptsRemaining: snapshot.pinAttemptsRemaining, dispenser: snapshot.dispenser,
      activeAccount: authenticated ? snapshot.account : null,
      currentBalance: authenticated ? snapshot.account?.balance ?? null : null,
      transactions: authenticated ? (snapshot.transactions || []).slice(-50) : null,
      receipt: authenticated && previous.activeAccount?.accountNumber === snapshot.account?.accountNumber ? previous.receipt : null,
      cardNumber: snapshot.owned && snapshot.cardNumber ? snapshot.cardNumber : previous.cardNumber,
      pinInput: snapshot.owned && snapshot.state === 'CARD_INSERTED' && snapshot.cardNumber === previous.cardNumber ? previous.pinInput : '',
      needsRefresh: false, endRecoveryConfirmation: false,
    }));
  }, [update]);

  const clearRecovery = useCallback(() => {
    persist(null);
    update({ recovery: null, recoveryStatus: '', uncertain: false });
  }, [persist, update]);

  const confirm = useCallback((name, result) => {
    if (name === 'eject') {
      clearRecovery();
      update({ receipt: null, pinInput: '', errorMsg: '', successMsg: result?.message || 'Card ejected. Session ended.' });
    } else if (moneyOperations.includes(name)) {
      clearRecovery();
      update({ receipt: result, errorMsg: '', successMsg: `${name === 'withdraw' ? 'Successfully withdrew' : 'Successfully deposited'} ₹${result.amount}.` });
    } else {
      update({ uncertain: false, pinInput: name === 'authenticate' ? '' : stateRef.current.pinInput, errorMsg: '',
        successMsg: name === 'insert' ? 'Card inserted. Please enter your PIN.' : 'PIN verified.' });
    }
  }, [clearRecovery, update]);

  const load = useCallback(async (resource = 'terminal') => {
    const life = lifecycle.current;
    if (!life.active || life.operation || life.read || !stateRef.current.token) return;
    const recovery = stateRef.current.recovery;
    const request = { controller: new AbortController(), epoch: life.epoch };
    life.read = request;
    const current = () => life.active && life.epoch === request.epoch && life.read === request && !request.controller.signal.aborted;
    // Every panel shares a single atomic read; retain the initiating panel's retry label.
    setReads(previous => ({ ...previous, [resource]: { loading: true, error: '' } }));
    try {
      const options = { signal: request.controller.signal };
      const result = recovery ? await api.getTerminalRequest(stateRef.current.token, recovery.requestId, options)
        : await api.getTerminalState(stateRef.current.token, options);
      if (!current()) return;
      applySnapshot(recovery ? result.snapshot : result);
      if (recovery) {
        const outcome = result.outcome;
        if (result.status === 'FOUND' && outcome?.httpStatus >= 200 && outcome.httpStatus < 300 && outcome.result) {
          confirm(recovery.body.operation, outcome.result);
        } else if (result.status === 'FOUND' && outcome?.httpStatus >= 400 && outcome.httpStatus < 500) {
          clearRecovery();
          update({ errorMsg: `${operationNames[recovery.body.operation]} rejected: ${outcome.error || 'The request was rejected.'}`, successMsg: '' });
        } else {
          update({ recoveryStatus: result.status === 'NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
            errorMsg: `${unknownOutcome(recovery.body.operation)} ${result.status === 'NOT_FOUND'
              ? 'No outcome is recorded yet; the original request could still arrive. You may retry the same request with its original amount.'
              : 'The server has no definitive successful or rejected outcome. Do not start another money operation; check again or eject your card.'}` });
        }
      } else if (stateRef.current.uncertain) {
        update({ uncertain: false, errorMsg: 'Terminal state refreshed after an interrupted request. Review the current phase before continuing.' });
      }
      setReads(emptyReads());
    } catch (error) {
      if (current()) {
        update({ needsRefresh: true });
        setReads(previous => ({ ...previous, [resource]: { loading: false, error: error.message || 'Request failed. Please retry.' } }));
      }
    } finally {
      if (current()) {
        life.read = null;
        setReads(previous => ({ ...previous, [resource]: { ...previous[resource], loading: false } }));
      }
    }
  }, [applySnapshot, clearRecovery, confirm, update]);

  const activate = useCallback(() => {
    const life = lifecycle.current;
    life.active = true;
    update({ needsRefresh: true });
    load();
    return () => {
      life.active = false;
      life.epoch += 1;
      cancelRead();
      const operation = life.operation;
      if (operation) {
        operation.controller.abort();
        life.operation = null;
        setPending('');
        update({ uncertain: stateRef.current.recovery?.body.operation || operation.name,
          errorMsg: unknownOutcome(stateRef.current.recovery?.body.operation || operation.name), successMsg: '' });
      }
      update({ pinInput: '', needsRefresh: true, endRecoveryConfirmation: false });
    };
  }, [cancelRead, load, update]);

  const send = async (name, record) => {
    const life = lifecycle.current;
    const request = { name, controller: new AbortController(), epoch: life.epoch };
    life.operation = request;
    cancelRead();
    setPending(name);
    update({ errorMsg: '', successMsg: '' });
    const current = () => life.active && life.epoch === request.epoch && life.operation === request && !request.controller.signal.aborted;
    let failed = false;
    try {
      const result = await api.sendTerminalCommand(stateRef.current.token, record.requestId, record.body, { signal: request.controller.signal });
      if (!current()) return;
      applySnapshot(result.snapshot);
      confirm(name, result.result);
    } catch (error) {
      if (!current()) return;
      failed = true;
      const unknown = !error.status || error.status >= 500;
      // A replay rejection can be pre-admission (stale/expired key), so only the
      // read-only outcome lookup may settle an already uncertain financial request.
      const hadUnknown = record === stateRef.current.recovery && stateRef.current.recoveryStatus !== 'SENDING';
      if (moneyOperations.includes(name) && !unknown && !hadUnknown) clearRecovery();
      const uncertain = stateRef.current.recovery?.body.operation || (unknown ? name : false);
      update({ needsRefresh: true, uncertain, recoveryStatus: stateRef.current.recovery ? 'UNKNOWN' : '',
        errorMsg: `${operationNames[name]} failed: ${error.message || 'Request failed.'}${uncertain ? ` ${unknownOutcome(uncertain)}` : ''}` });
    } finally {
      if (current()) {
        life.operation = null;
        setPending('');
        if (failed) await load();
      }
    }
  };

  const run = async name => {
    const life = lifecycle.current;
    const snapshot = stateRef.current;
    if (!Object.hasOwn(operationNames, name) || !life.active || life.operation || snapshot.needsRefresh || !snapshot.token || !snapshot.bootId) return;
    if (snapshot.uncertain && name !== 'eject') return;
    if (name === 'insert' && (snapshot.sessionState !== 'IDLE' || snapshot.owned)) return;
    if (name !== 'insert' && !snapshot.owned) return;
    if (name === 'authenticate' && snapshot.sessionState !== 'CARD_INSERTED') return;
    if (moneyOperations.includes(name) && (!snapshot.activeAccount || snapshot.sessionState !== 'AUTHENTICATED')) return;
    const payload = name === 'insert' ? { cardNumber: snapshot.cardNumber }
      : name === 'authenticate' ? { cardNumber: snapshot.cardNumber, pin: snapshot.pinInput }
        : moneyOperations.includes(name) ? { accountNumber: snapshot.activeAccount.accountNumber, amount: Number(snapshot.amountInput),
          ...(name === 'withdraw' ? { mode: snapshot.mode } : {}) } : {};
    let record;
    try { record = { requestId: uuid(), body: { operation: name, expectedRevision: snapshot.revision, bootId: snapshot.bootId, payload } }; }
    catch (error) { update({ errorMsg: error.message }); return; }
    if (moneyOperations.includes(name)) {
      record = financialRecord(record);
      if (!record) { update({ errorMsg: 'Enter a finite transaction amount.' }); return; }
      if (!persist(record)) { update({ errorMsg: 'Transaction was not sent because recovery details could not be saved.' }); return; }
      update({ recovery: record, recoveryStatus: 'SENDING' });
    }
    await send(name, record);
  };

  const retrySameRequest = async () => {
    const snapshot = stateRef.current;
    const life = lifecycle.current;
    if (!life.active || life.operation || life.read || snapshot.needsRefresh || !snapshot.recovery || snapshot.recoveryStatus !== 'NOT_FOUND') return;
    // Preserve original boot/revision/key/payload even if the snapshot has changed.
    await send(snapshot.recovery.body.operation, snapshot.recovery);
  };

  const mayEndRecovery = () => {
    const current = stateRef.current;
    const life = lifecycle.current;
    return life.active && !life.operation && !life.read && !current.needsRefresh && !current.owned
      && Boolean(current.recovery && current.uncertain && moneyOperations.includes(current.recovery.body.operation));
  };

  const beginEndRecovery = () => {
    if (mayEndRecovery()) update({ endRecoveryConfirmation: true });
  };
  const cancelEndRecovery = () => update({ endRecoveryConfirmation: false });
  const endRecovery = () => {
    if (!stateRef.current.endRecoveryConfirmation || !mayEndRecovery()) return;
    // The fresh unowned snapshot proves this session ended. This only clears
    // local recovery metadata; it sends no command and makes no reversal claim.
    if (!persist(null)) {
      memorySession = { token: stateRef.current.token, command: stateRef.current.recovery };
      update({ errorMsg: 'Local recovery could not be ended because its saved details could not be cleared. Recovery is still retained.' });
      return;
    }
    update({ recovery: null, recoveryStatus: '', uncertain: false, endRecoveryConfirmation: false,
      errorMsg: '', successMsg: 'Local recovery ended. The transaction may have completed; ending recovery does not reverse it. Review your balance and transaction history after signing in again.' });
  };

  const setDraft = (field, value) => {
    if (!['cardNumber', 'pinInput', 'amountInput', 'mode'].includes(field) || lifecycle.current.operation || stateRef.current.uncertain) return;
    if (field === 'cardNumber' && stateRef.current.sessionState !== 'IDLE') return;
    update({ [field]: value });
  };

  return { ...state, pending, reads, activate, load, run, setDraft, retrySameRequest, beginEndRecovery, cancelEndRecovery, endRecovery };
}
