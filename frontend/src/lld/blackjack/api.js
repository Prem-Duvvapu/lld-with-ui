import { apiFetch } from '../../utils/api'

export function createTable(dealerStrategyType = 'HIT_ON_SOFT_17') {
  return apiFetch('/blackjack/tables', {
    method: 'POST',
    body: JSON.stringify({ dealerStrategyType }),
  })
}

export function getAllTables() {
  return apiFetch('/blackjack/tables')
}

export function getTable(tableId) {
  return apiFetch(`/blackjack/${tableId}`)
}

export function deal(tableId) {
  return apiFetch(`/blackjack/${tableId}/deal`, { method: 'POST' })
}

export function hit(tableId) {
  return apiFetch(`/blackjack/${tableId}/hit`, { method: 'POST' })
}

export function stand(tableId) {
  return apiFetch(`/blackjack/${tableId}/stand`, { method: 'POST' })
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/blackjack/sim/reset', { method: 'POST' })
}

export function simCreateTable(dealerStrategyType = 'HIT_ON_SOFT_17') {
  return apiFetch('/blackjack/sim/tables', {
    method: 'POST',
    body: JSON.stringify({ dealerStrategyType }),
  })
}

export function simDeal(tableId) {
  return apiFetch(`/blackjack/sim/${tableId}/deal`, { method: 'POST' })
}

export function simHit(tableId) {
  return apiFetch(`/blackjack/sim/${tableId}/hit`, { method: 'POST' })
}

export function simStand(tableId) {
  return apiFetch(`/blackjack/sim/${tableId}/stand`, { method: 'POST' })
}

export function simRace(tableCount = 15) {
  return apiFetch('/blackjack/sim/race', {
    method: 'POST',
    body: JSON.stringify({ tableCount }),
  })
}

export function simGetEvents() {
  return apiFetch('/blackjack/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/blackjack/sim/snapshot')
}
