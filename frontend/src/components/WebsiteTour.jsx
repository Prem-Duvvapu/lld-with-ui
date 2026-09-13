import { useEffect, useState, useCallback } from 'react'
import './WebsiteTour.css'

const PADDING = 8

function getTargetRect(selector) {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  return el.getBoundingClientRect()
}

/**
 * Hand-rolled spotlight walkthrough — no external tour library, keeps the
 * bundle small. `steps` is an array of { selector, title, body }; a step
 * with selector: null renders as a centered modal (welcome/closing steps).
 */
export default function WebsiteTour({ steps, onFinish }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)

  const step = steps[index]

  useEffect(() => {
    const selector = step.selector
    if (!selector) {
      setRect(null)
      return
    }
    const el = document.querySelector(selector)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })

    const update = () => setRect(getTargetRect(selector))
    update()
    const t = setTimeout(update, 260) // after scroll settles
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step.selector])

  const goNext = useCallback(() => {
    if (index >= steps.length - 1) {
      onFinish()
    } else {
      setIndex(i => i + 1)
    }
  }, [index, steps.length, onFinish])

  const goBack = useCallback(() => {
    setIndex(i => Math.max(0, i - 1))
  }, [])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onFinish()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goBack, onFinish])

  const isLast = index === steps.length - 1
  const isCentered = !step.selector || !rect

  const spotlightStyle = !isCentered ? {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  } : null

  let tooltipStyle = {}
  if (!isCentered) {
    const spaceBelow = window.innerHeight - rect.bottom
    const placeBelow = spaceBelow > 220 || rect.top < 220
    tooltipStyle = placeBelow
      ? { top: rect.bottom + PADDING + 12, left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340) }
      : { top: rect.top - PADDING - 12, left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340), transform: 'translateY(-100%)' }
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
            {steps.map((_, i) => (
              <span key={i} className={`tour-dot${i === index ? ' active' : ''}`} />
            ))}
          </div>
          <div className="tour-actions">
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
