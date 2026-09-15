import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'
import { waitForSelector } from './tour/waitForSelector'
import './WebsiteTour.css'

const PADDING = 8

function rectOf(el) {
  return el ? el.getBoundingClientRect() : null
}

/**
 * Hand-rolled spotlight walkthrough — no external tour library, keeps the bundle small.
 *
 * Steps are { selector, title, body, prepare? }. `prepare({ navigate, reveal, isRevealed })`
 * runs before the step is shown and may change route or switch tabs; the step then waits
 * for its target to exist rather than querying once, because a module page's controls only
 * appear after the route change and that page's lazy chunk have both landed.
 */
export default function WebsiteTour({ steps, onFinish }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const navigate = useNavigate()
  const { reveal, isRevealed } = useReveal()

  // Steps read this inside an effect. It's a ref rather than a dependency because
  // `isRevealed` changes the moment a step calls `reveal()` — as a dep that would
  // re-run the step effect and fire `prepare` a second time. Assigned in an effect,
  // not during render: mutating a ref while rendering isn't safe under concurrent React.
  const ctxRef = useRef({ navigate, reveal, isRevealed })
  useEffect(() => {
    ctxRef.current = { navigate, reveal, isRevealed }
  })

  const step = steps[index]

  useEffect(() => {
    let cancelled = false
    let target = null

    const cleanups = []

    const run = async () => {
      setRect(null)

      if (step.prepare) {
        try {
          await step.prepare(ctxRef.current)
        } catch (err) {
          // A step that can't set itself up should still show its text rather than
          // stranding the visitor mid-tour.
          console.error('[WebsiteTour] step prepare failed', err)
        }
      }
      if (cancelled || !step.selector) return

      target = await waitForSelector(step.selector)
      if (cancelled || !target) return

      target.scrollIntoView({ block: 'center', behavior: 'smooth' })

      const update = () => setRect(rectOf(target))
      update()
      const settle = setTimeout(update, 280) // after the smooth scroll lands
      window.addEventListener('resize', update)
      window.addEventListener('scroll', update, true)

      cleanups.push(() => {
        clearTimeout(settle)
        window.removeEventListener('resize', update)
        window.removeEventListener('scroll', update, true)
      })
    }

    run()

    return () => {
      cancelled = true
      cleanups.forEach((fn) => fn())
    }
  }, [step])

  const goNext = useCallback(() => {
    if (index >= steps.length - 1) onFinish()
    else setIndex((i) => i + 1)
  }, [index, steps.length, onFinish])

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onFinish()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goBack, onFinish])

  const isLast = index === steps.length - 1
  const isCentered = !step.selector || !rect

  const spotlightStyle = !isCentered
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null

  let tooltipStyle = {}
  if (!isCentered) {
    const spaceBelow = window.innerHeight - rect.bottom
    const placeBelow = spaceBelow > 220 || rect.top < 220
    const left = Math.min(Math.max(rect.left, 16), Math.max(16, window.innerWidth - 340))
    tooltipStyle = placeBelow
      ? { top: rect.bottom + PADDING + 12, left }
      : { top: rect.top - PADDING - 12, left, transform: 'translateY(-100%)' }
  }

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Site tour">
      {spotlightStyle && <div className="tour-spotlight" style={spotlightStyle} />}
      <div
        className={`tour-tooltip${isCentered ? ' tour-tooltip-centered' : ''}`}
        style={isCentered ? {} : tooltipStyle}
      >
        <button className="tour-skip" onClick={onFinish} aria-label="Skip tour">✕</button>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-footer">
          <div className="tour-dots">
            {steps.map((s, i) => (
              <span key={s.title} className={`tour-dot${i === index ? ' active' : ''}`} />
            ))}
          </div>
          <div className="tour-actions">
            <span className="tour-count">{index + 1}/{steps.length}</span>
            {index > 0 && <button className="tour-btn tour-btn-ghost" onClick={goBack}>Back</button>}
            <button className="tour-btn tour-btn-primary" onClick={goNext}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
