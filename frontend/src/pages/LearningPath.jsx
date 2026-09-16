import { Link } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { ALL_LLDS, LEARNING_PHASES, DIFF_COLORS, itemPath } from '../data/moduleCatalog'
import './LearningPath.css'

export default function LearningPath() {
  const { isReviewed, count: reviewedCount } = useProgress()

  const sorted = [...ALL_LLDS].sort((a, b) => a.order - b.order)

  return (
    <div className="learning-path">
      <nav className="learning-path-breadcrumb">
        <Link to="/">← Home</Link>
      </nav>

      <header className="learning-path-header">
        <h1>📚 Learning Path</h1>
        <p className="learning-path-subtitle">
          All 60 modules in a suggested order — foundations first, then one design pattern
          at a time, concurrency, and finally the pattern-dense modules that pair a real
          GoF pattern with an actual race condition. {reviewedCount} / {ALL_LLDS.length} reviewed.
        </p>
      </header>

      {LEARNING_PHASES.map((phase, phaseIndex) => {
        const items = sorted.filter(item => item.order >= phase.range[0] && item.order <= phase.range[1])
        return (
          <section key={phase.name} className="learning-phase">
            <div className="learning-phase-header">
              <span className="learning-phase-number">Phase {phaseIndex + 1}</span>
              <h2>{phase.name}</h2>
              <p>{phase.blurb}</p>
            </div>
            <ol className="learning-phase-list">
              {items.map(item => {
                const path = itemPath(item)
                const dc = DIFF_COLORS[item.difficulty]
                const reviewed = isReviewed(path)
                return (
                  <li key={path}>
                    <Link to={`/${path}`} className={`learning-path-row${reviewed ? ' reviewed' : ''}`}>
                      <span className="learning-path-step">{item.order}</span>
                      <span className="learning-path-icon">{item.icon}</span>
                      <span className="learning-path-title">{item.title}</span>
                      <span className="learning-path-diff" style={{
                        background: dc.bg, color: dc.text, borderColor: dc.border,
                      }}>
                        {item.difficulty}
                      </span>
                      {reviewed && <span className="learning-path-reviewed" title="Reviewed">✓</span>}
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
