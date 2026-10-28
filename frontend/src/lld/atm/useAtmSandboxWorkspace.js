import { useEffect, useRef, useState } from 'react';
import { simReset, simInsertCard, simAuthenticate, simWithdraw, simEject, simGetState } from './api';

function confirmSnapshot(result) {
  if (!result || typeof result.simState !== 'string' || !Array.isArray(result.accounts)
    || !Array.isArray(result.cards) || !Array.isArray(result.events)
    || !Number.isFinite(result.dispenserCash) || !result.inventory) {
    throw new Error('The sandbox state response is incomplete.');
  }
  return result;
}

// UI request coordination only. Java owns authorization, money and note selection.
export function useAtmSandboxWorkspace() {
  const [snapshot, setSnapshot] = useState(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [burstResult, setBurstResult] = useState(null);
  const [cardNumber, setCardNumber] = useState('CARD-SIM-1');
  const [pin, setPin] = useState('1234');
  const [amount, setAmount] = useState('300');
  const [mode, setMode] = useState('MINIMIZE_NOTES');
  const mounted = useRef(false);
  const request = useRef(null);
  const pendingBurst = useRef(null);
  const uncertain = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  const alive = signal => mounted.current && !signal.aborted;
  const apply = (result, next, signal) => {
    if (!alive(signal)) return;
    confirmSnapshot(result);
    uncertain.current = false;
    setSnapshot(result);
    setStep(next);
    setNeedsRefresh(false);
  };
  const run = async (task, read = false) => {
    if (request.current || !mounted.current || (uncertain.current && !read)) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try { await task(controller.signal); }
    catch (failure) {
      if (alive(controller.signal)) {
        uncertain.current = true;
        setError(failure.message || 'The sandbox response could not be confirmed.');
        setNeedsRefresh(true);
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (alive(controller.signal)) setBusy(false);
    }
  };

  const refresh = () => run(async signal => {
    const result = confirmSnapshot(await simGetState({ signal }));
    if (!alive(signal)) return;
    const next = pendingBurst.current ? 6
      : result.simState === 'AUTHENTICATED' ? 4
        : ['CARD_INSERTED', 'CARD_BLOCKED'].includes(result.simState) ? 3 : 1;
    apply(result, next, signal);
    if (pendingBurst.current) { setBurstResult(pendingBurst.current); pendingBurst.current = null; }
  }, true);

  const reset = () => run(async signal => {
    const result = await simReset({ signal });
    if (!alive(signal)) return;
    apply(result, 1, signal);
    setBurstResult(null); pendingBurst.current = null;
  });
  const insert = () => run(async signal => {
    const result = await simInsertCard(cardNumber, { signal });
    apply(result, result.simState === 'CARD_INSERTED' ? 3 : 2, signal);
    if (alive(signal) && result.simState !== 'CARD_INSERTED') setError('The card could not be inserted. Inspect its status or reset the sandbox.');
  });
  const authenticate = () => run(async signal => {
    const result = await simAuthenticate(snapshot.activeCard.cardNumber, pin, { signal });
    apply(result, result.simState === 'AUTHENTICATED' ? 4 : 3, signal);
    if (alive(signal) && result.simState !== 'AUTHENTICATED') setError(result.simState === 'CARD_BLOCKED' ? 'Card blocked after failed PIN attempts. Eject the card or reset the sandbox.' : 'Incorrect PIN. Check the seeded card and try again.');
  });
  const withdraw = () => run(async signal => {
    const result = await simWithdraw(snapshot.activeAccount.accountNumber, Number(amount), mode, { signal });
    if (!['SUCCESS', 'REJECTED', 'INSUFFICIENT_BALANCE', 'DISPENSER_FAILED'].includes(result?.withdrawalOutcome)) {
      throw new Error('The withdrawal outcome could not be confirmed.');
    }
    const accepted = result.withdrawalOutcome === 'SUCCESS';
    apply(result, accepted ? 5 : 4, signal);
    if (alive(signal) && !accepted) setError('Withdrawal was not approved. Inspect the event log and adjust the request.');
  });
  const burst = () => run(async signal => {
    const attempts = 10;
    const results = await Promise.allSettled(Array.from({ length: attempts }, () =>
      simWithdraw(snapshot.activeAccount.accountNumber, 600, mode, { signal })));
    if (!alive(signal)) return;
    pendingBurst.current = {
      attempts,
      approved: results.filter(r => r.status === 'fulfilled' && r.value.withdrawalOutcome === 'SUCCESS').length,
      unconfirmed: results.filter(r => r.status === 'rejected' || !['SUCCESS', 'REJECTED', 'INSUFFICIENT_BALANCE', 'DISPENSER_FAILED'].includes(r.value?.withdrawalOutcome)).length,
    };
    // No per-request snapshot can establish the final state, regardless of response order.
    const finalState = await simGetState({ signal });
    if (!alive(signal)) return;
    apply(finalState, 6, signal);
    setBurstResult(pendingBurst.current); pendingBurst.current = null;
  });
  const eject = () => run(async signal => {
    const result = await simEject({ signal });
    apply(result, 7, signal);
  });
  const exit = () => {
    if (request.current) return;
    uncertain.current = false;
    setSnapshot(null); setStep(0); setError(''); setNeedsRefresh(false);
    setBurstResult(null); pendingBurst.current = null;
  };
  return {
    snapshot, step, busy, error, needsRefresh, burstResult,
    cardNumber, setCardNumber, pin, setPin, amount, setAmount, mode, setMode,
    reset, insert, authenticate, withdraw, burst, eject, refresh, exit,
    next: () => { if (!request.current && !uncertain.current) setStep(2); },
  };
}
