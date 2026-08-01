import React, { useState, useEffect, useRef } from 'react';
import classDiagrams from '../data/classDiagrams';

const COLORS = ['#2563eb', '#dc2626', '#0284c7', '#16a34a', '#7c3aed', '#db2777', '#059669', '#d97706', '#4f46e5', '#9333ea'];

const ALIAS_MAP = {
  'parking-lot': 'parking',
  'coffee-machine': 'coffee',
  'coffeemachine': 'coffee',
  'digital-wallet': 'wallet',
  'digitalwallet': 'wallet',
  'movie-ticket': 'movieticket',
  'snake-ladders': 'snakeladders',
  'tic-tac-toe': 'tictactoe'
};

export default function ClassDiagram({ module, customData }) {
  const resolvedKey = ALIAS_MAP[module] || module;
  const camelKey = resolvedKey ? resolvedKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : null;
  const noHyphenKey = resolvedKey ? resolvedKey.replace(/-/g, '') : null;

  const data = customData
    || classDiagrams[resolvedKey]
    || (camelKey ? classDiagrams[camelKey] : null)
    || (noHyphenKey ? classDiagrams[noHyphenKey] : null);

  const containerRef = useRef(null);
  const [, setMounted] = useState(false);
  const [activeClass, setActiveClass] = useState(null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'list'
  const [lineCoords, setLineCoords] = useState([]);

  const classes = data?.classes || [];
  const relationships = data?.relationships || [];

  const updateLineCoords = () => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    const newCoords = relationships.map((rel) => {
      const fromEl = container.querySelector(`[data-class="${rel.from}"]`);
      const toEl = container.querySelector(`[data-class="${rel.to}"]`);
      if (!fromEl || !toEl) return null;

      const fRect = fromEl.getBoundingClientRect();
      const tRect = toEl.getBoundingClientRect();

      const fCenter = { x: fRect.left + fRect.width / 2 - cRect.left, y: fRect.top + fRect.height / 2 - cRect.top };
      const tCenter = { x: tRect.left + tRect.width / 2 - cRect.left, y: tRect.top + tRect.height / 2 - cRect.top };

      const dx = tCenter.x - fCenter.x;
      const dy = tCenter.y - fCenter.y;

      let x1, y1, x2, y2;

      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        // Horizontal connection (same or adjacent column in row)
        if (dx > 0) {
          x1 = fRect.right - cRect.left;
          y1 = fCenter.y;
          x2 = tRect.left - cRect.left;
          y2 = tCenter.y;
        } else {
          x1 = fRect.left - cRect.left;
          y1 = fCenter.y;
          x2 = tRect.right - cRect.left;
          y2 = tCenter.y;
        }
      } else {
        // Vertical connection (different rows)
        if (dy > 0) {
          x1 = fCenter.x;
          y1 = fRect.bottom - cRect.top;
          x2 = tCenter.x;
          y2 = tRect.top - cRect.top;
        } else {
          x1 = fCenter.x;
          y1 = fRect.top - cRect.top;
          x2 = tCenter.x;
          y2 = tRect.bottom - cRect.top;
        }
      }

      return { rel, x1, y1, x2, y2 };
    }).filter(Boolean);

    setLineCoords(newCoords);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      updateLineCoords();
    }, 80);

    window.addEventListener('resize', updateLineCoords);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLineCoords);
    };
  }, [module, viewMode]);

  if (!data) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>
        Class diagram not available for this module yet.
      </div>
    );
  }

  const title = data.title || `${module} Class Diagram`;
  const classColors = {};
  classes.forEach((c, i) => { classColors[c.name] = COLORS[i % COLORS.length]; });

  const isClassHighlighted = (className) => {
    if (!activeClass) return true;
    if (activeClass === className) return true;
    return relationships.some(r => (r.from === activeClass && r.to === className) || (r.to === activeClass && r.from === className));
  };

  const isRelHighlighted = (rel) => {
    if (!activeClass) return true;
    return rel.from === activeClass || rel.to === activeClass;
  };

  return (
    <div className="class-diagram-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 className="cd-title" style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('graph')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: viewMode === 'graph' ? '1px solid var(--accent)' : '1px solid var(--border-primary)',
              background: viewMode === 'graph' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: viewMode === 'graph' ? '#fff' : 'var(--text-primary)'
            }}
          >
            📐 Graph View
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: viewMode === 'list' ? '1px solid var(--accent)' : '1px solid var(--border-primary)',
              background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: viewMode === 'list' ? '#fff' : 'var(--text-primary)'
            }}
          >
            📋 Relationships List ({relationships.length})
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 16 }}>
        💡 <em>Hover or click any class box to highlight its specific connections.</em>
      </p>

      {viewMode === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
          {relationships.map((rel, idx) => (
            <div key={idx} style={{
              padding: 14, borderRadius: 8, border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: classColors[rel.from] || 'var(--accent)' }}>{rel.from}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}>
                  {rel.dashed ? 'implements / extends' : 'associates'}
                </span>
                <span style={{ color: classColors[rel.to] || 'var(--accent)' }}>{rel.to}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                Label: "{rel.label || 'uses'}"
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="cd-container" style={{ position: 'relative', minHeight: 460 }}>
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', padding: '10px 0' }}>
            {classes.map((cls) => {
              const fields = Array.isArray(cls.fields) ? cls.fields : [];
              const methods = Array.isArray(cls.methods) ? cls.methods : [];
              const highlighted = isClassHighlighted(cls.name);

              return (
                <div
                  key={cls.name}
                  data-class={cls.name}
                  className={`cd-class-box ${highlighted ? 'highlighted' : 'dimmed'}`}
                  style={{
                    borderTopColor: classColors[cls.name],
                    opacity: highlighted ? 1 : 0.25,
                    transform: activeClass === cls.name ? 'scale(1.03)' : 'none',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseEnter={() => setActiveClass(cls.name)}
                  onMouseLeave={() => setActiveClass(null)}
                  onClick={() => setActiveClass(activeClass === cls.name ? null : cls.name)}
                >
                  <div className="cd-class-header" style={{ background: classColors[cls.name] }}>
                    {cls.stereotype && <span className="cd-stereotype">&lt;&lt;{cls.stereotype}&gt;&gt;</span>}
                    <span className="cd-class-name">{cls.name}</span>
                  </div>
                  <div className="cd-class-section">
                    {fields.map((f, i) => <div key={i} className="cd-field">{f}</div>)}
                    {fields.length === 0 && <div className="cd-empty">—</div>}
                  </div>
                  <div className="cd-class-section">
                    {methods.map((m, i) => <div key={i} className="cd-method">{m}</div>)}
                    {methods.length === 0 && <div className="cd-empty">—</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <svg className="cd-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <marker id="cd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
              </marker>
            </defs>
            {lineCoords.map(({ rel, x1, y1, x2, y2 }, i) => {
              const highlighted = isRelHighlighted(rel);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={i} style={{ opacity: highlighted ? 1 : 0.15, transition: 'opacity 0.25s ease' }}>
                  <path
                    d={`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`}
                    fill="none"
                    stroke={highlighted ? 'var(--accent)' : 'var(--border-primary)'}
                    strokeWidth={highlighted ? '2' : '1.5'}
                    strokeDasharray={rel.dashed ? '5,4' : 'none'}
                    markerEnd="url(#cd-arrow)"
                  />
                  {rel.label && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x={-rel.label.length * 3.5 - 6}
                        y="-10"
                        width={rel.label.length * 7 + 12}
                        height="18"
                        rx="9"
                        fill="var(--bg-card)"
                        stroke="var(--accent)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {rel.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <style>{cdStyles}</style>
    </div>
  );
}

const cdStyles = `
.class-diagram-section { margin: 32px 0; padding: 20px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; }
.cd-title { font-size: 16px; color: var(--info); font-weight: 700; letter-spacing: 0.5px; }
.cd-class-box { width: 215px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-primary); border-top: 4px solid; background: var(--bg-card); box-shadow: var(--shadow-md); cursor: pointer; }
.cd-class-box.highlighted { box-shadow: 0 0 12px var(--focus-ring, rgba(37,99,235,0.4)); }
.cd-class-header { padding: 8px 10px; color: #ffffff; text-align: center; font-weight: 700; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.cd-stereotype { display: block; font-size: 10px; font-weight: 400; font-style: italic; opacity: 0.9; }
.cd-class-section { padding: 8px 10px; border-top: 1px solid var(--border-primary); font-size: 11px; color: var(--text-primary); }
.cd-field { font-family: var(--code-font); padding: 2px 0; color: var(--code-field); font-size: 11px; font-weight: 600; }
.cd-method { font-family: var(--code-font); padding: 2px 0; color: var(--code-method); font-size: 11px; font-weight: 600; }
.cd-empty { color: var(--text-muted); font-style: italic; font-size: 10px; text-align: center; }
`;
