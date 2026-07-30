import designDetails from '../data/designDetails';

const sectionStyle = {
  background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 16, marginBottom: 16,
};

const sectionTitle = {
  fontSize: 15, fontWeight: 700, color: 'var(--info)', marginBottom: 12,
  paddingBottom: 6, borderBottom: '1px solid var(--border-primary)',
};

const bulletList = {
  listStyle: 'none', padding: 0, margin: 0,
};

const bulletItem = {
  padding: '6px 0', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5,
};

const bulletDot = {
  color: 'var(--accent)', marginRight: 8, fontWeight: 'bold',
};

const entityCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 14, marginBottom: 12,
};

const entityName = {
  fontSize: 14, fontWeight: 700, color: 'var(--code-field)', marginBottom: 4,
};

const entityDesc = {
  fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5,
};

const table = {
  width: '100%', borderCollapse: 'collapse', fontSize: 12, color: 'var(--text-primary)',
};

const th = {
  textAlign: 'left', padding: '8px 10px', background: 'var(--bg-tertiary)', fontWeight: 700, color: 'var(--text-primary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px',
};

const td = {
  padding: '8px 10px', borderBottom: '1px solid var(--border-secondary)', verticalAlign: 'top', color: 'var(--text-primary)',
};

const tagGreen = {
  display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
  background: 'var(--success-bg)', color: 'var(--success)', marginRight: 8,
};

const tagRed = {
  display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
  background: 'var(--danger-bg)', color: 'var(--danger)', marginRight: 8,
};

const principleCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 14, marginBottom: 10,
};

const principleName = {
  fontSize: 13, fontWeight: 700, color: 'var(--code-method)', marginBottom: 4,
};

const principleDesc = {
  fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
};

const extensibilityCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 14, marginBottom: 10,
};

const extensibilityArea = {
  fontSize: 13, fontWeight: 700, color: 'var(--danger)', marginBottom: 4,
};

const extensibilityDesc = {
  fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 4,
};

const difficultyTag = {
  display: 'inline-block', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, marginRight: 8,
};

const oopCard = {
  background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, padding: 14, marginBottom: 10,
};

const oopName = {
  fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4,
};

const oopDesc = {
  fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 4,
};

const altLabel = {
  fontSize: 11, color: 'var(--warning)', fontWeight: 700, marginTop: 6, marginBottom: 2,
};

export default function DesignDetails({ module }) {
  const data = designDetails[module];
  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24, fontSize: 14 }}>Design details not available for this module yet.</div>;

  const diffColor = (d) => {
    if (d === 'Easy') return { background: 'var(--success-bg)', color: 'var(--success)' };
    if (d === 'Medium') return { background: 'var(--warning-bg)', color: 'var(--warning)' };
    return { background: 'var(--danger-bg)', color: 'var(--danger)' };
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, color: 'var(--info)', textAlign: 'center', marginBottom: 20, fontWeight: 700 }}>{data.title}</h3>

      {/* Requirements */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>📋 Requirements</div>
        <ul style={bulletList}>
          {data.requirements.map((r, i) => <li key={i} style={bulletItem}><span style={bulletDot}>▸</span>{r}</li>)}
        </ul>
      </div>

      {/* Entities */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>🏗️ Entities & Properties</div>
        {data.entities.map((e) => (
          <div key={e.name} style={entityCard}>
            <div style={entityName}>{e.name}</div>
            <div style={entityDesc}>{e.description}</div>
            {e.fields.length > 0 && (
              <table style={table}>
                <thead><tr><th style={th}>Field</th><th style={th}>Type</th><th style={th}>Description</th></tr></thead>
                <tbody>
                  {e.fields.map((f, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontFamily: 'var(--code-font)', color: 'var(--code-field)', fontWeight: 600 }}>{f.name}</td>
                      <td style={{ ...td, color: 'var(--code-method)', fontWeight: 600 }}>{f.type}</td>
                      <td style={td}>{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {e.methods.length > 0 && (
              <table style={{ ...table, marginTop: 8 }}>
                <thead><tr><th style={th}>Method</th><th style={th}>Returns</th><th style={th}>Description</th></tr></thead>
                <tbody>
                  {e.methods.map((m, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontFamily: 'var(--code-font)', color: 'var(--code-method)', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ ...td, color: 'var(--code-field)', fontWeight: 600 }}>{m.returns}</td>
                      <td style={td}>{m.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* Design Patterns */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>🧩 Design Patterns</div>
        {data.designPatterns.map((p) => (
          <div key={p.name} style={principleCard}>
            <div style={{ marginBottom: 4 }}>
              <span style={p.used ? tagGreen : tagRed}>{p.used ? '✓ Used' : '— Not Used'}</span>
              <span style={principleName}>{p.name}</span>
            </div>
            <div style={principleDesc}>{p.explanation}</div>
          </div>
        ))}
      </div>

      {/* SOLID & Coding Principles */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>⚙️ Coding Principles Applied</div>
        {data.principles.map((p) => (
          <div key={p.name} style={principleCard}>
            <div style={principleName}>{p.name}</div>
            <div style={principleDesc}>{p.description}</div>
          </div>
        ))}
      </div>

      {/* OOP Concepts */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>🔄 OOP Concepts & Alternatives</div>
        {data.oopConcepts.map((o) => (
          <div key={o.name} style={oopCard}>
            <div style={oopName}>{o.name}</div>
            <div style={oopDesc}>{o.description}</div>
            <div style={altLabel}>Alternative considered:</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{o.alternative}</div>
          </div>
        ))}
      </div>

      {/* Extensibility */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>🔧 Extensibility Roadmap</div>
        {data.extensibility.map((x) => (
          <div key={x.area} style={extensibilityCard}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ ...difficultyTag, ...diffColor(x.difficulty) }}>{x.difficulty}</span>
              <span style={extensibilityArea}>{x.area}</span>
            </div>
            <div style={extensibilityDesc}>{x.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
