import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [hoveredClass, setHoveredClass] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' or 'list'
  const [lineCoords, setLineCoords] = useState([]);

  const classes = data?.classes || [];
  const relationships = data?.relationships || [];

  const updateLineCoords = useCallback(() => {
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

      if (Math.abs(dx) > Math.abs(dy) * 1.1) {
        // Horizontal connection (same row or adjacent columns)
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
  }, [relationships]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLineCoords();
    }, 120);

    const observer = new ResizeObserver(() => {
      updateLineCoords();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateLineCoords);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', updateLineCoords);
    };
  }, [module, viewMode, updateLineCoords]);

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

  const activeTarget = selectedClass || hoveredClass;

  const isClassHighlighted = (className) => {
    if (!activeTarget) return true;
    if (activeTarget === className) return true;
    return relationships.some(r => (r.from === activeTarget && r.to === className) || (r.to === activeTarget && r.from === className));
  };

  const isRelHighlighted = (rel) => {
    if (!activeTarget) return true;
    return rel.from === activeTarget || rel.to === activeTarget;
  };

  const handleClassClick = (className) => {
    if (selectedClass === className) {
      setSelectedClass(null);
    } else {
      setSelectedClass(className);
    }
  };

  return (
    <div className="class-diagram-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="cd-title" style={{ margin: 0 }}>{title}</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span><strong style={{ color: 'var(--accent)' }}>───▶</strong> Association</span>
            <span><strong style={{ color: 'var(--accent)' }}>- - ▶</strong> Extends / Implements</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedClass && (
            <button
              onClick={() => setSelectedClass(null)}
              style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--accent)', background: 'var(--bg-tertiary)', color: 'var(--accent)'
              }}
            >
              Selected: <strong>{selectedClass}</strong> ✖ Clear
            </button>
          )}
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

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>
        💡 <em>Hover or click any class box to isolate its specific connections. Labels render on top of lines for 100% clarity.</em>
      </p>

      {viewMode === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginTop: 16 }}>
          {relationships.map((rel, idx) => (
            <div key={idx} style={{
              padding: 14, borderRadius: 8, border: '1px solid var(--border-primary)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: classColors[rel.from] || 'var(--accent)' }}>{rel.from}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}>
                  {rel.dashed ? 'extends / implements' : 'associates'}
                </span>
                <span style={{ color: classColors[rel.to] || 'var(--accent)' }}>{rel.to}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                Relationship: "{rel.label || 'uses'}"
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={containerRef} className="cd-container" style={{ position: 'relative', minHeight: 520, padding: '24px 30px' }}>
          {/* SVG Overlay placed at zIndex: 10 so relationship line badges ALWAYS sit ON TOP of class cards */}
          <svg className="cd-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
            <defs>
              <marker id="cd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
              </marker>
              <filter id="cd-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.25)" />
              </filter>
            </defs>

            {lineCoords.map(({ rel, x1, y1, x2, y2 }, i) => {
              const highlighted = isRelHighlighted(rel);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const labelText = rel.label || 'uses';
              const labelWidth = Math.max(labelText.length * 7 + 16, 50);

              return (
                <g key={i} style={{ opacity: highlighted ? 1 : 0.08, transition: 'opacity 0.2s ease' }}>
                  <path
                    d={`M${x1},${y1} Q${midX},${midY} ${x2},${y2}`}
                    fill="none"
                    stroke={highlighted ? (activeTarget ? 'var(--accent)' : 'var(--border-primary)') : 'var(--border-primary)'}
                    strokeWidth={highlighted ? (activeTarget ? '3' : '1.8') : '1.2'}
                    strokeDasharray={rel.dashed ? '6,4' : 'none'}
                    markerEnd="url(#cd-arrow)"
                  />
                  {labelText && (
                    <g transform={`translate(${midX}, ${midY})`} filter="url(#cd-glow)">
                      <rect
                        x={-labelWidth / 2}
                        y="-11"
                        width={labelWidth}
                        height="22"
                        rx="11"
                        fill="var(--bg-card)"
                        stroke={highlighted && activeTarget ? 'var(--accent)' : 'var(--border-primary)'}
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        fontSize="11"
                        fontWeight="800"
                      >
                        {labelText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Class Cards Grid placed at zIndex: 2 */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: '40px 50px', justifyContent: 'center', padding: '20px 0' }}>
            {classes.map((cls) => {
              const fields = Array.isArray(cls.fields) ? cls.fields : [];
              const methods = Array.isArray(cls.methods) ? cls.methods : [];
              const highlighted = isClassHighlighted(cls.name);
              const isSelected = selectedClass === cls.name;
              const isHovered = hoveredClass === cls.name;

              return (
                <div
                  key={cls.name}
                  data-class={cls.name}
                  className={`cd-class-box ${highlighted ? 'highlighted' : 'dimmed'}`}
                  style={{
                    borderTopColor: classColors[cls.name],
                    opacity: highlighted ? 1 : 0.18,
                    transform: (isSelected || isHovered) ? 'scale(1.04)' : 'none',
                    boxShadow: (isSelected || isHovered)
                      ? `0 0 18px ${classColors[cls.name] || 'var(--accent)'}`
                      : 'var(--shadow-md)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={() => setHoveredClass(cls.name)}
                  onMouseLeave={() => setHoveredClass(null)}
                  onClick={() => handleClassClick(cls.name)}
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
        </div>
      )}

      <style>{cdStyles}</style>
    </div>
  );
}

const cdStyles = `
.class-diagram-section { margin: 32px 0; padding: 24px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; }
.cd-title { font-size: 17px; color: var(--info); font-weight: 800; letter-spacing: 0.5px; }
.cd-class-box { width: 235px; margin: 10px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-primary); border-top: 5px solid; background: var(--bg-card); box-shadow: var(--shadow-md); cursor: pointer; user-select: none; }
.cd-class-box.highlighted { box-shadow: 0 0 14px var(--focus-ring, rgba(37,99,235,0.4)); }
.cd-class-header { padding: 10px 12px; color: #ffffff; text-align: center; font-weight: 800; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.cd-stereotype { display: block; font-size: 10px; font-weight: 400; font-style: italic; opacity: 0.95; letter-spacing: 0.5px; }
.cd-class-section { padding: 10px 12px; border-top: 1px solid var(--border-primary); font-size: 11px; color: var(--text-primary); }
.cd-field { font-family: var(--code-font); padding: 3px 0; color: var(--code-field); font-size: 11px; font-weight: 600; }
.cd-method { font-family: var(--code-font); padding: 3px 0; color: var(--code-method); font-size: 11px; font-weight: 600; }
.cd-empty { color: var(--text-muted); font-style: italic; font-size: 10px; text-align: center; }
`;
