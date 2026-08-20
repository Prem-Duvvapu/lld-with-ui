import React, { useState } from 'react';
import designDetails from '../data/designDetails';
import { resolveModuleData } from '../data/moduleKeys';
import RequirementsTab from './design/RequirementsTab';
import EntitiesTab from './design/EntitiesTab';
import PatternsTab from './design/PatternsTab';
import PrinciplesTab from './design/PrinciplesTab';
import ExtensibilityTab from './design/ExtensibilityTab';

export default function DesignDetails({ module, customData }) {
  const data = customData || resolveModuleData(designDetails, module);

  if (import.meta.env?.DEV && !data && module) {
    console.warn(`[designDetails] no entry for module "${module}" — add src/data/design/<module>.js and register it in the barrel.`);
  }

  const [subTab, setSubTab] = useState('reqs');

  if (!data) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, fontSize: 14 }}>
        Design details not available for this module yet.
      </div>
    );
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
      <nav style={{
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
            onClick={() => setSubTab(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: subTab === t.id ? '1px solid var(--accent)' : '1px solid var(--border-primary)',
              background: subTab === t.id ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: subTab === t.id ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--font-sm)',
              fontWeight: 600,
              transition: 'all var(--duration-fast) var(--ease-out)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)'
            }}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span style={{
                fontSize: 'var(--font-xs)',
                opacity: 0.8,
                background: subTab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)',
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
        {subTab === 'entities' && (
          <EntitiesTab entities={data.entities} />
        )}
        {subTab === 'patterns' && (
          <PatternsTab designPatterns={data.designPatterns} />
        )}
        {subTab === 'principles' && (
          <PrinciplesTab principles={data.principles} oopConcepts={data.oopConcepts} />
        )}
        {subTab === 'extensibility' && (
          <ExtensibilityTab extensibility={data.extensibility} tradeoffs={data.tradeoffs} />
        )}
      </div>
    </div>
  );
}
