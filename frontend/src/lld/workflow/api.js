import { apiFetch } from '../../utils/api'

export function submit(requester, amount, escalationStrategyType) {
  return apiFetch('/workflow', {
    method: 'POST',
    body: JSON.stringify({ requester, amount, escalationStrategyType }),
  })
}

export function getWorkflow(id) {
  return apiFetch(`/workflow/${encodeURIComponent(id)}`)
}

export function getAllWorkflows() {
  return apiFetch('/workflow')
}

export function approve(id, approverId, role) {
  return apiFetch(`/workflow/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approverId, role }),
  })
}

export function reject(id, approverId, role, reason) {
  return apiFetch(`/workflow/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approverId, role, reason }),
  })
}

export function escalate(id, stepIndex) {
  return apiFetch(`/workflow/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ stepIndex }),
  })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/workflow/sim/reset', { method: 'POST' })
}

export function simSubmit(requester, amount, escalationStrategyType) {
  return apiFetch('/workflow/sim/submit', {
    method: 'POST',
    body: JSON.stringify({ requester, amount, escalationStrategyType }),
  })
}

export function simApprove(id, approverId, role) {
  return apiFetch(`/workflow/sim/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ approverId, role }),
  })
}

export function simReject(id, approverId, role, reason) {
  return apiFetch(`/workflow/sim/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ approverId, role, reason }),
  })
}

export function simRace(id, approverId = 'RaceApprover') {
  return apiFetch(`/workflow/sim/${encodeURIComponent(id)}/race`, {
    method: 'POST',
    body: JSON.stringify({ approverId }),
  })
}

export function simGetEvents() {
  return apiFetch('/workflow/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/workflow/sim/snapshot')
}
