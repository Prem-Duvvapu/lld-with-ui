import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useRevisit } from '../hooks/useRevisit'
import { useSiteTour } from '../context/SiteTourContext'
import { ALL_DESIGN_PATTERNS, getModulePatterns } from '../data/modulePatterns'
import { downloadProgress, readProgressFile, importProgress } from '../utils/progressData'
import { ALL_LLDS, routeMap, itemPath, DIFFICULTIES, DIFF_COLORS, CAT_COLORS, CAT_FILL_COLORS } from '../data/moduleCatalog'
import './Home.css'

function formatReviewedDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [pattern, setPattern] = useState('All')
  const [unreviewedOnly, setUnreviewedOnly] = useState(false)
  const [revisitOnly, setRevisitOnly] = useState(false)
  const [sortByOrder, setSortByOrder] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { toggle: toggleReviewed, isReviewed, reviewedAt, count: reviewedCount } = useProgress()
  const { toggleRevisit, isRevisit } = useRevisit()
  const { startTour } = useSiteTour()
  const [importStatus, setImportStatus] = useState(null)

  const searchInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const cardRefs = useRef([])
  const menuRef = useRef(null)

  const filtered = useMemo(() => {
    const result = ALL_LLDS.filter(item => {
      const matchSearch = !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      const matchDiff = difficulty === 'All' || item.difficulty === difficulty
      const path = itemPath(item)
      const matchPattern = pattern === 'All' || getModulePatterns(path).includes(pattern)
      const matchReviewed = !unreviewedOnly || !isReviewed(path)
      const matchRevisit = !revisitOnly || isRevisit(path)
      return matchSearch && matchDiff && matchPattern && matchReviewed && matchRevisit
    })
    return sortByOrder ? [...result].sort((a, b) => a.order - b.order) : result
  }, [query, difficulty, pattern, unreviewedOnly, revisitOnly, sortByOrder, isReviewed, isRevisit])

  useEffect(() => {
    cardRefs.current.length = filtered.length
  }, [filtered])

  const progressPct = ALL_LLDS.length > 0 ? Math.round((reviewedCount / ALL_LLDS.length) * 100) : 0

  const activeFilterCount = [pattern !== 'All', unreviewedOnly, revisitOnly, sortByOrder]
    .filter(Boolean).length

  const categoryStats = useMemo(() => {
    const stats = {}
    ALL_LLDS.forEach(item => {
      const path = itemPath(item)
      if (!stats[item.category]) stats[item.category] = { total: 0, reviewed: 0 }
      stats[item.category].total += 1
      if (isReviewed(path)) stats[item.category].reviewed += 1
    })
    return stats
  }, [isReviewed])

  const handleSurpriseMe = () => {
    const allPaths = ALL_LLDS.map(itemPath)
    const unreviewed = allPaths.filter(p => !isReviewed(p))
    const pool = unreviewed.length > 0 ? unreviewed : allPaths
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/${pick}`)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const payload = await readProgressFile(file)
      importProgress(payload)
      setImportStatus({ type: 'success', message: 'Progress imported — reloading…' })
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message || 'Could not import that file.' })
      setTimeout(() => setImportStatus(null), 4000)
    }
  }

  // Keyboard shortcuts: "/" focuses search, Esc clears it, arrow keys move
  // focus between cards (native <a> focus, so Enter opens the focused card
  // for free). Skipped entirely while typing in any field.
  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement
      const isTyping = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)

      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        if (isTyping) active.blur()
        setQuery('')
        return
      }
      if (isTyping) return

      const cards = cardRefs.current
      if (cards.length === 0) return
      const currentIndex = cards.indexOf(active)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        cards[Math.min(currentIndex + 1, cards.length - 1)]?.focus()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        cards[Math.max(currentIndex - 1, 0)]?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close the actions menu on an outside click, same as any dropdown.
  useEffect(() => {
    if (!menuOpen) return undefined
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-title-row">
          <div>
            <h1>Low Level Design Patterns</h1>
            <p className="home-subtitle">60 interactive modules — each with a live UI, class diagram, and working Java backend</p>
          </div>
          <div className="home-menu" ref={menuRef}>
            <button
              type="button"
              className="menu-toggle"
              aria-label="More actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              ☰
            </button>
            {menuOpen && (
              <div className="home-menu-panel" role="menu">
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); handleSurpriseMe() }}>
                  🎲 Surprise me
                </button>
                <Link to="/learning-path" className="home-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  📚 Learning path
                </Link>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); downloadProgress() }}>
                  ⬇️ Export progress
                </button>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); handleImportClick() }}>
                  ⬆️ Import progress
                </button>
                <button type="button" className="home-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); startTour() }}>
                  🧭 Take a tour
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              hidden
            />
          </div>
        </div>

        {importStatus && (
          <p className={`import-status import-status-${importStatus.type}`}>{importStatus.message}</p>
        )}

        <div className="progress-summary" data-tour="progress">
          <button
            type="button"
            className="progress-summary-label progress-toggle"
            aria-expanded={progressOpen}
            onClick={() => setProgressOpen(o => !o)}
          >
            <span>📈 Your progress</span>
            <span>{reviewedCount} / {ALL_LLDS.length} reviewed {progressOpen ? '▲' : '▾'}</span>
          </button>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          {progressOpen && (
            <div className="category-breakdown">
              {Object.keys(CAT_COLORS).filter(cat => categoryStats[cat]).map(cat => {
                const stat = categoryStats[cat]
                const pct = stat.total > 0 ? Math.round((stat.reviewed / stat.total) * 100) : 0
                return (
                  <div key={cat} className="category-stat">
                    <div className="category-stat-label">
                      <span>{cat}</span>
                      <span>{stat.reviewed}/{stat.total}</span>
                    </div>
                    <div className="category-stat-track">
                      <div className="category-stat-fill" style={{ width: `${pct}%`, background: CAT_FILL_COLORS[cat] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="home-controls">
          <div className="search-wrap">
            <div className="search-bar" data-tour="search">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, description, or category..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && <button className="search-clear" onClick={() => setQuery('')}>✕</button>}
            </div>
            <span className="kbd-hint"><kbd>/</kbd> to search · <kbd>Esc</kbd> to clear · <kbd>←↑↓→</kbd> to browse</span>
          </div>

          <div className="diff-filters" data-tour="difficulty">
            {DIFFICULTIES.map(d => {
              const c = DIFF_COLORS[d]
              const active = difficulty === d
              return (
                <button
                  key={d}
                  className="diff-pill"
                  style={active && c ? {
                    background: c.bg,
                    color: c.text,
                    borderColor: c.border,
                  } : {}}
                  onClick={() => setDifficulty(d)}
                >
                  {d === 'All' ? 'All Levels' : d}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className={`filters-toggle${activeFilterCount > 0 ? ' has-active' : ''}`}
            data-tour="filters-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(o => !o)}
          >
            ⚙️ Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>

        {filtersOpen && (
          <div className="filters-panel">
            <select
              className="pattern-select"
              data-tour="pattern"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              aria-label="Filter by design pattern"
            >
              <option value="All">All patterns</option>
              {ALL_DESIGN_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label className="unreviewed-toggle" data-tour="unreviewed">
              <input
                type="checkbox"
                checked={unreviewedOnly}
                onChange={e => setUnreviewedOnly(e.target.checked)}
              />
              Show only what's left to review
            </label>

            <label className="unreviewed-toggle">
              <input
                type="checkbox"
                checked={revisitOnly}
                onChange={e => setRevisitOnly(e.target.checked)}
              />
              🔖 Flagged for revisit only
            </label>

            <label className="unreviewed-toggle">
              <input
                type="checkbox"
                checked={sortByOrder}
                onChange={e => setSortByOrder(e.target.checked)}
              />
              📚 Suggested learning order
            </label>
          </div>
        )}

        {sortByOrder && (
          <p className="learn-order-hint">
            Sorted beginner → advanced: simple state machines first, then one design
            pattern at a time, basic ReentrantLock usage, the raw concurrency primitives,
            booking/reservation systems, multi-actor marketplaces, graph/event platforms,
            game-tree logic, and finally the pattern-dense modules that combine a real
            concurrency race with a GoF pattern. Full breakdown on the{' '}
            <Link to="/learning-path">Learning path</Link> page.
          </p>
        )}

        <p className="home-result-count">{filtered.length} module{filtered.length !== 1 ? 's' : ''} found</p>
      </header>

      <div className="lld-grid">
        {filtered.map((item, i) => {
          const dc = DIFF_COLORS[item.difficulty]
          const catBg = CAT_COLORS[item.category]
          const path = item.key || routeMap[item.title]
          const reviewed = isReviewed(path)
          const revisit = isRevisit(path)
          const reviewedDate = formatReviewedDate(reviewedAt(path))
          return (
            <Link
              key={path}
              to={`/${path}`}
              className={`lld-card${reviewed ? ' reviewed' : ''}${revisit ? ' flagged-revisit' : ''}`}
              ref={el => { cardRefs.current[i] = el }}
              {...(i === 0 ? { 'data-tour': 'first-card' } : {})}
            >
              <button
                type="button"
                className="review-toggle"
                aria-label={reviewed ? `Mark ${item.title} as not reviewed` : `Mark ${item.title} as reviewed`}
                aria-pressed={reviewed}
                title={reviewed ? `Reviewed ${reviewedDate} — click to unmark` : 'Mark as reviewed'}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleReviewed(path) }}
              >
                {reviewed ? '✓' : ''}
              </button>
              <button
                type="button"
                className="revisit-toggle"
                aria-label={revisit ? `Unflag ${item.title} for revisit` : `Flag ${item.title} for revisit`}
                aria-pressed={revisit}
                title={revisit ? 'Flagged for revisit — click to unflag' : 'Flag for revisit'}
                onClick={e => { e.preventDefault(); e.stopPropagation(); toggleRevisit(path) }}
              >
                🔖
              </button>
              <span className="lld-icon">{item.icon}</span>
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
              <div className="lld-tags">
                {sortByOrder && (
                  <span className="lld-tag lld-order-tag">Step {item.order}</span>
                )}
                <span className="lld-tag lld-cat-tag" style={{ background: catBg }}>
                  {item.category}
                </span>
                <span className="lld-tag lld-diff-tag" style={{
                  background: dc.bg, color: dc.text, borderColor: dc.border,
                }}>
                  {item.difficulty}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
