import { getModuleSourceLinks } from '../data/moduleSourceLinks';

const linkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: 'var(--radius-full, 999px)',
  border: '1px solid var(--border-primary)',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-xs, 11px)',
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

/**
 * Two small "view source on GitHub" links (backend / frontend) for the given module, resolved
 * via `data/moduleSourceLinks.js`. Renders nothing if the module key isn't in that table, rather
 * than guessing a path that might 404.
 */
export default function GithubSourceLinks({ module, style }) {
  const links = getModuleSourceLinks(module);
  if (!links) return null;

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', ...style }}>
      <a href={links.backendUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} title="View backend source on GitHub">
        ⚙️ Backend
      </a>
      <a href={links.frontendUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} title="View frontend source on GitHub">
        🎨 Frontend
      </a>
    </div>
  );
}
