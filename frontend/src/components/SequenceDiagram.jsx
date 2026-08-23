import React, { useState } from 'react';
import sequenceDiagrams from '../data/sequenceDiagrams';
import { resolveModuleData } from '../data/moduleKeys';

const COL_WIDTH = 190;
const ROW_HEIGHT = 54;
const HEADER_HEIGHT = 74;
const TOP_PAD = 30;
const BOTTOM_PAD = 40;
const ACTIVATION_WIDTH = 12;

export default function SequenceDiagram({ module, customData }) {
  const data = customData || resolveModuleData(sequenceDiagrams, module);

  if (import.meta.env?.DEV && !data && module) {
    console.warn(`[sequenceDiagrams] no entry for module "${module}" — add src/data/sequences/<module>.js and register it in the barrel.`);
  }

  const flows = data?.flows || [];
  const [flowIdx, setFlowIdx] = useState(0);
  const [hoveredStep, setHoveredStep] = useState(null);

  if (!data || flows.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>
        Sequence diagram not available for this module yet.
      </div>
    );
  }

  const flow = flows[flowIdx];
  const participants = flow.participants || [];
  const steps = flow.steps || [];

  const colX = (id) => {
    const i = participants.findIndex((p) => p.id === id);
    return i < 0 ? 0 : i * COL_WIDTH + COL_WIDTH / 2;
  };

  const width = Math.max(participants.length * COL_WIDTH, 420);
  const height = HEADER_HEIGHT + TOP_PAD + steps.length * ROW_HEIGHT + BOTTOM_PAD;

  // Activation bars: for each participant, find [start, end] row ranges between an
  // 'activate' step naming it and the matching 'deactivate' (or the end of the flow).
  const activationsByParticipant = {};
  participants.forEach((p) => { activationsByParticipant[p.id] = []; });
  const openActivations = {};
  steps.forEach((step, i) => {
    if (step.activate) {
      openActivations[step.activate] = i;
    }
    if (step.deactivate && openActivations[step.deactivate] !== undefined) {
      activationsByParticipant[step.deactivate]?.push([openActivations[step.deactivate], i]);
      delete openActivations[step.deactivate];
    }
  });
  Object.entries(openActivations).forEach(([id, startIdx]) => {
    activationsByParticipant[id]?.push([startIdx, steps.length - 1]);
  });

  const rowY = (i) => HEADER_HEIGHT + TOP_PAD + i * ROW_HEIGHT;

  return (
    <div className="seq-diagram-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="seq-title" style={{ margin: 0 }}>{data.title || `${module} Sequence Diagram`}</h3>
          {data.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', maxWidth: '70ch' }}>{data.description}</p>
          )}
        </div>
        {flows.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {flows.map((f, i) => (
              <button
                key={f.id || i}
                onClick={() => { setFlowIdx(i); setHoveredStep(null); }}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: flowIdx === i ? '1px solid var(--accent)' : '1px solid var(--border-primary)',
                  background: flowIdx === i ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: flowIdx === i ? '#fff' : 'var(--text-primary)'
                }}
              >
                {f.label || f.id || `Flow ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {flow.description && (
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 16px' }}>{flow.description}</p>
      )}

      <div className="seq-scroller" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <svg width={width} height={height} style={{ display: 'block' }}>
          <defs>
            <marker id="seq-arrow-solid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
            <marker id="seq-arrow-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="var(--text-secondary)" strokeWidth="1.6" />
            </marker>
          </defs>

          {/* Participant headers + lifelines */}
          {participants.map((p) => {
            const x = colX(p.id);
            return (
              <g key={p.id}>
                <line
                  x1={x} y1={HEADER_HEIGHT} x2={x} y2={height - BOTTOM_PAD + 12}
                  stroke="var(--border-primary)" strokeWidth="1.5" strokeDasharray="5,4"
                />
                <foreignObject x={x - COL_WIDTH / 2 + 10} y={8} width={COL_WIDTH - 20} height={HEADER_HEIGHT - 14}>
                  <div className={`seq-participant seq-kind-${p.kind || 'component'}`}>
                    {p.stereotype && <span className="seq-stereotype">«{p.stereotype}»</span>}
                    <span className="seq-participant-name">{p.name}</span>
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Activation bars */}
          {participants.map((p) => {
            const x = colX(p.id);
            return (activationsByParticipant[p.id] || []).map(([startI, endI], k) => (
              <rect
                key={k}
                x={x - ACTIVATION_WIDTH / 2}
                y={rowY(startI) - ROW_HEIGHT / 2 + 2}
                width={ACTIVATION_WIDTH}
                height={rowY(endI) - rowY(startI) + ROW_HEIGHT / 2 + 6}
                rx={2}
                fill="var(--bg-tertiary)"
                stroke="var(--accent)"
                strokeWidth="1.2"
              />
            ));
          })}

          {/* Steps: messages and notes */}
          {steps.map((step, i) => {
            const y = rowY(i);
            const isDimmed = hoveredStep !== null && hoveredStep !== i;

            if (step.type === 'note') {
              const overIds = step.over || [];
              const xs = overIds.map(colX);
              const x1 = Math.min(...xs) - COL_WIDTH / 2 + 16;
              const x2 = Math.max(...xs) + COL_WIDTH / 2 - 16;
              const boxW = Math.max(x2 - x1, 120);
              return (
                <g
                  key={i}
                  style={{ opacity: isDimmed ? 0.3 : 1, cursor: 'default', transition: 'opacity 0.15s ease' }}
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  <rect
                    x={x1} y={y - 16} width={boxW} height={32} rx={5}
                    fill={step.blocked ? 'var(--sev-crit-bg, var(--bg-tertiary))' : 'var(--bg-tertiary)'}
                    stroke={step.blocked ? 'var(--sev-crit, var(--accent))' : 'var(--border-secondary)'}
                    strokeWidth="1.3"
                  />
                  <foreignObject x={x1 + 6} y={y - 14} width={boxW - 12} height={28}>
                    <div className="seq-note-text" style={{ color: step.blocked ? 'var(--sev-crit, var(--text-primary))' : 'var(--text-primary)' }}>
                      {step.text}
                    </div>
                  </foreignObject>
                </g>
              );
            }

            const fromX = colX(step.from);
            const toX = colX(step.to);
            const isReturn = step.type === 'return';
            const isSelf = step.from === step.to;

            return (
              <g
                key={i}
                style={{ opacity: isDimmed ? 0.3 : 1, cursor: 'default', transition: 'opacity 0.15s ease' }}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {isSelf ? (
                  <path
                    d={`M${fromX + ACTIVATION_WIDTH / 2},${y - 10} C ${fromX + 60},${y - 10} ${fromX + 60},${y + 10} ${fromX + ACTIVATION_WIDTH / 2 + 1},${y + 10}`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.8"
                    markerEnd="url(#seq-arrow-solid)"
                  />
                ) : (
                  <line
                    x1={fromX} y1={y} x2={toX} y2={y}
                    stroke={isReturn ? 'var(--text-secondary)' : 'var(--accent)'}
                    strokeWidth={isReturn ? '1.6' : '2'}
                    strokeDasharray={isReturn ? '6,4' : 'none'}
                    markerEnd={isReturn ? 'url(#seq-arrow-open)' : 'url(#seq-arrow-solid)'}
                  />
                )}
                <SeqLabel
                  x={isSelf ? fromX + 66 : (fromX + toX) / 2}
                  y={y - 8}
                  text={step.text}
                  emphasize={isReturn}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {steps[hoveredStep] && (
        <div className="seq-step-detail">
          <strong>Step {hoveredStep + 1}.</strong>{' '}
          {steps[hoveredStep].detail || steps[hoveredStep].text}
        </div>
      )}

      <style>{seqStyles}</style>
    </div>
  );
}

function SeqLabel({ x, y, text, emphasize }) {
  if (!text) return null;
  const w = Math.min(Math.max(text.length * 6.1 + 14, 40), 340);
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-w / 2} y={-11} width={w} height={20} rx={4} fill="var(--bg-card)" opacity="0.94" />
      <text
        x={0} y={4} textAnchor="middle"
        fontSize="11.5"
        fontWeight={emphasize ? 500 : 700}
        fontStyle={emphasize ? 'italic' : 'normal'}
        fill="var(--text-primary)"
      >
        {text.length > 56 ? text.slice(0, 54) + '…' : text}
      </text>
    </g>
  );
}

const seqStyles = `
.seq-diagram-section { margin: 32px 0; padding: 24px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-primary); }
.seq-title { font-size: 17px; color: var(--info); font-weight: 800; letter-spacing: 0.5px; }
.seq-participant { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  border-radius: 8px; border: 1px solid var(--border-primary); background: var(--bg-card); padding: 6px 8px; box-shadow: var(--shadow-md); }
.seq-kind-actor { border-top: 4px solid var(--sev-major, #d97706); }
.seq-kind-component { border-top: 4px solid var(--accent); }
.seq-kind-lock { border-top: 4px solid var(--sev-crit, #dc2626); }
.seq-kind-store { border-top: 4px solid var(--ok, #16a34a); }
.seq-stereotype { font-size: 9.5px; color: var(--text-muted); font-style: italic; }
.seq-participant-name { font-size: 12.5px; font-weight: 700; color: var(--text-primary); line-height: 1.25; }
.seq-note-text { font-size: 11px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; }
.seq-step-detail { margin-top: 14px; padding: 10px 14px; border-radius: 8px; background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary); font-size: 12.5px; color: var(--text-primary); }
.seq-scroller::-webkit-scrollbar { height: 8px; }
`;
