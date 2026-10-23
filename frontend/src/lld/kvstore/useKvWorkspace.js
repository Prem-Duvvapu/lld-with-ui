import { useCallback, useEffect, useRef, useState } from 'react';
import { useTransientMessage } from '../../hooks/useTransientMessage';
import * as api from './api';

function checkedEntry(entry) {
  if (!entry || typeof entry.value !== 'string' || !Number.isSafeInteger(entry.version) || entry.version < 1
      || (entry.expiresAtEpoch != null && !Number.isSafeInteger(entry.expiresAtEpoch))) {
    throw new Error('The server returned a record this view cannot display reliably. Try reading it again.');
  }
  return entry;
}

const requiredKey = value => value.trim() ? '' : 'Enter a key.';
const positiveWholeNumber = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export function useKvWorkspace() {
  const [draft, setDraft] = useState({ setKey: 'welcome', setValue: '', ttl: '', getKey: 'welcome', casKey: 'welcome', expectedVersion: '1', newValue: '' });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useTransientMessage();
  const [pending, setPending] = useState(null);
  const [record, setRecord] = useState(null);
  const [missing, setMissing] = useState(null);
  const [recent, setRecent] = useState([]);
  const [retryRead, setRetryRead] = useState(null);
  const [uncertain, setUncertain] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const scope = useRef(null);
  const request = useRef(null);
  const interrupted = useRef(null);

  // The state owner stays above LldPage's built-in tabs. The visible workspace
  // attaches a scope; leaving either live tab cancels waiting, never server work.
  const activate = useCallback(() => {
    const current = { controller: new AbortController(), active: true };
    scope.current = current;
    setPending(null);
    setConfirmation(null);
    if (interrupted.current) {
      setUncertain({ ...interrupted.current, inspected: false });
      interrupted.current = null;
    }
    return () => {
      current.active = false;
      current.controller.abort();
      if (request.current?.scope === current) {
        if (request.current.kind !== 'GET') interrupted.current = { key: request.current.key, kind: request.current.kind };
        request.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (scope.current) {
      scope.current.active = false;
      scope.current.controller.abort();
    }
    request.current = null;
  }, []);

  const update = (name, value) => {
    if (request.current) return;
    setDraft(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: '' }));
  };

  const validate = fields => {
    if (request.current) return null;
    const invalid = Object.fromEntries(Object.entries(fields).filter(([, message]) => message));
    setErrors(invalid);
    if (!Object.keys(invalid).length) return null;
    setFeedback({ type: 'error', text: 'Check the highlighted fields.' });
    return Object.keys(invalid)[0];
  };

  const markInspected = key => setUncertain(previous => previous?.key === key ? { ...previous, inspected: true } : previous);
  const perform = async ({ kind, key, operation, onSuccess, onFailure, forCas = false }) => {
    const current = scope.current;
    if (request.current || !current?.active) return;
    const controller = current.controller;
    const active = { scope: current, controller, kind, key, forCas };
    request.current = active; // synchronous guard, including two submits in one render
    setPending({ kind, key });
    setFeedback(null);
    setRetryRead(null);
    setMissing(null);
    try {
      const response = await operation({ signal: controller.signal });
      if (request.current !== active || controller.signal.aborted) return;
      onSuccess(response);
    } catch (cause) {
      if (request.current !== active || controller.signal.aborted) return;
      const status = cause.status ? ` (HTTP ${cause.status})` : '';
      setFeedback({ type: 'error', text: `${kind} ${JSON.stringify(key)}: ${cause.message || 'The request failed.'}${status}` });
      if (kind !== 'GET' && (!cause.status || cause.status >= 500)) setUncertain({ kind, key, inspected: false });
      onFailure?.(cause);
    } finally {
      // An old aborted request must not unlock a newer request after tab return.
      if (request.current === active) {
        request.current = null;
        if (!controller.signal.aborted) setPending(null);
      }
    }
  };

  const read = (key = draft.getKey, forCas = false) => {
    if (request.current) return null;
    const invalid = validate({ [forCas ? 'casKey' : 'getKey']: requiredKey(key) });
    if (invalid) return invalid;
    void perform({
      kind: 'GET', key, forCas,
      operation: options => api.get(key, options),
      onSuccess: data => {
        const entry = checkedEntry(data);
        setRecord({ key, entry, source: 'GET' });
        if (forCas) setDraft(previous => previous.casKey === key ? { ...previous, expectedVersion: String(entry.version) } : previous);
        markInspected(key);
        setFeedback({ type: 'success', text: `Read ${JSON.stringify(key)} at version ${entry.version}.` });
      },
      onFailure: cause => {
        // A route/proxy 404 is not evidence that the Java store has no key.
        if (cause.status === 404 && cause.body?.code === 'KeyNotFoundException') {
          setMissing(key);
          markInspected(key);
        } else setRetryRead({ key, forCas });
      },
    });
    return null;
  };

  const submitSet = () => {
    if (request.current || uncertain) return null;
    const invalid = validate({ setKey: requiredKey(draft.setKey), ttl: draft.ttl === '' || positiveWholeNumber(draft.ttl) ? '' : 'Use positive whole seconds, or leave TTL blank.' });
    if (invalid) return invalid;
    const key = draft.setKey;
    void perform({
      kind: 'SET', key,
      operation: options => api.set(key, draft.setValue, draft.ttl === '' ? undefined : Number(draft.ttl), options),
      onSuccess: data => {
        const entry = checkedEntry(data);
        setRecord({ key, entry, source: 'SET' });
        setRecent(previous => [{ key, entry }, ...previous.filter(item => item.key !== key)].slice(0, 10));
        setFeedback({ type: 'success', text: `SET ${JSON.stringify(key)} succeeded at version ${entry.version}.` });
      },
    });
    return null;
  };

  const submitCas = () => {
    if (request.current || uncertain) return null;
    const invalid = validate({ casKey: requiredKey(draft.casKey), expectedVersion: positiveWholeNumber(draft.expectedVersion) ? '' : 'Enter a positive whole version number.' });
    if (invalid) return invalid;
    const key = draft.casKey;
    void perform({
      kind: 'CAS', key,
      operation: options => api.cas(key, Number(draft.expectedVersion), draft.newValue, options),
      onSuccess: data => {
        const entry = checkedEntry(data);
        setRecord({ key, entry, source: 'CAS' });
        setFeedback({ type: 'success', text: `CAS ${JSON.stringify(key)} succeeded at version ${entry.version}.` });
      },
    });
    return null;
  };

  const confirmDelete = () => {
    if (request.current || uncertain || !confirmation) return;
    const key = confirmation;
    void perform({
      kind: 'DELETE', key,
      operation: options => api.del(key, options),
      onSuccess: () => {
        setRecent(previous => previous.filter(item => item.key !== key));
        setRecord(previous => previous?.key === key ? null : previous);
        setConfirmation(null);
        setFeedback({ type: 'success', text: `Deleted ${JSON.stringify(key)}.` });
      },
    });
  };

  const stopWaiting = () => {
    const active = request.current;
    if (!active) return;
    request.current = null;
    active.controller.abort();
    active.scope.controller = new AbortController();
    setPending(null);
    if (active.kind === 'GET') setRetryRead({ key: active.key, forCas: active.forCas });
    else setUncertain({ key: active.key, kind: active.kind, inspected: false });
    setFeedback({ type: 'info', text: 'Stopped waiting. This does not cancel work already received by the server.' });
  };

  return {
    draft, update, errors, feedback, pending, record, missing, recent, retryRead, uncertain,
    confirmation, setConfirmation, activate, read, submitSet, submitCas, confirmDelete, stopWaiting,
    allowWrites: () => setUncertain(previous => previous?.inspected ? null : previous),
  };
}
