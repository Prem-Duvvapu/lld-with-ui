import { useCallback, useState } from 'react'

const STORAGE_KEY = 'lld-tour-seen-v1'

function loadSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function saveSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // storage unavailable — tour will just auto-show again next visit
  }
}

export function useTour() {
  const [hasSeenTour, setHasSeenTour] = useState(loadSeen)

  const markSeen = useCallback(() => {
    setHasSeenTour(true)
    saveSeen()
  }, [])

  return { hasSeenTour, markSeen }
}
