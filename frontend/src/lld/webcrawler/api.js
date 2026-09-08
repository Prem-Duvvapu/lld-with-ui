import { apiFetch } from '../../utils/api'

export function startCrawl(seedUrls, maxPages, filterPolicy = 'ALLOW_ALL') {
  return apiFetch('/webcrawler/jobs', {
    method: 'POST',
    body: JSON.stringify({ seedUrls, maxPages, filterPolicy }),
  })
}

export function getAllJobs() {
  return apiFetch('/webcrawler/jobs')
}

export function getJob(jobId) {
  return apiFetch(`/webcrawler/jobs/${jobId}`)
}

export function getPages(jobId) {
  return apiFetch(`/webcrawler/jobs/${jobId}/pages`)
}

// Simulation endpoints
export function simReset() {
  return apiFetch('/webcrawler/sim/reset', { method: 'POST' })
}

export function simSeed(seedUrls, maxPages, filterPolicy = 'ALLOW_ALL') {
  return apiFetch('/webcrawler/sim/seed', {
    method: 'POST',
    body: JSON.stringify({ seedUrls, maxPages, filterPolicy }),
  })
}

export function simDispatchWave(jobId) {
  return apiFetch(`/webcrawler/sim/${jobId}/dispatch`, { method: 'POST' })
}

export function simRace(url, workerCount = 6) {
  return apiFetch('/webcrawler/sim/race', {
    method: 'POST',
    body: JSON.stringify({ url, workerCount }),
  })
}

export function simGetEvents() {
  return apiFetch('/webcrawler/sim/events')
}

export function simGetSnapshot() {
  return apiFetch('/webcrawler/sim/snapshot')
}
