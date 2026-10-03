import { ApiError } from './api';

export async function expectSimulationRejection(action, status, code) {
  try {
    await action();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === status && cause.body?.code === code) return cause.message;
    throw cause;
  }
  throw new Error('The expected rejection did not occur. Reset the sandbox to continue.');
}
