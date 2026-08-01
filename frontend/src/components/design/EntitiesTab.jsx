import React, { useState } from 'react';
import Badge from '../ui/Badge';
import { Table } from '../ui/Table';

export default function EntitiesTab({ entities = [] }) {
  const [expanded, setExpanded] = useState({});

  const toggleEntity = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
          {entities.length} Key Entities Defined
        </span>
        <button
          onClick={() => {
            const allExpanded = entities.every((e) => expanded[e.name]);
            const newMap = {};
            entities.forEach((e) => { newMap[e.name] = !allExpanded; });
            setExpanded(newMap);
          }}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--font-sm)', fontWeight: 600 }}
        >
          {entities.every((e) => expanded[e.name]) ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {entities.map((entity) => {
        const isExpanded = expanded[entity.name];

        return (
          <div
            key={entity.name}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              transition: 'border-color var(--duration-fast)'
            }}
          >
            <div
              onClick={() => toggleEntity(entity.name)}
              style={{
                padding: 'var(--space-4) var(--space-5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isExpanded ? 'var(--bg-tertiary)' : 'transparent',
                borderBottom: isExpanded ? '1px solid var(--border-secondary)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontFamily: 'var(--code-font)', fontSize: 'var(--font-base)', fontWeight: 700, color: 'var(--accent)' }}>
                    {entity.name}
                  </span>
                  {entity.fields && <Badge variant="neutral" size="sm">{entity.fields.length} Fields</Badge>}
                  {entity.methods && <Badge variant="neutral" size="sm">{entity.methods.length} Methods</Badge>}
                </div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                  {entity.description}
                </p>
              </div>
              <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: 'var(--space-5)' }}>
                {entity.fields && entity.fields.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h5 style={{ fontSize: 'var(--font-xs)', uppercase: true, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Fields & Properties
                    </h5>
                    <Table
                      headers={['Field', 'Type', 'Description']}
                      data={entity.fields}
                      renderRow={(f, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--code-font)', color: 'var(--code-field)', fontWeight: 600 }}>{f.name}</td>
                          <td style={{ fontFamily: 'var(--code-font)', color: 'var(--code-method)', fontWeight: 600 }}>{f.type}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{f.description}</td>
                        </tr>
                      )}
                    />
                  </div>
                )}

                {entity.methods && entity.methods.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: 'var(--font-xs)', uppercase: true, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Methods & Behavior
                    </h5>
                    <Table
                      headers={['Method', 'Returns', 'Description']}
                      data={entity.methods}
                      renderRow={(m, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'var(--code-font)', color: 'var(--code-method)', fontWeight: 600 }}>{m.name}</td>
                          <td style={{ fontFamily: 'var(--code-font)', color: 'var(--code-field)', fontWeight: 600 }}>{m.returns}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{m.description}</td>
                        </tr>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
