import classDiagrams from '../data/classDiagrams';

const COLORS = ['#2563eb', '#dc2626', '#0284c7', '#16a34a', '#7c3aed', '#db2777', '#059669', '#d97706', '#4f46e5', '#9333ea'];

export default function ClassDiagram({ module, customData }) {
  const data = customData || classDiagrams[module];
  if (!data) return null;

  const { title, classes, relationships } = data;
  const classColors = {};
  classes.forEach((c, i) => { classColors[c.name] = COLORS[i % COLORS.length]; });

  return (
    <div className="class-diagram-section">
      <h3 className="cd-title">{title}</h3>
      <div className="cd-container" style={{ position: 'relative', minHeight: 400 }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          {classes.map((cls) => (
            <div key={cls.name} className="cd-class-box" style={{ borderTopColor: classColors[cls.name] }}>
              <div className="cd-class-header" style={{ background: classColors[cls.name] }}>
                {cls.stereotype && <span className="cd-stereotype">&lt;&lt;{cls.stereotype}&gt;&gt;</span>}
                <span className="cd-class-name">{cls.name}</span>
              </div>
              <div className="cd-class-section">
                {cls.fields.map((f, i) => <div key={i} className="cd-field">{f}</div>)}
                {cls.fields.length === 0 && <div className="cd-empty">—</div>}
              </div>
              <div className="cd-class-section">
                {cls.methods.map((m, i) => <div key={i} className="cd-method">{m}</div>)}
                {cls.methods.length === 0 && <div className="cd-empty">—</div>}
              </div>
            </div>
          ))}
        </div>
        <svg className="cd-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          {relationships.map((rel, i) => {
            const fromEl = document.querySelector(`[data-class="${rel.from}"]`);
            const toEl = document.querySelector(`[data-class="${rel.to}"]`);
            if (!fromEl || !toEl) return null;
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const container = document.querySelector('.cd-container');
            if (!container) return null;
            const cRect = container.getBoundingClientRect();
            const x1 = fromRect.left + fromRect.width / 2 - cRect.left;
            const y1 = fromRect.bottom - cRect.top;
            const x2 = toRect.left + toRect.width / 2 - cRect.left;
            const y2 = toRect.top - cRect.top;
            const midY = (y1 + y2) / 2;
            return (
              <g key={i}>
                <path d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
                      fill="none" stroke="var(--accent)" strokeWidth="1.5"
                      strokeDasharray={rel.dashed ? '5,4' : 'none'} opacity="0.7" />
                {rel.label && (
                  <text x={(x1 + x2) / 2} y={midY - 4} textAnchor="middle" fill="var(--accent)" fontSize="10" fontWeight="600">
                    {rel.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <style>{cdStyles}</style>
    </div>
  );
}

const cdStyles = `
.class-diagram-section { margin: 32px 0; padding: 20px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); overflow: hidden; }
.cd-title { font-size: 16px; color: var(--info); margin-bottom: 20px; text-align: center; font-weight: 700; letter-spacing: 0.5px; }
.cd-class-box { width: 210px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-primary); border-top: 4px solid; background: var(--bg-card); box-shadow: var(--shadow-md); transition: transform 0.2s; }
.cd-class-box:hover { transform: translateY(-2px); }
.cd-class-header { padding: 8px 10px; color: #ffffff; text-align: center; font-weight: 700; font-size: 13px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.cd-stereotype { display: block; font-size: 10px; font-weight: 400; font-style: italic; opacity: 0.9; }
.cd-class-section { padding: 8px 10px; border-top: 1px solid var(--border-primary); font-size: 11px; color: var(--text-primary); }
.cd-field { font-family: var(--code-font); padding: 2px 0; color: var(--code-field); font-size: 11px; font-weight: 600; }
.cd-method { font-family: var(--code-font); padding: 2px 0; color: var(--code-method); font-size: 11px; font-weight: 600; }
.cd-empty { color: var(--text-muted); font-style: italic; font-size: 10px; text-align: center; }
`;
