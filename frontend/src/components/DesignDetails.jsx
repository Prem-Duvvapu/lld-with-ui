import React, { useRef, useState } from 'react';
import designDetails from '../data/designDetails';
import { useModuleData } from '../hooks/useModuleData';
import ModuleDataState from './ModuleDataState';
import { useReveal } from '../hooks/useReveal';
import RequirementsTab from './design/RequirementsTab';
import EntitiesTab from './design/EntitiesTab';
import PatternsTab from './design/PatternsTab';
import PrinciplesTab from './design/PrinciplesTab';
import ExtensibilityTab from './design/ExtensibilityTab';
import RevealGate from './RevealGate';
import AttemptComparison from './AttemptComparison';

export default function DesignDetails({ module, customData }) {
  const { status, data } = useModuleData(designDetails, module, customData, 'designDetails');
  const { isRevealed, reveal, hide } = useReveal();
  const revealed = isRevealed(module);

  const [subTab, setSubTab] = useState('reqs');
  const activeSection = useRef(null);

  if (status !== 'ready') {
    return <ModuleDataState status={status} label="Design details" />;
  }

  const subTabs = [
    { id: 'reqs', label: '📋 Requirements', count: data.requirements?.length },
    { id: 'entities', label: '🏗️ Entities', count: data.entities?.length },
    { id: 'patterns', label: '🧩 Design Patterns', count: data.designPatterns?.length },
    { id: 'principles', label: '⚙️ SOLID & OOP', count: (data.principles?.length || 0) + (data.oopConcepts?.length || 0) },
    { id: 'extensibility', label: '🔧 Extensibility', count: data.extensibility?.length },
  ];

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: 'var(--font-xl)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        marginBottom: 'var(--space-4)',
        fontWeight: 800
      }}>
        {data.title}
      </h3>

      {/* Sub-tab Navigation */}
      <nav aria-label="Design detail sections" data-tour="design-subtabs" style={{
        display: 'flex',
        gap: 'var(--space-2)',
        justifyContent: 'center',
        marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-primary)',
        paddingBottom: 'var(--space-3)'
      }}>
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={subTab === t.id}
            ref={subTab === t.id ? activeSection : undefined}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '6px 14px',
              minHeight: 44,
              borderRadius: 'var(--radius-md)',
              border: subTab === t.id ? '1px solid var(--accent)' : '1px solid var(--border-primary)',
              background: subTab === t.id ? 'var(--accent-solid)' : 'var(--bg-tertiary)',
              color: subTab === t.id ? 'var(--on-accent-solid)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--font-sm)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <span>{t.id !== 'reqs' && !revealed ? '🔒 ' : ''}{t.label}</span>
            {t.count !== undefined && (
              <span style={{
                fontSize: 'var(--font-xs)',
                background: subTab === t.id ? 'var(--accent-solid)' : 'var(--bg-primary)',
                border: '1px solid currentColor',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)'
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Sub-tab Content */}
      <div>
        {subTab === 'reqs' && (
          <RequirementsTab requirements={data.requirements} tldr={data.tldr} />
        )}
        {subTab !== 'reqs' && !revealed && (
          <RevealGate onReveal={() => { reveal(module); activeSection.current?.focus(); }} label="the design" module={module} />
        )}
        {subTab !== 'reqs' && revealed && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => { hide(module); activeSection.current?.focus(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--font-sm)', minHeight: 44, padding: '6px 12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                🔒 Hide again
              </button>
            </div>
            <AttemptComparison module={module} />
            {subTab === 'entities' && <EntitiesTab entities={data.entities} />}
            {subTab === 'patterns' && <PatternsTab designPatterns={data.designPatterns} />}
            {subTab === 'principles' && <PrinciplesTab principles={data.principles} oopConcepts={data.oopConcepts} />}
            {subTab === 'extensibility' && <ExtensibilityTab extensibility={data.extensibility} tradeoffs={data.tradeoffs} />}
          </>
        )}
      </div>
    </div>
  );
}
